import { ReactNode, useEffect, useMemo } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import styles from './chatbot-body.module.scss';
import { ConversationMessageRenderer } from './conversation-message-renderer';
import { BotTypingPlaceholder } from '../../templates';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';
import clsx from 'clsx';

export function ChatbotBody(): ReactNode {
  const { chatbot } = useAsgardThemeContext();

  const { messages, messageBoxBottomRef, botTypingPlaceholder } =
    useAsgardContext();

  useEffect(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messageBoxBottomRef]);

  const contentStyles = useMemo(
    () => ({
      maxWidth: chatbot?.contentMaxWidth ?? '1200px',
    }),
    [chatbot]
  );

  return (
    <div
      className={clsx('asgard-chatbot-body', styles.chatbot_body)}
      style={chatbot?.body?.style}
    >
      <div className={styles.chatbot_body__content} style={contentStyles}>
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
