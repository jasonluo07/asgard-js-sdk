// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventType } from '@asgard-js/core';
import type {
  AsgardServiceClient,
  ChannelMetadata,
  FetchSseOptions,
  FetchSsePayload,
  SseResponse,
} from '@asgard-js/core';
import { useChannel } from './use-channel';

/**
 * BUG-006 — `resetChannel`, `initChannel`, and `restoreChannel` each wrote their own `statesObserver`;
 * only `resetChannel`'s forwarded `sandboxPhase`, so a channel created via the other two paths never
 * left the Launch HUD's `idle` state. These three tests drive each path through the same F-015
 * metadata-gated mount effect the real app uses (`initChannel`/`restoreChannel` are internal — the
 * consumer never calls them directly) and assert `sandboxPhase` reaches `'ready'` on all three.
 */

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

interface ScriptedClient {
  client: AsgardServiceClient;
  finishSend(): void;
  finishReplay(): void;
}

/**
 * A controllable client whose metadata result picks the F-015 join branch under test.
 * Each transport emits `launching` immediately, then waits for the test to release `ready`.
 */
function scriptedClient(metadata: ChannelMetadata | null): ScriptedClient {
  let sendOptions: FetchSseOptions | undefined;
  let replayOptions: FetchSseOptions | undefined;

  const client = {
    async channelMetadata(): Promise<ChannelMetadata | null> {
      return metadata;
    },
    fetchSse(_payload: FetchSsePayload, options?: FetchSseOptions): void {
      sendOptions = options;
      options?.onSseStart?.();
      options?.onSseMessage?.(sandboxEvent('launch'));
    },
    rejoinSse(_customChannelId: string, options?: FetchSseOptions): void {
      replayOptions = options;
      options?.onSseStart?.();
      options?.onSseMessage?.(sandboxEvent('launch'));
    },
  } as unknown as AsgardServiceClient;

  return {
    client,
    finishSend(): void {
      sendOptions?.onSseMessage?.(sandboxEvent('ready'));
      sendOptions?.onSseCompleted?.();
    },
    finishReplay(): void {
      replayOptions?.onSseMessage?.(sandboxEvent('ready'));
      replayOptions?.onSseCompleted?.();
    },
  };
}

describe('useChannel — sandboxPhase wiring (BUG-006)', () => {
  it('R1: initChannel path (metadata 404 + autoResetChannel=false) tracks sandboxPhase to ready', async () => {
    const scripted = scriptedClient(null);
    const { result } = renderHook(() =>
      useChannel({ client: scripted.client, customChannelId: 'ch', autoResetChannel: false }),
    );

    await waitFor(() => expect(result.current.channel).not.toBeNull());
    expect(result.current.sandboxPhase).toBe('idle');

    const { sendMessage } = result.current;
    if (!sendMessage) throw new Error('expected initChannel to expose sendMessage');

    const sendPromise = sendMessage({ text: 'hi' });
    await waitFor(() => expect(result.current.sandboxPhase).toBe('launching'));

    await act(async () => {
      scripted.finishSend();
      await sendPromise;
    });
    expect(result.current.sandboxPhase).toBe('ready');
  });

  it('R2: restoreChannel path (metadata 200, rejoin) tracks sandboxPhase to ready', async () => {
    const scripted = scriptedClient({ title: 'x', runState: 'IDLE', launchedSandboxes: [] });
    const { result } = renderHook(() => useChannel({ client: scripted.client, customChannelId: 'ch' }));

    expect(result.current.sandboxPhase).toBe('idle');
    await waitFor(() => expect(result.current.sandboxPhase).toBe('launching'));

    act(() => scripted.finishReplay());
    expect(result.current.sandboxPhase).toBe('ready');
  });

  it('R3 (regression): resetChannel path (metadata 404, auto-reset) still tracks sandboxPhase to ready', async () => {
    const scripted = scriptedClient(null);
    const { result } = renderHook(() =>
      useChannel({ client: scripted.client, customChannelId: 'ch', resetPayload: { text: 'hi' } }),
    );

    expect(result.current.sandboxPhase).toBe('idle');
    await waitFor(() => expect(result.current.sandboxPhase).toBe('launching'));

    act(() => scripted.finishSend());
    expect(result.current.sandboxPhase).toBe('ready');
  });
});
