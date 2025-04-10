import { ReactNode } from 'react';
import { ClientConfig, ConversationMessage } from '@asgard-js/core';
import {
  AsgardThemeContextProvider,
  AsgardThemeContextValue,
} from 'src/context/asgard-theme-context';
import {
  AsgardServiceContextProvider,
  AsgardTemplateContextProvider,
  AsgardTemplateContextValue,
} from 'src/context';
import { ChatbotHeader } from './chatbot-header';
import { ChatbotBody } from './chatbot-body';
import { ChatbotFooter } from './chatbot-footer';
import { ChatbotContainer } from './chatbot-container/chatbot-container';

interface ChatbotProps extends AsgardTemplateContextValue {
  title: string;
  customActions?: ReactNode[];
  theme?: Partial<AsgardThemeContextValue>;
  config: ClientConfig;
  customChannelId: string;
  initMessages?: ConversationMessage[];
  fullScreen?: boolean;
  avatar?: string;
  botTypingPlaceholder?: string;
  onReset?: () => void;
  onClose?: () => void;
}

export function Chatbot(props: ChatbotProps): ReactNode {
  const {
    title,
    customActions,
    theme,
    config,
    customChannelId,
    initMessages,
    fullScreen = false,
    avatar,
    botTypingPlaceholder,
    onReset,
    onClose,
    onErrorClick,
    errorMessageRenderer,
  } = props;

  return (
    <AsgardThemeContextProvider theme={theme}>
      <AsgardServiceContextProvider
        avatar={avatar}
        config={config}
        customChannelId={customChannelId}
        initMessages={initMessages}
        botTypingPlaceholder={botTypingPlaceholder}
      >
        <ChatbotContainer fullScreen={fullScreen}>
          <ChatbotHeader
            title={title}
            onReset={onReset}
            onClose={onClose}
            customActions={customActions}
          />
          <AsgardTemplateContextProvider
            onErrorClick={onErrorClick}
            errorMessageRenderer={errorMessageRenderer}
          >
            <ChatbotBody />
          </AsgardTemplateContextProvider>
          <ChatbotFooter />
        </ChatbotContainer>
      </AsgardServiceContextProvider>
    </AsgardThemeContextProvider>
  );
}
