import { ReactNode, useCallback, useRef } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import clsx from 'clsx';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import { useDebounce, useResizeObserver } from 'src/hooks';
import styles from './text-template.module.scss';

interface BotTypingBoxProps {
  isTyping: boolean;
  typingText: string | null;
}

export function BotTypingBox(props: BotTypingBoxProps): ReactNode {
  const { isTyping, typingText } = props;
  const { messageBoxBottomRef, avatar } = useAsgardContext();

  const ref = useRef<HTMLDivElement>(null);

  const onResize = useCallback(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageBoxBottomRef]);

  useResizeObserver({ ref, onResize });

  const _isTyping = useDebounce(isTyping, 500);

  if (!_isTyping) return null;

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar avatar={avatar} />
      <TemplateBoxContent time={new Date()}>
        <div ref={ref} className={clsx(styles.text, styles['text--bot'])}>
          <span>
            {typingText ?? ''}
            {_isTyping && (
              <span className={styles['typing-indicator']}>
                <div className={styles.dot} />
                <div className={styles.dot} />
                <div className={styles.dot} />
              </span>
            )}
          </span>
        </div>
      </TemplateBoxContent>
    </TemplateBox>
  );
}
