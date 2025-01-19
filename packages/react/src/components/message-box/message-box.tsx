import { ReactNode } from 'react';
import { ConversationMessage } from 'src/hooks';
import styles from './message-box.module.scss';
import clsx from 'clsx';
import { useAsgardContext } from 'src/context/asgard-service-context';
import { QuickReplies } from '../templates/quick-replies';

interface MessageBoxProps {
  conversationMessage: ConversationMessage;
}

export function MessageBox(props: MessageBoxProps): ReactNode {
  const { conversationMessage } = props;

  const isUser = conversationMessage.type === 'user';

  if (isUser) {
    return (
      <div className={clsx(styles.message_box, styles['message_box--user'])}>
        <div className={styles.message_box_row}>
          <div className={clsx(styles.text_area, styles['text_area--user'])}>
            {conversationMessage.text}
          </div>
          <div className={styles.time}>
            {conversationMessage.time.toLocaleTimeString('zh-TW', {
              timeZone: 'Asia/Taipei',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(styles.message_box, styles['message_box--bot'])}>
      <div className={styles.message_box_row}>
        <div className={styles.bot_avatar} />
        <div className={clsx(styles.text_area, styles['text_area--bot'])}>
          {conversationMessage.message.text}
        </div>
        <div className={styles.time}>
          {conversationMessage.time.toLocaleTimeString('zh-TW', {
            timeZone: 'Asia/Taipei',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </div>
      </div>
      <div className={styles.message_box_row}>
        <QuickReplies
          quickReplies={conversationMessage.message.template?.quickReplies}
        />
      </div>
    </div>
  );
}
