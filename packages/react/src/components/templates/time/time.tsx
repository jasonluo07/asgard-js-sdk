import { ReactNode } from 'react';
import { formatTime } from 'src/utils';
import styles from './time.module.scss';
import clsx from 'clsx';

interface TimeProps {
  time?: Date;
  className?: string;
}

export function Time(props: TimeProps): ReactNode {
  const { time, className } = props;

  if (!time) return null;

  return (
    <div className={clsx('asgard-time', styles.time, className)}>
      {formatTime(time)}
    </div>
  );
}
