import {
  ClientConfig,
  EventType,
  MessageSSEResponse,
  SSEClient,
} from '@asgard-js/core';
import { useEffect, useRef } from 'react';

interface UseSSEClientProps {
  config: ClientConfig;
  onInit?: (event: MessageSSEResponse<EventType.INIT>) => void;
  onMessageStart?: (event: MessageSSEResponse<EventType.MESSAGE_START>) => void;
  onMessageDelta?: (event: MessageSSEResponse<EventType.MESSAGE_DELTA>) => void;
  onMessageComplete?: (
    event: MessageSSEResponse<EventType.MESSAGE_COMPLETE>
  ) => void;
  onDone?: (event: MessageSSEResponse<EventType.DONE>) => void;
}

export function useSSEClient(props: UseSSEClientProps) {
  const {
    config,
    onInit,
    onMessageStart,
    onMessageDelta,
    onMessageComplete,
    onDone,
  } = props;

  const clientRef = useRef<SSEClient | null>(null);

  useEffect(() => {
    if (clientRef.current) {
      console.log('client already exists');
      return;
    }

    console.log('setting up client');

    clientRef.current = new SSEClient(config);

    const client = clientRef.current;

    console.log('resetting channel');
    client.resetChannel();

    if (onInit) client.on(EventType.INIT, onInit);
    if (onMessageStart) client.on(EventType.MESSAGE_START, onMessageStart);
    if (onMessageDelta) client.on(EventType.MESSAGE_DELTA, onMessageDelta);
    if (onMessageComplete)
      client.on(EventType.MESSAGE_COMPLETE, onMessageComplete);
    if (onDone) client.on(EventType.DONE, onDone);

    return () => {
      console.log('cleaning up client');
      client.close();
    };
  }, [
    config,
    onDone,
    onInit,
    onMessageComplete,
    onMessageDelta,
    onMessageStart,
    props,
  ]);

  return clientRef.current;
}
