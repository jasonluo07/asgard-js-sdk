import { ReactNode, useMemo } from 'react';
import { formatTime } from 'src/utils';
import styles from './time.module.scss';
import clsx from 'clsx';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';

interface TimeProps {
  time?: Date;
  className?: string;
}

export function Time(props: TimeProps): ReactNode {
  const { time, className } = props;

  const { template } = useAsgardThemeContext();

  const timeStyle = useMemo(
    () => ({
      color: template?.time?.style?.color,
    }),
    [template?.time?.style?.color]
  );

  if (!time) return null;

  return (
    <div
      className={clsx('asgard-time', styles.time, className)}
      style={timeStyle}
    >
      {formatTime(time)}
    </div>
  );
}
