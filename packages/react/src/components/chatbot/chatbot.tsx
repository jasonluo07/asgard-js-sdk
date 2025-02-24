import { ReactNode } from 'react';
import { ClientConfig, ConversationMessage } from '@asgard-js/core';
import clsx from 'clsx';
import {
  AsgardThemeContextProvider,
  AsgardThemeContextValue,
} from 'src/context/asgard-theme-context';
import { AsgardServiceContextProvider } from 'src/context/asgard-service-context';
import { ChatbotHeader } from './chatbot-header';
import { ChatbotBody } from './chatbot-body';
import { ChatbotFooter } from './chatbot-footer';
import classes from './chatbot.module.scss';

interface ChatbotProps {
  title: string;
  theme?: Partial<AsgardThemeContextValue>;
  config: ClientConfig;
  customChannelId: string;
  initMessages?: ConversationMessage[];
  debugMode?: boolean;
  fullScreen?: boolean;
  avatar?: string;
  botTypingPlaceholder?: string;
  onReset?: () => void;
  onClose?: () => void;
}

export function Chatbot(props: ChatbotProps): ReactNode {
  const {
    title,
    theme,
    config,
    customChannelId,
    initMessages,
    debugMode = false,
    fullScreen = false,
    avatar,
    botTypingPlaceholder,
    onReset,
    onClose,
  } = props;

  return (
    <AsgardThemeContextProvider fullScreen={fullScreen} theme={theme}>
      <AsgardServiceContextProvider
        className={clsx(
          classes.chatbot_root,
          fullScreen && classes.chatbot_root__fullScreen
        )}
        avatar={avatar}
        config={config}
        customChannelId={customChannelId}
        initMessages={initMessages}
        botTypingPlaceholder={botTypingPlaceholder}
        options={{ showDebugMessage: debugMode }}
      >
        <ChatbotHeader title={title} onReset={onReset} onClose={onClose} />
        <ChatbotBody />
        <ChatbotFooter />
      </AsgardServiceContextProvider>
    </AsgardThemeContextProvider>
  );
}
