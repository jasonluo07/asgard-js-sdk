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
  AsgardAppInitializationContextProvider,
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
  enableLoadConfigFromService?: boolean;
  asyncInitializers?: Record<string, () => Promise<unknown>>;
  onReset?: () => void;
  onClose?: () => void;
  loadingComponent?: ReactNode;
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
    enableLoadConfigFromService = false,
    asyncInitializers = {},
    loadingComponent,
    onReset,
    onClose,
    onTemplateBtnClick,
    onErrorClick,
    errorMessageRenderer,
  } = props;

  return (
    <AsgardAppInitializationContextProvider
      enabled={enableLoadConfigFromService}
      config={config}
      asyncInitializers={asyncInitializers}
      loadingComponent={loadingComponent}
    >
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
              onTemplateBtnClick={onTemplateBtnClick}
            >
              <ChatbotBody />
            </AsgardTemplateContextProvider>
            <ChatbotFooter />
          </ChatbotContainer>
        </AsgardServiceContextProvider>
      </AsgardThemeContextProvider>
    </AsgardAppInitializationContextProvider>
  );
}
