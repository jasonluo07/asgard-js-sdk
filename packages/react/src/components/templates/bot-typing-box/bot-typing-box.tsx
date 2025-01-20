import { ReactNode, useCallback } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import clsx from 'clsx';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import styles from './bot-typing-box.module.scss';
import { ResizeObserverBox } from './resize-observer-box';

export function BotTypingBox(): ReactNode {
  const { isTyping, displayText, messageBoxBottomRef } = useAsgardContext();

  const onResize = useCallback(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageBoxBottomRef]);

  if (!isTyping) return null;

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar />
      <TemplateBoxContent time={new Date()}>
        <div className={clsx(styles.text, styles['text--bot'])}>
          <ResizeObserverBox onResize={onResize}>
            <span>{displayText ?? ''}</span>
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
