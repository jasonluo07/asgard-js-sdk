import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { useAsgardContext } from '../../../context/asgard-service-context';
import styles from './chatbot-body.module.scss';
import { ConversationMessageRenderer } from './conversation-message-renderer';
import { BotTypingPlaceholder } from '../../templates';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { useIsAtBottom } from '../../../hooks';
import clsx from 'clsx';

export function ChatbotBody(): ReactNode {
  const { chatbot } = useAsgardThemeContext();

  const { messages, messageBoxBottomRef, botTypingPlaceholder } =
    useAsgardContext();

  const bodyRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useIsAtBottom(bodyRef);

  useEffect(() => {
    if (isAtBottom) {
      messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messageBoxBottomRef, isAtBottom]);

  const contentStyles = useMemo(
    () => ({
      maxWidth: chatbot?.contentMaxWidth ?? '1200px',
    }),
    [chatbot]
  );

  return (
    <div
      ref={bodyRef}
      className={clsx('asgard-chatbot-body', styles.chatbot_body)}
      style={chatbot?.body?.style}
    >
      <div className={styles.chatbot_body__content} style={contentStyles}>
        {Array.from(messages?.values() ?? []).map((message, index) => (
          <ConversationMessageRenderer
            key={message.messageId || `${message.type}-${index}-${message.time.getTime()}`}
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
