import { ReactNode, useEffect } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import styles from './chatbot-body.module.scss';
import { ConversationMessageRenderer } from '../conversation-message-renderer';
import { BotTypingBox } from '../templates';

export function ChatbotBody(): ReactNode {
  const { conversation, messageBoxBottomRef } = useAsgardContext();

  useEffect(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, messageBoxBottomRef]);

  return (
    <div className={styles.chatbot_body}>
      {conversation.map((message) => (
        <ConversationMessageRenderer
          key={crypto.randomUUID()}
          conversationMessage={message}
        />
      ))}
      <BotTypingBox />
      <div ref={messageBoxBottomRef} />
    </div>
  );
}
