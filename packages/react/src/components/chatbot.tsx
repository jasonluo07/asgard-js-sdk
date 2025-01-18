import { ReactNode } from 'react';
import { AsgardServiceContextProvider } from 'src/context/asgard-service-context';
import { ChatbotHeader } from './chatbot-header';
import { ChatbotBody } from './chatbot-body';
import { ChatbotFooter } from './chatbot-footer';
import styles from './chatbot.module.scss';
import { ClientConfig } from '@asgard-js/core';

interface ChatbotProps {
  config: ClientConfig;
  customChannelId: string;
  customMessageId?: string;
}

export function Chatbot(props: ChatbotProps): ReactNode {
  const { config, customChannelId, customMessageId } = props;

  return (
    <AsgardServiceContextProvider
      className={styles.chatbot_root}
      config={config}
      customChannelId={customChannelId}
      customMessageId={customMessageId}
    >
      <ChatbotHeader />
      <ChatbotBody />
      <ChatbotFooter />
    </AsgardServiceContextProvider>
  );
}
