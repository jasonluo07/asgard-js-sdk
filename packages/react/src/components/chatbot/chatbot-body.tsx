import { ReactNode, useEffect } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import styles from './chatbot-body.module.scss';
import { ConversationMessageRenderer } from '../conversation-message-renderer';
import { BotTypingPlaceholder } from '../templates';

export function ChatbotBody(): ReactNode {
  const { messages, messageBoxBottomRef, botTypingPlaceholder } =
    useAsgardContext();

  useEffect(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messageBoxBottomRef]);

  return (
    <div className={styles.chatbot_body}>
      <div className={styles.chatbot_body__content}>
        {Array.from(messages?.values() ?? []).map((message) => (
          <ConversationMessageRenderer
            key={message.messageId}
            message={message}
          />
        ))}
        <BotTypingPlaceholder
          placeholder={botTypingPlaceholder ?? '正在輸入訊息'}
        />
        <div ref={messageBoxBottomRef} />
      </div>
    </div>
  );
}
