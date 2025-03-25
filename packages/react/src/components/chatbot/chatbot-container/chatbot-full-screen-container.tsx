import { PropsWithChildren, ReactNode, useMemo, useRef } from 'react';
import clsx from 'clsx';
import {
  useIsOnScreenKeyboardOpen,
  useOnScreenKeyboardScrollFix,
  usePreventOverScrolling,
  useViewportSize,
} from 'src/hooks';
import classes from './chatbot-container.module.scss';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';

export function ChatbotFullScreenContainer(
  props: PropsWithChildren
): ReactNode {
  const { children } = props;

  const containerRef = useRef<HTMLDivElement>(null);

  const theme = useAsgardThemeContext();

  usePreventOverScrolling(containerRef);

  useOnScreenKeyboardScrollFix();

  const [, height] = useViewportSize() ?? [];

  const isOnScreenKeyboardOpen = useIsOnScreenKeyboardOpen();

  const styles = useMemo(() => {
    return Object.assign(
      theme?.chatbot?.backgroundColor
        ? {
            backgroundColor: theme.chatbot?.backgroundColor,
          }
        : {},
      isOnScreenKeyboardOpen ? { height } : {}
    );
  }, [height, isOnScreenKeyboardOpen, theme]);

  return (
    <div className={classes.full_screen}>
      <div
        ref={containerRef}
        className={clsx(
          classes.chatbot_container,
          isOnScreenKeyboardOpen && classes.screen_keyboard_open
        )}
        style={styles}
      >
        {children}
      </div>
    </div>
  );
}
