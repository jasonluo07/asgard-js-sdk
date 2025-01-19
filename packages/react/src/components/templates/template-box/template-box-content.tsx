import { ReactNode } from 'react';
import styles from './template-box-content.module.scss';
import { QuickReplies } from '../quick-replies';
import { formatTime } from 'src/utils';

interface TemplateBoxContentProps {
  children: ReactNode;
  time?: Date;
  quickReplies?: { text: string }[];
}

export function TemplateBoxContent(props: TemplateBoxContentProps): ReactNode {
  const { quickReplies, time, children } = props;

  return (
    <div className={styles.template_box_content}>
      <div className={styles.content}>
        {children}
        {time && <div className={styles.time}>{formatTime(time)}</div>}
      </div>
      {!!quickReplies?.length && <QuickReplies quickReplies={quickReplies} />}
    </div>
  );
}
