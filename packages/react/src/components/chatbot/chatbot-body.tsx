import { ReactNode, useEffect, useRef } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import { MessageBox } from '../message-box/message-box';
import { BotTypingBox } from '../bot-typing-box';
import styles from './chatbot-body.module.scss';

export function ChatbotBody(): ReactNode {
  const { conversation, isTyping, displayText } = useAsgardContext();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('conversation', conversation);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <div className={styles.chatbot_body}>
      {conversation.map((message) => (
        <MessageBox key={crypto.randomUUID()} conversationMessage={message} />
      ))}
      {isTyping && <BotTypingBox />}
      <div ref={bottomRef} />
    </div>
  );
}
