import {
  ChangeEventHandler,
  KeyboardEventHandler,
  ReactNode,
  useCallback,
  useState,
} from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import styles from './chatbot-footer.module.scss';

export function ChatbotFooter(): ReactNode {
  const { sendMessage, isConnecting } = useAsgardContext();

  const [value, setValue] = useState('');

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setValue(event.target.value);
    },
    []
  );

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (event) => {
      if (event.key === 'Enter') {
        sendMessage(value);
        setValue('');
      }
    },
    [sendMessage, value]
  );

  return (
    <div className={styles.chatbot_footer}>
      <input
        className={styles.chatbot_input}
        disabled={isConnecting}
        value={value}
        placeholder="Enter message"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
