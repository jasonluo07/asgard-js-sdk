import { ChangeEventHandler, ReactNode, useCallback, useState } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import styles from './chatbot-footer.module.scss';

export function ChatbotFooter(): ReactNode {
  const { sendMessage } = useAsgardContext();

  const [value, setValue] = useState('');

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setValue(event.target.value);
    },
    []
  );

  const onSubmit = useCallback(() => {
    sendMessage(value);
  }, [sendMessage, value]);

  return (
    <div className={styles.chatbot_footer}>
      <input value={value} onChange={onChange} />
      <button type="button" onClick={onSubmit}>
        Send
      </button>
    </div>
  );
}
