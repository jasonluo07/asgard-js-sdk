import { ReactNode, useCallback } from 'react';
import styles from './quick-replies.module.scss';
import { useAsgardContext } from 'src/context/asgard-service-context';

interface QuickRepliesProps {
  quickReplies: { text: string }[];
}

export function QuickReplies(props: QuickRepliesProps): ReactNode {
  const { quickReplies } = props;

  const { sendMessage, isConnecting } = useAsgardContext();

  const onClick = useCallback(
    (text: string) => {
      sendMessage?.(text);
    },
    [sendMessage]
  );

  if (!quickReplies?.length) {
    return null;
  }

  return (
    <div className={styles.quick_replies_box}>
      {quickReplies.map((quickReply) => (
        <button
          key={quickReply.text}
          className={styles.quick_reply}
          disabled={isConnecting}
          onClick={() => onClick(quickReply.text)}
        >
          {quickReply.text}
        </button>
      ))}
    </div>
  );
}
