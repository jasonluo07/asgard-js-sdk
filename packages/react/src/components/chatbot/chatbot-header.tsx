import { MouseEventHandler, ReactNode, useCallback, useMemo } from 'react';
import styles from './chatbot-header.module.scss';
import { ProfileIcon } from './profile-icon';
import { useAsgardContext } from 'src/context/asgard-service-context';
import RefreshSvg from 'src/icons/refresh.svg?react';
import CloseSvg from 'src/icons/close.svg?react';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';

interface ChatbotHeaderProps {
  title: string;
  onClose?: () => void;
  onReset?: () => void;
}

export function ChatbotHeader(props: ChatbotHeaderProps): ReactNode {
  const { title, onReset, onClose } = props;

  const { chatbot } = useAsgardThemeContext();

  const { avatar, isResetting, resetChannel, closeChannel } =
    useAsgardContext();

  const contentStyles = useMemo(
    () => ({
      maxWidth: chatbot?.contentMaxWidth ?? '1200px',
      borderBottomColor: chatbot?.borderColor,
    }),
    [chatbot]
  );

  const _onReset = useCallback<MouseEventHandler<HTMLDivElement>>(
    (e) => {
      if (!isResetting) {
        e.stopPropagation();
        onReset?.();
        resetChannel?.();
      }
    },
    [isResetting, onReset, resetChannel]
  );

  const _onClose = useCallback<MouseEventHandler<HTMLDivElement>>(
    (e) => {
      if (!isResetting) {
        e.stopPropagation();
        onClose?.();
        closeChannel?.();
      }
    },
    [isResetting, onClose, closeChannel]
  );

  return (
    <div className={styles.chatbot_header}>
      <div className={styles.chatbot_header__content} style={contentStyles}>
        <div className={styles.chatbot_header__title}>
          <ProfileIcon avatar={avatar} />
          <h4>{title}</h4>
        </div>
        <div className={styles.chatbot_header__extra}>
          <div onClick={_onReset}>
            <RefreshSvg />
          </div>
          <div onClick={_onClose}>
            <CloseSvg />
          </div>
        </div>
      </div>
    </div>
  );
}
