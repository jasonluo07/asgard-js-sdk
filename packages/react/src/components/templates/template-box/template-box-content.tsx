import { ReactNode } from 'react';
import styles from './template-box-content.module.scss';
import { QuickReplies } from '../quick-replies';
import { Time } from '../time';
import clsx from 'clsx';

interface TemplateBoxContentProps {
  children: ReactNode;
  time?: Date;
  quickReplies?: { text: string }[];
}

export function TemplateBoxContent(props: TemplateBoxContentProps): ReactNode {
  const { quickReplies, time, children } = props;

  return (
    <div
      className={clsx(
        'asgard-template-box-content',
        styles.template_box_content
      )}
    >
      <div className={styles.content}>
        {children}
        <Time time={time} />
      </div>
      {!!quickReplies?.length && <QuickReplies quickReplies={quickReplies} />}
    </div>
  );
}
