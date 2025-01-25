import { ReactNode, useEffect } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import styles from './chatbot-body.module.scss';
import { ConversationMessageRenderer } from '../conversation-message-renderer';
import { BotTypingBox } from '../templates';

export function ChatbotBody(): ReactNode {
  const { messages, typingMessages, messageBoxBottomRef } = useAsgardContext();

  useEffect(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messageBoxBottomRef]);

  return (
    <div className={styles.chatbot_body}>
      {Array.from(messages?.values() ?? []).map((message) => (
        <ConversationMessageRenderer
          key={crypto.randomUUID()}
          conversationMessage={message}
        />
      ))}
      {Array.from(typingMessages?.values() ?? []).map((typingMessage) => (
        <BotTypingBox key={crypto.randomUUID()} typingMessage={typingMessage} />
      ))}
      <div ref={messageBoxBottomRef} />
    </div>
  );
}
