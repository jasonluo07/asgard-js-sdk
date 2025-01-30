import { ReactNode } from 'react';
import styles from './chatbot-header.module.scss';
import { ProfileIcon } from './profile-icon';
import { useAsgardContext } from 'src/context/asgard-service-context';

interface ChatbotHeaderProps {
  title: string;
}

export function ChatbotHeader(props: ChatbotHeaderProps): ReactNode {
  const { title } = props;

  const { avatar } = useAsgardContext();

  return (
    <div className={styles.chatbot_header}>
      <div className={styles.chatbot_header__content}>
        <div className={styles.chatbot_header__title}>
          <ProfileIcon avatar={avatar} />
          <h4>{title}</h4>
        </div>
        <div className={styles.chatbot_header__extra} />
      </div>
    </div>
  );
}
