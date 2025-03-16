import { ReactNode } from 'react';
import { ClientConfig, ConversationMessage } from '@asgard-js/core';
import {
  AsgardThemeContextProvider,
  AsgardThemeContextValue,
} from 'src/context/asgard-theme-context';
import { AsgardServiceContextProvider } from 'src/context/asgard-service-context';
import { ChatbotHeader } from './chatbot-header';
import { ChatbotBody } from './chatbot-body';
import { ChatbotFooter } from './chatbot-footer';
import { ChatbotContainer } from './chatbot-container/chatbot-container';

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
    <AsgardThemeContextProvider theme={theme}>
      <AsgardServiceContextProvider
        avatar={avatar}
        config={config}
        customChannelId={customChannelId}
        initMessages={initMessages}
        botTypingPlaceholder={botTypingPlaceholder}
        options={{ showDebugMessage: debugMode }}
      >
        <ChatbotContainer fullScreen={fullScreen}>
          <ChatbotHeader title={title} onReset={onReset} onClose={onClose} />
          <ChatbotBody />
          <ChatbotFooter />
        </ChatbotContainer>
      </AsgardServiceContextProvider>
    </AsgardThemeContextProvider>
  );
}
