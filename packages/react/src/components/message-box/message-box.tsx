import { useCallback, useState } from 'react';
import { useSSEClient } from '../../hooks/use-sse-client';
import { ClientConfig } from '@asgard-js/core';

export interface MessageBoxProps {
  config: ClientConfig;
}

export function MessageBox(props: MessageBoxProps) {
  const { config } = props;

  const [value, setValue] = useState('');

  const client = useSSEClient({
    config,
    onMessageStart: (data) => {
      console.log('start: ', data);
    },
    onMessageDelta: (data) => {
      console.log('delta: ', data);
    },
    onMessageComplete: (data) => {
      console.log('complete: ', data);
    },
    onDone: (data) => {
      console.log('done: ', data);
    },
  });

  const onSubmit = useCallback(async () => {
    if (!client) return;

    await client.sendMessage({
      customChannelId: 'ch-2468',
      customMessageId: '',
      text: value,
      action: 'NONE',
    });
  }, [client, value]);

  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" onClick={onSubmit}>
        Send
      </button>
    </div>
  );
}
