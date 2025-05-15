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

  const {
    chatbot: {
      style: rootStyle,
      header,
      body,
      footer,
      ...chatbotInnerContainerStyle
    },
  } = useAsgardThemeContext();

  return (
    <div ref={rootRef} className={classes.chatbot_root} style={rootStyle}>
      {fullScreen ? (
        <ChatbotFullScreenContainer>{children}</ChatbotFullScreenContainer>
      ) : (
        <div
          className={classes.chatbot_container}
          style={chatbotInnerContainerStyle}
        >
          {children}
        </div>
      )}
    </div>
  );
}
