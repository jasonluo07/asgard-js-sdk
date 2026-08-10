import { describe, it, expect, vi } from 'vitest';
import { Subscription } from 'rxjs';
import Channel from './channel';
import Conversation from './conversation';
import { EventType, FetchSseAction } from '../constants/enum';
import { ChannelAwaitingConsentError } from '../types/channel-awaiting-consent-error';
import type {
  ChannelMetadata,
  ChannelStates,
  FetchSseOptions,
  FetchSsePayload,
  IAsgardServiceClient,
  LaunchedSandbox,
  SseResponse,
} from '../types';

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

function sandboxEvent(kind: 'launch' | 'ready'): SseResponse<EventType> {
  const eventType = kind === 'launch' ? EventType.SANDBOX_LAUNCH : EventType.SANDBOX_READY;
  const factKey = kind === 'launch' ? 'sandboxLaunch' : 'sandboxReady';

  return {
    eventType,
    requestId: 'req-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { [factKey]: { sandboxName: 'sbx-1', blueprintName: 'bp-1' } },
  } as unknown as SseResponse<EventType>;
}

function runEvent(kind: EventType.INIT | EventType.ERROR): SseResponse<EventType> {
  return {
    eventType: kind,
    requestId: 'req-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: kind === EventType.ERROR ? { runError: { error: { code: 'E', message: 'boom' } } } : {},
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

// F-018 — sandbox cold-start phase store. Phase is derived from the last sandbox event on the run
// stream (launch → launching, ready → ready), reset to idle on run init / error, and never derived
// from the conversation — so it folds identically live and on rejoin replay (replay-safe, UC-031).

describe('Channel — sandbox phase store (F-018)', () => {
  it('R1: defaults to idle with no sandbox event', () => {
    const channel = makeChannel([]);
    expect(channel.getSandboxPhase()).toBe('idle');
    channel.close();
  });

  it('R1: launch → launching, ready → ready (last event wins)', async () => {
    const channel = makeChannel([sandboxEvent('launch')]);
    await channel.sendMessage({ text: 'hi' });
    expect(channel.getSandboxPhase()).toBe('launching');
    channel.close();

    const channel2 = makeChannel([sandboxEvent('launch'), sandboxEvent('ready')]);
    await channel2.sendMessage({ text: 'hi' });
    expect(channel2.getSandboxPhase()).toBe('ready');
    channel2.close();
  });

  it('R1: resets to idle on run init and error', async () => {
    const onInit = makeChannel([sandboxEvent('launch'), runEvent(EventType.INIT)]);
    await onInit.sendMessage({ text: 'hi' });
    expect(onInit.getSandboxPhase()).toBe('idle');
    onInit.close();

    const onError = makeChannel([sandboxEvent('launch'), runEvent(EventType.ERROR)]);
    await onError.sendMessage({ text: 'hi' });
    expect(onError.getSandboxPhase()).toBe('idle');
    onError.close();
  });

  it('R1: sandboxPhase$ is per-slice — a message delta does not re-emit the phase', async () => {
    const channel = makeChannel([sandboxEvent('launch'), messageEvent('m1', 'hello'), messageEvent('m2', 'world')]);
    const emissions: string[] = [];
    const sub = channel.sandboxPhase$.subscribe(p => emissions.push(p));
    await channel.sendMessage({ text: 'hi' });
    // initial idle, then launching once — message deltas do not re-notify (distinctUntilChanged).
    expect(emissions).toEqual(['idle', 'launching']);
    sub.unsubscribe();
    channel.close();
  });

  it('R1: sandboxPhase is exposed on ChannelStates via statesObserver', async () => {
    const seen: string[] = [];
    const channel = Channel.create({
      client: mockClient([sandboxEvent('launch'), sandboxEvent('ready')]),
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: states => seen.push(states.sandboxPhase),
    });
    await channel.sendMessage({ text: 'hi' });
    expect(seen[seen.length - 1]).toBe('ready');
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

function consentEvent(processId: string, traceId?: string): SseResponse<EventType> {
  return {
    eventType: EventType.TOOL_CALL_CONSENT,
    requestId: 'req-1',
    traceId,
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: {
      toolCallConsent: {
        processId,
        pendingCalls: [
          {
            toolCallId: 'call-1',
            toolsetName: 'shell',
            toolName: 'run',
            parameter: { command: 'rm -rf /tmp/x' },
            alreadyAllowed: false,
            reason: '高風險操作',
          },
        ],
      },
    },
  } as unknown as SseResponse<EventType>;
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

  // asgard-freyr-pm#359 Q1 — recovering a still-undecided tool_call.consent after a reload. The live
  // consent frame is ephemeral (asgard-core never persists it: delivery.persistableDisplayEvent covers
  // only message/thinking/tool_call `.complete`), so it is NOT part of the collapsed transcript replay.
  // Instead SubscribeChannelSse detects the pause (ListenType=PAUSE + resume_state.PauseType=
  // TOOL_CALL_CONSENT) and appends a *synthetic* run.init → tool_call.consent → run.done rebuilt from
  // the durable resume_state. This mirrors that exact frame order — note the terminal arrives after the
  // prompt, so the prompt has to survive it.
  it('recovers a pending consent from the synthetic rejoin bracket (run.init → consent → run.done)', async () => {
    let states: ChannelStates | undefined;

    const channel = await Channel.restore({
      client: restoreMockClient([
        messageEvent('h1', '歷史一'),
        runEvent(EventType.INIT),
        consentEvent('proc-1'),
        { ...runEvent(EventType.INIT), eventType: EventType.DONE } as SseResponse<EventType>,
      ]),
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: s => (states = s),
    });

    expect(states?.conversation.pendingConsent?.processId).toBe('proc-1');
    expect(states?.conversation.pendingConsent?.pendingCalls[0]?.toolCallId).toBe('call-1');
    // The history that preceded the synthetic bracket is still there.
    expect([...(states?.conversation.messages?.values() ?? [])].map(m => m.messageId)).toEqual(['h1']);
    channel.close();
  });

  it('sends the consent answer as RESPONSE_TOOL_CALL_CONSENT after a restore', async () => {
    const sent: FetchSsePayload[] = [];
    const client = {
      fetchSse(payload: FetchSsePayload, options?: FetchSseOptions): void {
        sent.push(payload);
        options?.onSseCompleted?.();
      },
      rejoinSse(_id: string, options?: FetchSseOptions): void {
        options?.onSseStart?.();
        options?.onSseMessage?.(consentEvent('proc-1'));
        options?.onSseCompleted?.();
      },
    } as unknown as IAsgardServiceClient;

    let states: ChannelStates | undefined;
    const channel = await Channel.restore({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: s => (states = s),
    });

    await channel.replyToolCallConsents([{ toolCallId: 'call-1', result: 'ALLOW_ONCE', denyReason: '' }]);

    expect(sent[0]?.action).toBe(FetchSseAction.RESPONSE_TOOL_CALL_CONSENT);
    expect(sent[0]?.toolCallConsents).toEqual([{ toolCallId: 'call-1', result: 'ALLOW_ONCE', denyReason: '' }]);
    // Answering clears the prompt, so the modal closes rather than re-firing on the next state push.
    expect(states?.conversation.pendingConsent).toBeNull();
    channel.close();
  });
});

// #404 — a channel parked on a consent prompt is `ListenType=PAUSE` on the server and only accepts a
// consent reply; asgard-core rejects a plain turn ("use RespondToolCallConsent"). The run already ended
// with run.done by then, so the F-023 AC6 busy guard sees an idle channel and lets the send through.
// Refuse locally instead — before the optimistic bubble, same rule as ChannelBusyError.
describe('Channel — send guard while a consent is pending (#404)', () => {
  async function restoredWithPendingConsent(): Promise<{
    channel: Channel;
    sent: FetchSsePayload[];
    states: () => ChannelStates | undefined;
  }> {
    const sent: FetchSsePayload[] = [];
    const client = {
      fetchSse(payload: FetchSsePayload, options?: FetchSseOptions): void {
        sent.push(payload);
        options?.onSseCompleted?.();
      },
      rejoinSse(_id: string, options?: FetchSseOptions): void {
        options?.onSseStart?.();
        options?.onSseMessage?.(consentEvent('proc-1'));
        options?.onSseCompleted?.();
      },
    } as unknown as IAsgardServiceClient;

    let latest: ChannelStates | undefined;
    const channel = await Channel.restore({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: s => (latest = s),
    });

    return { channel, sent, states: () => latest };
  }

  it('rejects sendMessage and leaves no trace in the thread', async () => {
    const { channel, sent, states } = await restoredWithPendingConsent();

    await expect(channel.sendMessage({ text: '算了，改問別的' })).rejects.toBeInstanceOf(ChannelAwaitingConsentError);
    // Nothing dispatched, and no optimistic user bubble left behind.
    expect(sent).toEqual([]);
    expect(states()?.conversation.messages?.size ?? 0).toBe(0);
    channel.close();
  });

  it('still allows replyToolCallConsents — the only way out of the pause', async () => {
    const { channel, sent } = await restoredWithPendingConsent();

    await channel.replyToolCallConsents([{ toolCallId: 'call-1', result: 'DENY_ONCE', denyReason: '不用' }]);

    expect(sent[0]?.action).toBe(FetchSseAction.RESPONSE_TOOL_CALL_CONSENT);
    channel.close();
  });

  it('releases the guard once the consent is answered', async () => {
    const { channel, sent } = await restoredWithPendingConsent();

    await channel.replyToolCallConsents([{ toolCallId: 'call-1', result: 'ALLOW_ONCE', denyReason: '' }]);
    await channel.sendMessage({ text: '繼續' });

    expect(sent.map(p => p.action)).toEqual([FetchSseAction.RESPONSE_TOOL_CALL_CONSENT, FetchSseAction.NONE]);
    channel.close();
  });
});

// asgard-freyr-pm#359 Q1 — pendingConsent is run-level state carried across every reducer hop. The
// traceId-attach path in buildRunHandlers rebuilds the Conversation directly, so it must carry the
// pending prompt over; dropping it would strand a run that is still waiting for an answer.
describe('Channel — pendingConsent durability', () => {
  it('keeps pendingConsent when a later frame attaches its traceId to the user bubble', async () => {
    // The consent lands on a frame with no traceId; the *next* frame carries one, which is what
    // triggers the user-bubble rewrite.
    const tracedMessage = { ...messageEvent('m1', '回覆'), traceId: 'trace-1' } as SseResponse<EventType>;

    let states: ChannelStates | undefined;
    const channel = Channel.create({
      client: mockClient([consentEvent('proc-1'), tracedMessage]),
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: s => (states = s),
    });

    await channel.sendMessage({ text: '刪掉暫存檔' });

    expect(states?.conversation.pendingConsent?.processId).toBe('proc-1');
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
    expect(last.conversation.messages?.has('a1')).toBe(true); // partial reply kept

    channel.close();
  });

  it('is a no-op when nothing is running', () => {
    const channel = makeChannel([]);

    expect(() => channel.stopGeneration()).not.toThrow();
    channel.close();
  });
});

// F-019 — launchedSandboxes store. `GET /channel/metadata` is the sole authority on "who is live"; the
// store is seeded from that metadata, authoritatively replaced on every refetch, and a `sandbox.launch`
// SSE frame is only a hint (recorded as pending + a refetch, never merged into live directly).

const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

function sb(sandboxName: string, overrides: Partial<LaunchedSandbox> = {}): LaunchedSandbox {
  return {
    sandboxName,
    sandboxBlueprintName: '',
    workingDirectory: '/work',
    editorServerEnabled: false,
    browserEnabled: false,
    ...overrides,
  };
}

function launchEventNamed(sandboxName: string): SseResponse<EventType> {
  return {
    eventType: EventType.SANDBOX_LAUNCH,
    requestId: 'req-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { sandboxLaunch: { sandboxName, blueprintName: 'bp-1' } },
  } as unknown as SseResponse<EventType>;
}

function metadataClient(opts: {
  events?: SseResponse<EventType>[];
  metadata?: () => ChannelMetadata | null;
}): IAsgardServiceClient {
  return {
    fetchSse(_payload: FetchSsePayload, options?: FetchSseOptions): void {
      options?.onSseStart?.();
      (opts.events ?? []).forEach(event => options?.onSseMessage?.(event));
      options?.onSseCompleted?.();
    },
    channelMetadata: vi.fn(async () => (opts.metadata ? opts.metadata() : null)),
  } as unknown as IAsgardServiceClient;
}

function meta(launchedSandboxes: LaunchedSandbox[]): ChannelMetadata {
  return { title: null, runState: 'IDLE', launchedSandboxes };
}

describe('Channel — launchedSandboxes store (F-019)', () => {
  const bare = (config: Partial<Parameters<typeof Channel.create>[0]> = {}): Channel =>
    Channel.create({
      client: mockClient([]),
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      ...config,
    });

  it('AC2: seeds launchedSandboxes from config, reconciled (empty by default)', () => {
    expect(bare().getLaunchedSandboxes()).toEqual([]);

    const channel = bare({
      launchedSandboxes: [sb('b', { sandboxBlueprintName: 'B' }), sb('a', { sandboxBlueprintName: 'A' })],
    });
    expect(channel.getLaunchedSandboxes().map(s => s.sandboxName)).toEqual(['a', 'b']);
    channel.close();
  });

  it('AC4: applyLaunchedSandboxes replaces authoritatively (not merges) and emits each time', () => {
    const channel = bare();
    const seen: string[][] = [];
    const sub = channel.launchedSandboxes$.subscribe(list => seen.push(list.map(s => s.sandboxName)));

    channel.applyLaunchedSandboxes([sb('x')]);
    channel.applyLaunchedSandboxes([sb('y')]);

    expect(channel.getLaunchedSandboxes().map(s => s.sandboxName)).toEqual(['y']);
    expect(seen).toEqual([[], ['x'], ['y']]);
    sub.unsubscribe();
    channel.close();
  });

  it('AC3: launchedSandboxes$ replays the current snapshot to a late subscriber', () => {
    const channel = bare();
    channel.applyLaunchedSandboxes([sb('x')]);

    let latest: LaunchedSandbox[] | undefined;
    const sub = channel.launchedSandboxes$.subscribe(list => (latest = list));
    expect(latest?.map(s => s.sandboxName)).toEqual(['x']);
    sub.unsubscribe();
    channel.close();
  });

  it('AC4: per-slice — a message delta run does not re-emit launchedSandboxes$', async () => {
    const channel = makeChannel([messageEvent('m1', 'hi')]);
    channel.applyLaunchedSandboxes([sb('x')]);

    const emissions: number[] = [];
    const sub = channel.launchedSandboxes$.subscribe(list => emissions.push(list.length));
    channel.sendMessage({ text: 'hi' });
    await flush();

    expect(emissions).toEqual([1]); // only the replayed snapshot; the run never touches this slice
    sub.unsubscribe();
    channel.close();
  });

  it('ALT2: dropSandbox optimistically removes a sandbox', () => {
    const channel = bare();
    channel.applyLaunchedSandboxes([sb('x'), sb('y')]);
    channel.dropSandbox('x');

    expect(channel.getLaunchedSandboxes().map(s => s.sandboxName)).toEqual(['y']);
    channel.close();
  });

  it('AC6: noteSandboxLaunch records pending + refetches metadata, promoting to live on confirm', async () => {
    const client = metadataClient({ metadata: () => meta([sb('new')]) });
    const channel = Channel.create({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
    });

    channel.noteSandboxLaunch('new');
    expect(channel.getPendingLaunches()).toEqual(['new']); // pending, not yet live
    expect(channel.getLaunchedSandboxes()).toEqual([]);

    await flush();
    expect(client.channelMetadata).toHaveBeenCalledWith('ch');
    expect(channel.getLaunchedSandboxes().map(s => s.sandboxName)).toEqual(['new']); // metadata confirmed → live
    expect(channel.getPendingLaunches()).toEqual([]); // cleared on confirm
    channel.close();
  });

  it('AC6: an asgard.sandbox.launch frame in the run records pending + requests a refetch', async () => {
    const client = metadataClient({ events: [launchEventNamed('sbx-9')], metadata: () => null });
    const channel = Channel.create({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
    });

    channel.sendMessage({ text: 'go' });
    await flush();

    expect(channel.getPendingLaunches()).toContain('sbx-9');
    expect(client.channelMetadata).toHaveBeenCalledWith('ch');
    channel.close();
  });

  it('AC5: refetchMetadata applies the fetched launchedSandboxes', async () => {
    const client = metadataClient({ metadata: () => meta([sb('r')]) });
    const channel = Channel.create({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
    });

    await channel.refetchMetadata();
    expect(channel.getLaunchedSandboxes().map(s => s.sandboxName)).toEqual(['r']);
    channel.close();
  });

  it('ALT3: a launch hint that metadata never confirms stays pending (not promoted)', async () => {
    const client = metadataClient({ metadata: () => meta([]) });
    const channel = Channel.create({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
    });

    channel.noteSandboxLaunch('ghost');
    await flush();

    expect(channel.getLaunchedSandboxes()).toEqual([]);
    expect(channel.getPendingLaunches()).toEqual(['ghost']); // still pending, not falsely reported live
    channel.close();
  });

  it('AC2: launchedSandboxes is exposed on ChannelStates via statesObserver', () => {
    const seen: string[][] = [];
    const channel = bare({
      statesObserver: (s: ChannelStates) => seen.push(s.launchedSandboxes.map(x => x.sandboxName)),
    });
    channel.applyLaunchedSandboxes([sb('x')]);

    expect(seen[seen.length - 1]).toEqual(['x']);
    channel.close();
  });
});

describe('Channel — nudge (F-021 AC4)', () => {
  function nudgeChannel(): { channel: Channel; sent: FetchSsePayload[]; messageCount: () => number } {
    const sent: FetchSsePayload[] = [];
    const client = {
      fetchSse(payload: FetchSsePayload, options?: FetchSseOptions): void {
        sent.push(payload);
        options?.onSseStart?.();
        options?.onSseCompleted?.();
      },
    } as unknown as IAsgardServiceClient;
    let lastMessageCount = -1;
    const channel = Channel.create({
      client,
      customChannelId: 'ch',
      conversation: new Conversation({ messages: new Map() }),
      statesObserver: (s: ChannelStates) => (lastMessageCount = s.conversation.messages?.size ?? 0),
    });

    return { channel, sent, messageCount: (): number => lastMessageCount };
  }

  it('sends action=NUDGE with empty text and renders no message', async () => {
    const { channel, sent, messageCount } = nudgeChannel();

    await channel.nudge();

    expect(sent).toHaveLength(1);
    expect(sent[0].action).toBe(FetchSseAction.NUDGE);
    expect(sent[0].customChannelId).toBe('ch');
    expect(sent[0].text).toBe('');
    // Nothing was asked for, so nothing goes on the wire — the pre-BUG-004 body shape is unchanged.
    expect(sent[0].payload).toBeUndefined();
    // Invisible turn: nudge does not push a user message into the conversation (unlike sendMessage).
    expect(messageCount()).toBe(0);
    channel.close();
  });

  // BUG-004 — nudge was the only outbound that skipped `resolvePayload()`, so a consumer had no way at
  // all to attach payload to it. That matters because the backend rebuilds `prevPayload` from *this*
  // turn's incoming payload and never carries the previous turn's over: a payload-less NUDGE wakes a
  // sandbox with no subagents, no source-set mounts and the default working directory — and does so
  // silently, because every one of those blueprint expressions has a falsy fallback.
  it('sends the payload it is given', async () => {
    const { channel, sent } = nudgeChannel();

    await channel.nudge(undefined, { agent_hub: { agent_names: ['writer'] } });

    expect(sent[0].payload).toEqual({ agent_hub: { agent_names: ['writer'] } });
    channel.close();
  });

  it('resolves a function payload, like the other three outbounds', async () => {
    const { channel, sent } = nudgeChannel();

    await channel.nudge(undefined, () => ({ agent_hub: { working_directory: '/work/proj' } }));

    expect(sent[0].payload).toEqual({ agent_hub: { working_directory: '/work/proj' } });
    channel.close();
  });
});
