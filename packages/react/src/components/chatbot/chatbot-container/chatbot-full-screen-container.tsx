import { PropsWithChildren, ReactNode, useRef } from 'react';
import clsx from 'clsx';
import {
  useIsOnScreenKeyboardOpen,
  useOnScreenKeyboardScrollFix,
  usePreventOverScrolling,
  useViewportSize,
} from 'src/hooks';
import classes from './chatbot-container.module.scss';

export function ChatbotFullScreenContainer(
  props: PropsWithChildren
): ReactNode {
  const { children } = props;

  const containerRef = useRef<HTMLDivElement>(null);

  usePreventOverScrolling(containerRef);

  useOnScreenKeyboardScrollFix();

  const [, height] = useViewportSize() ?? [];

  const isOnScreenKeyboardOpen = useIsOnScreenKeyboardOpen();

  return (
    <div className={classes.full_screen}>
      <div
        ref={containerRef}
        className={clsx(
          classes.chatbot_container,
          isOnScreenKeyboardOpen && classes.screen_keyboard_open
        )}
        style={isOnScreenKeyboardOpen ? { height } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
