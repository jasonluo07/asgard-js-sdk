import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ChannelAwaitingConsentError, ChannelBusyError } from '@asgard-js/core';
import type { ClientConfig } from '@asgard-js/core';
import type { AsgardServiceContextValue } from './asgard-service-context';

/**
 * #409 — `wrappedSendMessage` swallows every rejection so fire-and-forget callers do not raise
 * unhandled promise rejections. Its comment justified that by saying errors surface via `onSseError`
 * instead — true for transport failures, but NOT for the two refusals (`ChannelBusyError`,
 * `ChannelAwaitingConsentError`): those reject before any SSE connection is opened, so nothing ever
 * reached `onSseError` and the caller was told nothing at all. These pin the forwarding.
 */

const inner = vi.hoisted(() => ({
  sendMessage: vi.fn<[unknown], Promise<void>>(() => Promise.resolve()),
}));

vi.mock('../hooks', () => ({
  useAsgardServiceClient: (): null => null,
  useChannel: (): Record<string, unknown> => ({
    channel: null,
    isOpen: true,
    isResetting: false,
    isConnecting: false,
    conversation: null,
    channelTitle: null,
    sandboxPhase: 'idle',
    runStatus: { kind: null, stopPhase: 'idle' },
    sendMessage: inner.sendMessage,
  }),
}));

const { AsgardServiceContextProvider, useAsgardContext } = await import('./asgard-service-context');

const CONFIG: ClientConfig = { botProviderEndpoint: 'https://example.test/ns/ns-1/bot-provider/bp-1' };

let captured: AsgardServiceContextValue | null = null;

function Probe(): null {
  captured = useAsgardContext();

  return null;
}

function mount(onSseError: (error: unknown) => void): AsgardServiceContextValue {
  captured = null;

  renderToStaticMarkup(
    <AsgardServiceContextProvider config={CONFIG} customChannelId="ch" onSseError={onSseError}>
      <Probe />
    </AsgardServiceContextProvider>,
  );

  if (!captured) throw new Error('context not captured');

  return captured;
}

describe('#409 — send refusals reach onSseError', () => {
  beforeEach(() => {
    inner.sendMessage.mockReset();
  });

  it('forwards ChannelAwaitingConsentError', async () => {
    const refusal = new ChannelAwaitingConsentError('proc-1');
    inner.sendMessage.mockRejectedValueOnce(refusal);

    const onSseError = vi.fn();
    const ctx = mount(onSseError);

    // Still resolves — the swallow is deliberate, callers are fire-and-forget.
    await expect(ctx.sendMessage?.({ text: '哈囉' })).resolves.toBeUndefined();
    expect(onSseError).toHaveBeenCalledWith(refusal);
  });

  it('forwards ChannelBusyError', async () => {
    const refusal = new ChannelBusyError('user');
    inner.sendMessage.mockRejectedValueOnce(refusal);

    const onSseError = vi.fn();
    const ctx = mount(onSseError);

    await ctx.sendMessage?.({ text: '哈囉' });
    expect(onSseError).toHaveBeenCalledWith(refusal);
  });

  it('leaves other errors to the transport (no double reporting)', async () => {
    inner.sendMessage.mockRejectedValueOnce(new Error('socket died'));

    const onSseError = vi.fn();
    const ctx = mount(onSseError);

    await ctx.sendMessage?.({ text: '哈囉' });
    expect(onSseError).not.toHaveBeenCalled();
  });
});
