import { forwardRef, ForwardedRef, ReactNode } from 'react';
import { ClientConfig, ConversationMessage } from '@asgard-js/core';
import {
  AsgardThemeContextProvider,
  AsgardThemeContextValue,
} from 'src/context/asgard-theme-context';
import {
  AsgardServiceContextProvider,
  AsgardServiceContextValue,
  AsgardTemplateContextProvider,
  AsgardTemplateContextValue,
  AsgardAppInitializationContextProvider,
  AsgardServiceContextProviderProps,
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
  onSseMessage?: AsgardServiceContextProviderProps['onSseMessage'];
  fullScreen?: boolean;
  avatar?: string;
  botTypingPlaceholder?: string;
  enableLoadConfigFromService?: boolean;
  asyncInitializers?: Record<string, () => Promise<unknown>>;
  onReset?: () => void;
  onClose?: () => void;
  loadingComponent?: ReactNode;
}

export interface ChatbotRef {
  serviceContext?: AsgardServiceContextValue;
}

export const Chatbot = forwardRef(function Chatbot(
  props: ChatbotProps,
  ref: ForwardedRef<ChatbotRef>
): ReactNode {
  const {
    title,
    customActions,
    theme,
    config,
    customChannelId,
    initMessages,
    onSseMessage,
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
          parentRef={ref}
          avatar={avatar}
          config={config}
          customChannelId={customChannelId}
          initMessages={initMessages}
          onSseMessage={onSseMessage}
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
});
