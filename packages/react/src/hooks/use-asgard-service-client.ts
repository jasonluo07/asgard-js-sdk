import { ClientConfig, AsgardServiceClient, EventType } from '@asgard-js/core';
import { useEffect, useRef, useState } from 'react';

/**
 * Safety timeout (ms) for a connection kept alive past unmount. If the run
 * gets stuck (stream never closes), the detached client force-closes after
 * this window so the orphaned connection cannot leak.
 */
const KEEP_CONNECTION_SAFETY_TIMEOUT_MS = 90_000;

interface UseAsgardServiceClientProps {
  config: ClientConfig;
  /**
   * When true, the in-flight SSE run is kept alive on unmount instead of being
   * aborted, so it can finish on the backend. Defaults to false.
   */
  keepConnectionOnUnmount?: boolean;
}

export function useAsgardServiceClient(props: UseAsgardServiceClientProps): AsgardServiceClient | null {
  const { config, keepConnectionOnUnmount } = props;

  // Preview mode: skip client creation when botProviderEndpoint is 'skip'
  const isPreviewMode = 'botProviderEndpoint' in config && config.botProviderEndpoint === 'skip';

  const { onRunInit, onProcess, onMessage, onToolCall, onRunDone, onRunError } = config;

  const clientRef = useRef<AsgardServiceClient | null>(null);

  // Read the latest values inside the mount-only effect without re-running it.
  const keepConnectionOnUnmountRef = useRef(keepConnectionOnUnmount);
  keepConnectionOnUnmountRef.current = keepConnectionOnUnmount;
  const configRef = useRef(config);
  configRef.current = config;
  const isPreviewModeRef = useRef(isPreviewMode);
  isPreviewModeRef.current = isPreviewMode;

  // Built during render so the first paint already has a client (no null frame for consumers).
  if (!clientRef.current && !isPreviewMode) {
    clientRef.current = new AsgardServiceClient(config);
  }

  // The instance actually handed out. Held in state, not read straight off the ref, so that
  // rebuilding after a cleanup re-renders consumers onto the new instance.
  const [client, setClient] = useState<AsgardServiceClient | null>(clientRef.current);

  useEffect(() => {
    // React runs setup → cleanup → setup on the same element (StrictMode in dev, and any remount
    // that reuses this hook instance). The cleanup below disposes the client and clears the ref,
    // and nothing else rebuilds it — so without this the consumer keeps the *disposed* instance.
    // That fails silently and severely: `runSse` drops every frame while detached and skips
    // `onSseCompleted`, so a rejoin replays the transcript into a dead client and never settles the
    // run — empty conversation plus a permanently disabled composer (asgard-sdk-pm#48).
    if (!clientRef.current && !isPreviewModeRef.current) {
      clientRef.current = new AsgardServiceClient(configRef.current);
    }

    setClient(clientRef.current);

    return (): void => {
      if (clientRef.current) {
        if (keepConnectionOnUnmountRef.current) {
          // Let the in-flight run finish in the background; the client
          // self-closes on completion or after the safety timeout.
          clientRef.current.detach({ timeoutMs: KEEP_CONNECTION_SAFETY_TIMEOUT_MS });
        } else {
          clientRef.current.close();
        }

        clientRef.current = null;
      }
    };
  }, []);

  // Registrations follow the `client` instance: a rebuild re-registers onto the new one instead of
  // leaving every callback attached to a client that was disposed. Re-running on a new instance
  // cannot double-register, because each instance carries its own (empty) emitter.
  useEffect(() => {
    if (!client || !onRunInit) return;

    client.on(EventType.INIT, onRunInit);
  }, [client, onRunInit]);

  useEffect(() => {
    if (!client || !onProcess) return;

    client.on(EventType.PROCESS, onProcess);
  }, [client, onProcess]);

  useEffect(() => {
    if (!client || !onMessage) return;

    client.on(EventType.MESSAGE, onMessage);
  }, [client, onMessage]);

  useEffect(() => {
    if (!client || !onToolCall) return;

    client.on(EventType.TOOL_CALL, onToolCall);
  }, [client, onToolCall]);

  useEffect(() => {
    if (!client || !onRunDone) return;

    client.on(EventType.DONE, onRunDone);
  }, [client, onRunDone]);

  useEffect(() => {
    if (!client || !onRunError) return;

    client.on(EventType.ERROR, onRunError);
  }, [client, onRunError]);

  return client;
}
