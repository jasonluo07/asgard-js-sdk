import { ReactNode } from 'react';
import { ClientConfig, ConversationMessage } from '@asgard-js/core';
import { AsgardServiceContextProvider } from 'src/context/asgard-service-context';
import { ChatbotHeader } from './chatbot-header';
import { ChatbotBody } from './chatbot-body';
import { ChatbotFooter } from './chatbot-footer';
import styles from './chatbot.module.scss';

interface ChatbotProps {
  config: ClientConfig;
  customChannelId: string;
  initMessages?: ConversationMessage[];
  options?: { showDebugMessage?: boolean };
}

export function Chatbot(props: ChatbotProps): ReactNode {
  const { config, customChannelId, initMessages, options } = props;

  return (
    <AsgardServiceContextProvider
      className={styles.chatbot_root}
      config={config}
      customChannelId={customChannelId}
      initMessages={initMessages}
      options={options}
    >
      <ChatbotHeader />
      <ChatbotBody />
      <ChatbotFooter />
    </AsgardServiceContextProvider>
  );
}
