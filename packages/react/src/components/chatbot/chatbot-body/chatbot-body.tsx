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
  const lastMessageCountRef = useRef<number>(0);

  useEffect(() => {
    const currentMessageCount = messages?.size ?? 0;
    const hasNewMessage = currentMessageCount > lastMessageCountRef.current;

    lastMessageCountRef.current = currentMessageCount;

    // 如果有新訊息且最後一則是使用者訊息，強制滾動到底部
    if (hasNewMessage && messages && messages.size > 0) {
      const messagesArray = Array.from(messages.values());
      const lastMessage = messagesArray[messagesArray.length - 1];

      if (lastMessage?.type === 'user') {
        messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });

        return;
      }
    }

    // 否則只有在底部時才滾動（AI 回應時）
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
