import { ReactNode, useMemo } from 'react';
import { formatTime } from '../../../utils';
import styles from './time.module.scss';
import clsx from 'clsx';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';

export interface TimeProps {
  /** Renders nothing when omitted — how the default templates hide the timestamp. */
  time?: Date;
  className?: string;
}

/**
 * The message timestamp, formatted and themed via `template.time.style`. Exported so a consumer composing
 * its own message row (via `renderMessageContent` + `TemplateBox` / `UserMessageText` / `BotMessageText`)
 * can keep the timestamp its default rows show, instead of re-implementing the format and theme color.
 */
export function Time(props: TimeProps): ReactNode {
  const { time, className } = props;

  const { template } = useAsgardThemeContext();

  const timeStyle = useMemo(
    () => ({
      color: template?.time?.style?.color,
    }),
    [template?.time?.style?.color],
  );

  if (!time) return null;

  return (
    <div className={clsx('asgard-time', styles.time, className)} style={timeStyle}>
      {formatTime(time)}
    </div>
  );
}
