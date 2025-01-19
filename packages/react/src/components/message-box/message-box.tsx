import { ReactNode } from 'react';
import { ConversationMessage } from 'src/hooks';
import styles from './message-box.module.scss';
import clsx from 'clsx';
import { formatTime } from 'src/utils';
import { QuickReplies } from '../templates';
interface MessageBoxProps {
  conversationMessage: ConversationMessage;
}

// @DEPRECATED: This component is deprecated and will be removed in the future.
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
            {formatTime(conversationMessage.time)}
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
          {formatTime(conversationMessage.time)}
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
