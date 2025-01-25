import { ReactNode, useCallback } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import clsx from 'clsx';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import styles from './bot-typing-box.module.scss';
import { ResizeObserverBox } from './resize-observer-box';
import { ConversationBotMessage } from '@asgard-js/core';
import { useDebounce } from 'src/hooks';

interface BotTypingBoxProps {
  typingMessage: ConversationBotMessage;
}

export function BotTypingBox(props: BotTypingBoxProps): ReactNode {
  const { typingMessage } = props;
  const { messageBoxBottomRef } = useAsgardContext();

  const onResize = useCallback(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageBoxBottomRef]);

  const isTyping = useDebounce(typingMessage?.isTyping, 500);

  if (!isTyping) return null;

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar />
      <TemplateBoxContent time={new Date()}>
        <div className={clsx(styles.text, styles['text--bot'])}>
          <ResizeObserverBox onResize={onResize}>
            <span>{typingMessage?.typingText ?? ''}</span>
            {isTyping && (
              <span className={styles['typing-indicator']}>
                <div className={styles.dot} />
                <div className={styles.dot} />
                <div className={styles.dot} />
              </span>
            )}
          </ResizeObserverBox>
        </div>
      </TemplateBoxContent>
    </TemplateBox>
  );
}
