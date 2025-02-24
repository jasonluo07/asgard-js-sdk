import { MouseEventHandler, ReactNode, useCallback, useMemo } from 'react';
import styles from './chatbot-header.module.scss';
import { ProfileIcon } from './profile-icon';
import { useAsgardContext } from 'src/context/asgard-service-context';
import RefreshSvg from 'src/icons/refresh.svg?react';
import CloseSvg from 'src/icons/close.svg?react';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';

interface ChatbotHeaderProps {
  title: string;
}

export function ChatbotHeader(props: ChatbotHeaderProps): ReactNode {
  const { title } = props;

  const { chatbot } = useAsgardThemeContext();

  const { avatar, isOpen, isResetting, resetChannel, closeChannel } =
    useAsgardContext();

  const contentStyles = useMemo(
    () => ({
      maxWidth: chatbot?.contentMaxWidth ?? '1200px',
    }),
    [chatbot]
  );

  const onOpen = useCallback<MouseEventHandler<HTMLDivElement>>(
    (e) => {
      if (!isOpen && !isResetting) {
        e.stopPropagation();
        resetChannel?.();
      }
    },
    [isOpen, isResetting, resetChannel]
  );

  const onReset = useCallback<MouseEventHandler<HTMLDivElement>>(
    (e) => {
      if (isOpen && !isResetting) {
        e.stopPropagation();
        resetChannel?.();
      }
    },
    [isOpen, isResetting, resetChannel]
  );

  const onClose = useCallback<MouseEventHandler<HTMLDivElement>>(
    (e) => {
      if (!isResetting) {
        e.stopPropagation();
        closeChannel?.();
      }
    },
    [isResetting, closeChannel]
  );

  return (
    <div className={styles.chatbot_header} onClick={onOpen}>
      <div className={styles.chatbot_header__content} style={contentStyles}>
        <div className={styles.chatbot_header__title}>
          <ProfileIcon avatar={avatar} />
          <h4>{title}</h4>
        </div>
        <div className={styles.chatbot_header__extra}>
          <div onClick={onReset}>
            <RefreshSvg />
          </div>
          <div onClick={onClose}>
            <CloseSvg />
          </div>
        </div>
      </div>
    </div>
  );
}
