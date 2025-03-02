import { ReactNode } from 'react';
import styles from './hint-template.module.scss';
import { formatTime } from 'src/utils';
import { ConversationMessage, MessageTemplateType } from '@asgard-js/core';
import clsx from 'clsx';

interface HintTemplateProps {
  message: ConversationMessage;
}

export function HintTemplate(props: HintTemplateProps): ReactNode {
  const { message } = props;

  if (message.type === 'user') return null;

  if (message.type === 'error')
    return (
      <div className={clsx(styles.hint_root, styles.hint_root__error)}>
        <div className={styles.time}>{formatTime(message.time)}</div>
        <span>Unexpected error</span>
      </div>
    );

  const template = message.message.template;

  if (template.type !== MessageTemplateType.HINT) return null;

  return (
    <div className={styles.hint_root}>
      <div className={styles.time}>{formatTime(message.time)}</div>
      {template.text}
    </div>
  );
}
