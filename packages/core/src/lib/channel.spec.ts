import { describe, it, expect, vi } from 'vitest';
import { Subscription } from 'rxjs';
import Channel from './channel';
import Conversation from './conversation';
import { EventType } from '../constants/enum';
import type { ChannelStates, FetchSseOptions, FetchSsePayload, IAsgardServiceClient, SseResponse } from '../types';

// F-016 — channel title store. The title lives on the Channel (seeded from config, updated by the live
// `asgard.channel.title.update` event), never derived from the conversation — so a rejoin replay (which
// carries no title event) keeps the seeded value. A minimal mock client replays scripted SSE events.

function mockClient(events: SseResponse<EventType>[]): IAsgardServiceClient {
  return {
    fetchSse(_payload: FetchSsePayload, options?: FetchSseOptions): void {
      options?.onSseStart?.();
      events.forEach(event => options?.onSseMessage?.(event));
      options?.onSseCompleted?.();
    },
  } as unknown as IAsgardServiceClient;
}

function titleEvent(title: string | null): SseResponse<EventType> {
  return {
    eventType: EventType.CHANNEL_TITLE_UPDATE,
    requestId: 'req-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { channelTitleUpdate: { title } },
  } as unknown as SseResponse<EventType>;
}

function messageEvent(messageId: string, text: string): SseResponse<EventType> {
  return {
    eventType: EventType.MESSAGE_COMPLETE,
    requestId: 'req-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { messageComplete: { message: { messageId, text } } },
  } as unknown as SseResponse<EventType>;
}

function makeChannel(events: SseResponse<EventType>[], channelTitle?: string | null): Channel {
  return Channel.create({
    client: mockClient(events),
    customChannelId: 'ch',
    conversation: new Conversation({ messages: new Map() }),
    channelTitle,
  });
}

describe('Channel — channel title store (F-016)', () => {
  it('R4: seeds the title from config (null when unnamed)', () => {
    expect(makeChannel([]).getChannelTitle()).toBeNull();
    expect(makeChannel([], '訂單查詢').getChannelTitle()).toBe('訂單查詢');
  });

  it('R2: consumes asgard.channel.title.update → updates channelTitle$', async () => {
    const channel = makeChannel([titleEvent('庫存分析')]);
    await channel.sendMessage({ text: 'hi' });
    expect(channel.getChannelTitle()).toBe('庫存分析');
    channel.close();
  });

  it('R3: channelTitle$ replays the current snapshot to a late subscriber', () => {
    const channel = makeChannel([], '訂單查詢');
    let latest: string | null | undefined;
    const sub = channel.channelTitle$.subscribe(t => (latest = t));
    expect(latest).toBe('訂單查詢');
    sub.unsubscribe();
    channel.close();
  });

  it('R3: distinctUntilChanged suppresses a same-title update', async () => {
    const channel = makeChannel([titleEvent('X'), titleEvent('X'), titleEvent('Y')]);
    const emissions: (string | null)[] = [];
    const sub = channel.channelTitle$.subscribe(t => emissions.push(t));
    await channel.sendMessage({ text: 'hi' });
    // initial null, then X (the duplicate X suppressed), then Y
    expect(emissions).toEqual([null, 'X', 'Y']);
    sub.unsubscribe();
    channel.close();
  });

  it('R5: replay-safe — a stream with no title event keeps the seeded title', async () => {
    const channel = makeChannel([messageEvent('m1', 'hello'), messageEvent('m2', 'world')], '訂單查詢');
    await channel.sendMessage({ text: 'hi' });
    expect(channel.getChannelTitle()).toBe('訂單查詢');
    channel.close();
  });

  it('R4: setChannelTitle seeds / overrides the title (for the F-015 metadata restore)', () => {
    const channel = makeChannel([]);
    expect(channel.getChannelTitle()).toBeNull();
    channel.setChannelTitle('進房補的標題');
    expect(channel.getChannelTitle()).toBe('進房補的標題');
    channel.close();
  });

  it('channelTitle is exposed on ChannelStates via statesObserver', async () => {
    const seen: (string | null)[] = [];
    const channel = Channel.create({
      client: mockClient([titleEvent('新標題')]),
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: states => seen.push(states.channelTitle),
    });
    await channel.sendMessage({ text: 'hi' });
    expect(seen[seen.length - 1]).toBe('新標題');
    channel.close();
  });
});

