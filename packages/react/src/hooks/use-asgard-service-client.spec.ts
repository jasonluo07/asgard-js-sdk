// @vitest-environment jsdom
import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsgardServiceClient } from '@asgard-js/core';
import type { ClientConfig } from '@asgard-js/core';
import { useAsgardServiceClient } from './use-asgard-service-client';

/**
 * asgard-sdk-pm#48 — the client is built during render but disposed in the unmount cleanup, which
 * also nulls the ref. React StrictMode runs setup → cleanup → setup, and the second setup never
 * rebuilds what the cleanup destroyed, so the consumer keeps holding the *disposed* instance.
 *
 * That single defect produces both reported symptoms, and silently: `AsgardServiceClient.runSse`
 * drops every frame while `detached` (`if (this.detached) return`) and skips `onSseCompleted`, so a
 * rejoin replays the whole transcript into a client that throws it away and never settles the run —
 * empty conversation plus a permanently disabled composer, with nothing logged.
 */

const CONFIG: ClientConfig = { botProviderEndpoint: 'https://example.invalid/ns/n/bot-provider/b' };

afterEach(() => {
  vi.restoreAllMocks();
});

/** Render the hook under StrictMode, recording every instance the hook disposes. */
function renderUnderStrictMode(config: ClientConfig = CONFIG): {
  client: AsgardServiceClient | null;
  disposed: Set<AsgardServiceClient>;
} {
  const disposed = new Set<AsgardServiceClient>();

  vi.spyOn(AsgardServiceClient.prototype, 'detach').mockImplementation(function (this: AsgardServiceClient) {
    disposed.add(this);
  });
  vi.spyOn(AsgardServiceClient.prototype, 'close').mockImplementation(function (this: AsgardServiceClient) {
    disposed.add(this);
  });

  const { result } = renderHook(() => useAsgardServiceClient({ config, keepConnectionOnUnmount: true }), {
    wrapper: StrictMode,
  });

  return { client: result.current, disposed };
}

describe('useAsgardServiceClient under StrictMode', () => {
  it('does not hand back a client it already disposed', () => {
    const { client, disposed } = renderUnderStrictMode();

    // The simulated unmount disposed the first instance; whatever the hook returns afterwards must
    // still be live, or every SSE frame routed through it is silently discarded.
    expect(client).not.toBeNull();
    expect(disposed.has(client as AsgardServiceClient)).toBe(false);
  });

  it('still returns a client at all after the remount', () => {
    const { client } = renderUnderStrictMode();

    expect(client).toBeInstanceOf(AsgardServiceClient);
  });

  it('creates no client in preview mode', () => {
    const { client } = renderUnderStrictMode({ botProviderEndpoint: 'skip' });

    expect(client).toBeNull();
  });
});
