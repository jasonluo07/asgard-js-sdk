import { ReactNode, useEffect, useRef } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import styles from './message-box.module.scss';
import clsx from 'clsx';

export function BotTypingMessageBox(): ReactNode {
  const { isTyping, displayText, messageBoxBottomRef } = useAsgardContext();

  const botTypingTextAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = botTypingTextAreaRef.current;

    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0) {
          messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });

    resizeObserver.observe(element);

    return (): void => {
      resizeObserver.disconnect();
    };
  }, [messageBoxBottomRef]);

  if (!isTyping) return null;

  return (
    <div className={clsx(styles.message_box, styles['message_box--bot'])}>
      <div className={styles.message_box_row}>
        <div className={styles.bot_avatar} />
        <div
          ref={botTypingTextAreaRef}
          className={clsx(styles.text_area, styles['text_area--bot'])}
        >
          {displayText}
        </div>
      </div>
    </div>
  );
}