// F-015 — join restore. Channel.restore adopts an existing channel via GET rejoinSse (F-014) and never
// sends RESET_CHANNEL, so an existing channel's history / title are preserved on join.

function restoreMockClient(rejoinEvents: SseResponse<EventType>[], fetchSse?: () => void): IAsgardServiceClient {
  return {
    fetchSse(_payload: FetchSsePayload, _options?: FetchSseOptions): void {
      fetchSse?.();
    },
    rejoinSse(_customChannelId: string, options?: FetchSseOptions): void {
      options?.onSseStart?.();
      rejoinEvents.forEach(event => options?.onSseMessage?.(event));
      options?.onSseCompleted?.();
    },
  } as unknown as IAsgardServiceClient;
}

describe('Channel — join restore (F-015)', () => {
  it('R2: seeds the title from metadata, replays history, and never sends RESET_CHANNEL', async () => {
    const fetchSseSpy = vi.fn();
    let states: ChannelStates | undefined;

    const channel = await Channel.restore({
      client: restoreMockClient([messageEvent('h1', '歷史一'), messageEvent('h2', '歷史二')], fetchSseSpy),
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      channelTitle: '庫存分析',
      statesObserver: s => (states = s),
    });

    expect(fetchSseSpy).not.toHaveBeenCalled();
    expect(channel.getChannelTitle()).toBe('庫存分析');
    expect([...(states?.conversation.messages?.values() ?? [])].map(m => m.messageId)).toEqual(['h1', 'h2']);
    channel.close();
  });

  it('R5: holds isConnecting during replay, then releases it on the run terminal', async () => {
    let captured: FetchSseOptions | undefined;
    const client = {
      fetchSse: vi.fn(),
      rejoinSse(_id: string, options?: FetchSseOptions): void {
        captured = options;
        options?.onSseStart?.();
      },
    } as unknown as IAsgardServiceClient;

    const connecting: boolean[] = [];
    const restorePromise = Channel.restore({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: s => connecting.push(s.isConnecting),
    });

    await Promise.resolve();
    // Input is gated while the restore connection is open (no terminal yet).
    expect(connecting[connecting.length - 1]).toBe(true);

    captured?.onSseCompleted?.();
    await restorePromise;
    // Released once the terminal arrives (an IDLE channel's synthesized terminal does the same instantly).
    expect(connecting[connecting.length - 1]).toBe(false);
  });

  it('settles immediately (input released) when the client has no rejoinSse — nothing to restore', async () => {
    const channel = await Channel.restore({
      client: { fetchSse: vi.fn() } as unknown as IAsgardServiceClient,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      channelTitle: '未命名前的標題',
    });

    expect(channel.getChannelTitle()).toBe('未命名前的標題');
    channel.close();
  });
});

// UC-017 / EXT-2 — user-initiated stop-generation. The run is held as a Subscription; stopGeneration
// unsubscribes it (→ create-sse-observable teardown → AbortController.abort()) and releases the input,
// while the partial reply already received stays in the conversation (frozen, not deleted).

describe('Channel — stop generation (UC-017 / EXT-2)', () => {
  it('aborts the in-flight run, releases isConnecting, and keeps the partial reply', async () => {
    const run = new Subscription();
    const unsubscribe = vi.spyOn(run, 'unsubscribe');
    let captured: FetchSseOptions | undefined;

    const states: ChannelStates[] = [];
    const client = {
      // Start the run but never emit a terminal → it stays in-flight until stopped.
      fetchSse(_payload: FetchSsePayload, options?: FetchSseOptions): Subscription {
        captured = options;
        options?.onSseStart?.();

        return run;
      },
    } as unknown as IAsgardServiceClient;

    const channel = Channel.create({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: (s: ChannelStates) => states.push(s),
    });

    channel.sendMessage({ text: 'hi' });
    // A partial assistant message arrives before the user stops.
    captured?.onSseMessage?.(messageEvent('a1', '部分回覆'));
    await Promise.resolve();

    expect(states[states.length - 1].isConnecting).toBe(true);

    channel.stopGeneration();
    await Promise.resolve();

    expect(unsubscribe).toHaveBeenCalledTimes(1); // run aborted
    const last = states[states.length - 1];
    expect(last.isConnecting).toBe(false); // input released
    expect(last.conversation.messages.has('a1')).toBe(true); // partial reply kept

    channel.close();
  });

  it('is a no-op when nothing is running', () => {
    const channel = makeChannel([]);

    expect(() => channel.stopGeneration()).not.toThrow();
    channel.close();
  });
});
