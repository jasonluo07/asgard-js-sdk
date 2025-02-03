import { ReactNode } from 'react';
import { ClientConfig, ConversationMessage } from '@asgard-js/core';
import clsx from 'clsx';
import { AsgardServiceContextProvider } from 'src/context/asgard-service-context';
import { ChatbotHeader } from './chatbot-header';
import { ChatbotBody } from './chatbot-body';
import { ChatbotFooter } from './chatbot-footer';
import styles from './chatbot.module.scss';
import { ChatbotLoading } from './chatbot-loading/chatbot-loading';

interface ChatbotProps {
  title: string;
  config: ClientConfig;
  customChannelId: string;
  initMessages?: ConversationMessage[];
  fullScreen?: boolean;
  avatar?: string;
  options?: { showDebugMessage?: boolean };
}

export function Chatbot(props: ChatbotProps): ReactNode {
  const {
    title,
    config,
    customChannelId,
    initMessages,
    fullScreen = false,
    avatar,
    options,
  } = props;

  return (
    <AsgardServiceContextProvider
      className={clsx(
        styles.chatbot_root,
        fullScreen && styles.chatbot_root__fullScreen
      )}
      avatar={avatar}
      config={config}
      customChannelId={customChannelId}
      initMessages={initMessages}
      options={options}
    >
      <ChatbotLoading />
      <ChatbotHeader title={title} />
      <ChatbotBody />
      <ChatbotFooter />
    </AsgardServiceContextProvider>
  );
}
