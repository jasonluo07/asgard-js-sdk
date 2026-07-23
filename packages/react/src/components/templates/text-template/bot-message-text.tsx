import { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import classes from './text-template.module.scss';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { StreamdownClient } from './streamdown-client';

export interface BotMessageTextProps {
  children: string;
}

/**
 * The bot message text content — the themed `.text--bot` wrapper around the streaming/markdown renderer,
 * without the surrounding `TemplateBox`, `Avatar`, or `Time`. Exported so a consumer can compose a custom
 * bot message row (e.g. via `renderMessageContent` + `TemplateBox` / `TemplateBoxContent`) without
 * re-implementing the markdown styling.
 */
export function BotMessageText({ children }: BotMessageTextProps): ReactNode {
  const theme = useAsgardThemeContext();

  const style: CSSProperties = {
    color: theme?.botMessage?.color,
    backgroundColor: theme?.botMessage?.backgroundColor,
  };

  return (
    <div className={clsx(classes.text, classes['text--bot'])} style={style}>
      <StreamdownClient>{children}</StreamdownClient>
    </div>
  );
}
