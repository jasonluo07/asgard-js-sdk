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
  const [isComposing, setIsComposing] = useState(false);

  const onChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
    (event) => {
      const element = event.target as HTMLTextAreaElement;
      const value = element.value;

      element.style.height = '20px';

      if (value) {
        element.style.height = `${element.scrollHeight - 16}px`;
      }

      setValue(event.target.value);
    },
    []
  );

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLTextAreaElement>>(
    (event) => {
      if (event.key === 'Enter' && !isComposing && !isConnecting) {
        sendMessage(value);
        setValue('');
      }
    },
    [isComposing, isConnecting, sendMessage, value]
  );

  return (
    <div className={styles.chatbot_footer}>
      <div className={styles.chatbot_footer__content}>
        <textarea
          className={styles.chatbot_textarea}
          disabled={isConnecting}
          cols={40}
          value={value}
          placeholder="Enter message"
          onChange={onChange}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
        />
      </div>
    </div>
  );
}
