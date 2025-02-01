import { ReactNode, useCallback } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import clsx from 'clsx';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import styles from './bot-typing-box.module.scss';
import { ResizeObserverBox } from './resize-observer-box';
import { MessageTemplateType } from '@asgard-js/core';
import { useDebounce } from 'src/hooks';

interface BotTypingBoxProps {
  isTyping: boolean;
  typingText: string | null;
  templateType?: MessageTemplateType | null;
}

export function BotTypingBox(props: BotTypingBoxProps): ReactNode {
  const { isTyping, typingText } = props;
  const { messageBoxBottomRef, avatar } = useAsgardContext();

  const onResize = useCallback(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageBoxBottomRef]);

  const _isTyping = useDebounce(isTyping, 500);

  if (!_isTyping) return null;

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar avatar={avatar} />
      <TemplateBoxContent time={new Date()}>
        <div className={clsx(styles.text, styles['text--bot'])}>
          <ResizeObserverBox onResize={onResize}>
            <span>{typingText ?? ''}</span>
            {_isTyping && (
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
