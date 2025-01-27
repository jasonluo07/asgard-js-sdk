import { ReactNode } from 'react';
import styles from './chatbot-header.module.scss';
import { ProfileIcon } from './profile-icon';

interface ChatbotHeaderProps {
  title: string;
}

export function ChatbotHeader(props: ChatbotHeaderProps): ReactNode {
  const { title } = props;

  return (
    <div className={styles.chatbot_header}>
      <div className={styles.chatbot_header__content}>
        <div className={styles.chatbot_header__title}>
          <ProfileIcon />
          <h4>{title}</h4>
        </div>
        <div className={styles.chatbot_header__extra} />
      </div>
    </div>
  );
}
