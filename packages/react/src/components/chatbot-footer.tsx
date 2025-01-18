import { ChangeEventHandler, ReactNode, useCallback, useState } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';

export function ChatbotFooter(): ReactNode {
  const { client, customChannelId } = useAsgardContext();

  const [value, setValue] = useState('');

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setValue(event.target.value);
    },
    []
  );

  const onSubmit = useCallback(() => {
    if (!client) {
      throw new Error('Client is not available');
    }

    if (!customChannelId) {
      throw new Error('customChannelId is required');
    }

    client.sendMessage({
      customChannelId,
      customMessageId: '',
      text: value,
    });
  }, [client, customChannelId, value]);

  return (
    <div>
      <input value={value} onChange={onChange} />
      <button type="button" onClick={onSubmit}>
        Send
      </button>
    </div>
  );
}
