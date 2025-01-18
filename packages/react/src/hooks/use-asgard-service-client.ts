import {
  ClientConfig,
  EventType,
  SSEResponse,
  AsgardServiceClient,
  FetchSSEAction,
} from '@asgard-js/core';
import { useEffect, useRef } from 'react';

interface UseAsgardServiceClientProps {
  config: ClientConfig;
  onResetChannelInit?: (event: SSEResponse<EventType.INIT>) => void;
  onResetChannelDone?: (event: SSEResponse<EventType.DONE>) => void;
  onInit?: (event: SSEResponse<EventType.INIT>) => void;
  onMessageStart?: (event: SSEResponse<EventType.MESSAGE_START>) => void;
  onMessageDelta?: (event: SSEResponse<EventType.MESSAGE_DELTA>) => void;
  onMessageComplete?: (event: SSEResponse<EventType.MESSAGE_COMPLETE>) => void;
  onDone?: (event: SSEResponse<EventType.DONE>) => void;
}

export function useAsgardServiceClient(
  props: UseAsgardServiceClientProps
): AsgardServiceClient | null {
  const {
    config,
    onResetChannelInit,
    onResetChannelDone,
    onInit,
    onMessageStart,
    onMessageDelta,
    onMessageComplete,
    onDone,
  } = props;

  const clientRef = useRef<AsgardServiceClient | null>(
    new AsgardServiceClient(config)
  );

  useEffect(() => {
    return (): void => {
      console.log('cleaning up client');
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [config]);

  useEffect(() => {
    if (!onResetChannelDone) return;

    if (!clientRef.current) {
      console.error('client not initialized');

      return;
    }

    clientRef.current.on(
      FetchSSEAction.RESET_CHANNEL,
      EventType.DONE,
      onResetChannelDone
    );
  }, [onResetChannelDone]);

  useEffect(() => {
    if (!onResetChannelInit) return;

    if (!clientRef.current) {
      console.error('client not initialized');

      return;
    }

    clientRef.current.on(
      FetchSSEAction.RESET_CHANNEL,
      EventType.INIT,
      onResetChannelInit
    );
  }, [onResetChannelInit]);

  useEffect(() => {
    if (!onInit) return;

    if (!clientRef.current) {
      console.error('client not initialized');

      return;
    }

    clientRef.current.on(FetchSSEAction.NONE, EventType.INIT, onInit);
  }, [onInit]);

  useEffect(() => {
    if (!onMessageStart) return;

    if (!clientRef.current) {
      console.error('client not initialized');

      return;
    }

    clientRef.current.on(
      FetchSSEAction.NONE,
      EventType.MESSAGE_START,
      onMessageStart
    );
  }, [onMessageStart]);

  useEffect(() => {
    if (!onMessageDelta) return;

    if (!clientRef.current) {
      console.error('client not initialized');

      return;
    }

    clientRef.current.on(
      FetchSSEAction.NONE,
      EventType.MESSAGE_DELTA,
      onMessageDelta
    );
  }, [onMessageDelta]);

  useEffect(() => {
    if (!onMessageComplete) return;

    if (!clientRef.current) {
      console.error('client not initialized');

      return;
    }

    clientRef.current.on(
      FetchSSEAction.NONE,
      EventType.MESSAGE_COMPLETE,
      onMessageComplete
    );
  }, [onMessageComplete]);

  useEffect(() => {
    if (!onDone) return;

    if (!clientRef.current) {
      console.error('client not initialized');

      return;
    }

    clientRef.current.on(FetchSSEAction.NONE, EventType.DONE, onDone);
  }, [onDone]);

  return clientRef.current;
}
