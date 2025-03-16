import { PropsWithChildren, ReactNode, useRef } from 'react';
import { useUpdateVh } from 'src/hooks';
import { ChatbotFullScreenContainer } from './chatbot-full-screen-container';
import classes from './chatbot-container.module.scss';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';

interface ChatbotContainerProps extends PropsWithChildren {
  fullScreen?: boolean;
}

export function ChatbotContainer(props: ChatbotContainerProps): ReactNode {
  const { fullScreen, children } = props;

  const rootRef = useRef<HTMLDivElement>(null);

  useUpdateVh(rootRef);

  const theme = useAsgardThemeContext();

  return (
    <div ref={rootRef} className={classes.chatbot_root}>
      {fullScreen ? (
        <ChatbotFullScreenContainer>{children}</ChatbotFullScreenContainer>
      ) : (
        <div className={classes.chatbot_container} style={theme?.chatbot}>
          {children}
        </div>
      )}
    </div>
  );
}
