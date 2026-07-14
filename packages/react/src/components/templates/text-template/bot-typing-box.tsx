import { CSSProperties, ReactNode, useMemo } from 'react';
import { useAsgardContext } from '../../../context/asgard-service-context';
import clsx from 'clsx';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import classes from './text-template.module.scss';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { StreamdownClient } from './streamdown-client';

interface BotTypingBoxProps {
  isTyping: boolean;
  typingText: string | null;
}

// F-003 — the "in progress" cue now lives at the seam (RunningIndicator), bound to the whole
// connection. This box only renders the live streaming text — no 3-dot animation, no 500ms debounce.
// It shows once there is streaming text; the empty pre-first-delta gap is covered by the seam indicator.
export function BotTypingBox(props: BotTypingBoxProps): ReactNode {
  const { isTyping, typingText } = props;
  const { avatar } = useAsgardContext();

  const theme = useAsgardThemeContext();

  const styles = useMemo<CSSProperties>(
    () => ({
      color: theme?.botMessage?.color,
      backgroundColor: theme?.botMessage?.backgroundColor,
    }),
    [theme],
  );

  if (!isTyping || !typingText) return null;

  return (
    <TemplateBox className="asgard-text-template asgard-text-template--bot" type="bot" direction="horizontal">
      <Avatar avatar={avatar} />
      <TemplateBoxContent time={new Date()}>
        <div className={clsx(classes.text, classes['text--bot'])} style={styles}>
          <span>
            <StreamdownClient>{typingText}</StreamdownClient>
          </span>
        </div>
      </TemplateBoxContent>
    </TemplateBox>
  );
}
