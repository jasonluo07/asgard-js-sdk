import { ClientConfig, AsgardServiceClient, EventType } from '@asgard-js/core';
import { useEffect, useRef } from 'react';

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

  // Read the latest flag inside the unmount-only cleanup without re-running it.
  const keepConnectionOnUnmountRef = useRef(keepConnectionOnUnmount);
  keepConnectionOnUnmountRef.current = keepConnectionOnUnmount;

  if (!clientRef.current && !isPreviewMode) {
    clientRef.current = new AsgardServiceClient(config);
  }

  useEffect(() => {
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

  useEffect(() => {
    if (!clientRef.current || !onRunInit) return;

    clientRef.current.on(EventType.INIT, onRunInit);
  }, [onRunInit]);

  useEffect(() => {
    if (!clientRef.current || !onProcess) return;

    clientRef.current.on(EventType.PROCESS, onProcess);
  }, [onProcess]);

  useEffect(() => {
    if (!clientRef.current || !onMessage) return;

    clientRef.current.on(EventType.MESSAGE, onMessage);
  }, [onMessage]);

  useEffect(() => {
    if (!clientRef.current || !onToolCall) return;

    clientRef.current.on(EventType.TOOL_CALL, onToolCall);
  }, [onToolCall]);

  useEffect(() => {
    if (!clientRef.current || !onRunDone) return;

    clientRef.current.on(EventType.DONE, onRunDone);
  }, [onRunDone]);

  useEffect(() => {
    if (!clientRef.current || !onRunError) return;

    clientRef.current.on(EventType.ERROR, onRunError);
  }, [onRunError]);

  return clientRef.current;
}
