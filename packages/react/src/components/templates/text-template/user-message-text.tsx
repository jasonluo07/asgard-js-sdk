import { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import classes from './text-template.module.scss';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';

export interface UserMessageTextProps {
  children: ReactNode;
  /** Appended to the built-in classes — use it to add layout (width, margin) without losing the theming. */
  className?: string;
}

/**
 * The user message text content — the themed `.text--user` bubble, without the surrounding `TemplateBox`
 * or `Time`. Exported so a consumer can compose a custom user message row (e.g. via `renderMessageContent`
 * + `TemplateBox type="user"`) without re-implementing the bubble background, padding, radius, or width cap.
 *
 * `children` is a `ReactNode` (unlike `BotMessageText`, which renders markdown from a string): customizing a
 * user message means passing JSX, such as a leading mention rendered as a chip.
 *
 * The timestamp is the consumer's responsibility — a composed row renders no `Time` unless it adds one.
 */
export function UserMessageText({ children, className }: UserMessageTextProps): ReactNode {
  const theme = useAsgardThemeContext();

  const style: CSSProperties = {
    color: theme?.userMessage?.color,
    backgroundColor: theme?.userMessage?.backgroundColor,
  };

  return (
    <div className={clsx(classes.text, classes['text--user'], className)} style={style}>
      {children}
    </div>
  );
}
