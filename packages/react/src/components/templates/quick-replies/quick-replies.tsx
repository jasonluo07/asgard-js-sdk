import { ReactNode, useCallback } from 'react';
import styles from './quick-replies.module.scss';
import { useAsgardContext } from 'src/context/asgard-service-context';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';
import clsx from 'clsx';

interface QuickRepliesProps {
  quickReplies: { text: string }[];
}

export function QuickReplies(props: QuickRepliesProps): ReactNode {
  const { quickReplies } = props;

  const { template } = useAsgardThemeContext();
  const { sendMessage, isConnecting } = useAsgardContext();

  const onClick = useCallback(
    (text: string) => sendMessage?.({ text }),
    [sendMessage]
  );

  if (!quickReplies?.length) {
    return null;
  }

  return (
    <div
      className={clsx('asgard-quick-replies', styles.quick_replies_box)}
      style={template?.quickReplies?.style}
    >
      {quickReplies.map((quickReply) => (
        <button
          key={quickReply.text}
          className={styles.quick_reply}
          style={template?.quickReplies?.button?.style}
          disabled={isConnecting}
          onClick={() => onClick(quickReply.text)}
        >
          {quickReply.text}
        </button>
      ))}
    </div>
  );
}
