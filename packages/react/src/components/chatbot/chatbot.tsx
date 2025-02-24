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
  fullScreen?: boolean;
  avatar?: string;
  botTypingPlaceholder?: string;
  options?: { showDebugMessage?: boolean };
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
    fullScreen = false,
    avatar,
    options,
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
        options={options}
      >
        <ChatbotHeader title={title} onReset={onReset} onClose={onClose} />
        <ChatbotBody />
        <ChatbotFooter />
      </AsgardServiceContextProvider>
    </AsgardThemeContextProvider>
  );
}
