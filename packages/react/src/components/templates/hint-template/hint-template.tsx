import { ReactNode } from 'react';
import styles from './hint-template.module.scss';
import { ConversationMessage } from 'src/hooks';
import { formatTime } from 'src/utils';
import { MessageTemplateType } from '@asgard-js/core';

interface HintTemplateProps {
  conversationMessage: ConversationMessage;
}

export function HintTemplate(props: HintTemplateProps): ReactNode {
  const { conversationMessage } = props;

  if (conversationMessage.type === 'user') return null;

  const template = conversationMessage.message.template;

  if (template.type !== MessageTemplateType.HINT) return null;

  return (
    <div className={styles.hint_root}>
      <div className={styles.time}>{formatTime(conversationMessage.time)}</div>
      {template.text}
    </div>
  );
}
