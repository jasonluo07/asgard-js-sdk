import { describe, it, expect } from 'vitest';
import Channel from './channel';
import Conversation from './conversation';
import { EventType } from '../constants/enum';
import type { FetchSseOptions, FetchSsePayload, IAsgardServiceClient, SseResponse } from '../types';

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
