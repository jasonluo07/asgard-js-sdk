import { CSSProperties, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAsgardContext } from 'src/context/asgard-service-context';
import clsx from 'clsx';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import { useDebounce, useResizeObserver } from 'src/hooks';
import classes from './text-template.module.scss';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';

interface BotTypingBoxProps {
  isTyping: boolean;
  typingText: string | null;
}

export function BotTypingBox(props: BotTypingBoxProps): ReactNode {
  const { isTyping, typingText } = props;
  const { messageBoxBottomRef, avatar } = useAsgardContext();

  const theme = useAsgardThemeContext();

  const ref = useRef<HTMLDivElement>(null);

  const onResize = useCallback(() => {
    messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageBoxBottomRef]);

  useResizeObserver({ ref, onResize });

  const _isTyping = useDebounce(isTyping, 500);

  const styles = useMemo<CSSProperties>(
    () => ({
      color: theme?.botMessage?.color,
      backgroundColor: theme?.botMessage?.backgroundColor,
    }),
    [theme]
  );

  if (!_isTyping) return null;

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar avatar={avatar} />
      <TemplateBoxContent time={new Date()}>
        <div
          ref={ref}
          className={clsx(classes.text, classes['text--bot'])}
          style={styles}
        >
          <span>
            {typingText ?? ''}
            {_isTyping && (
              <span className={classes['typing-indicator']}>
                <div className={classes.dot} />
                <div className={classes.dot} />
                <div className={classes.dot} />
              </span>
            )}
          </span>
        </div>
      </TemplateBoxContent>
    </TemplateBox>
  );
}
