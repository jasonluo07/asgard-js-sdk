import { ReactNode } from 'react';
import { ClientConfig } from '@asgard-js/core';
import { AsgardServiceContextProvider } from 'src/context/asgard-service-context';
import { ChatbotHeader } from './chatbot-header';
import { ChatbotBody } from './chatbot-body';
import { ChatbotFooter } from './chatbot-footer';
import styles from './chatbot.module.scss';
import { ConversationMessage } from 'src/hooks';

interface ChatbotProps {
  config: ClientConfig;
  customChannelId: string;
  initConversation?: ConversationMessage[];
}

export function Chatbot(props: ChatbotProps): ReactNode {
  const { config, customChannelId, initConversation } = props;

  return (
    <AsgardServiceContextProvider
      className={styles.chatbot_root}
      config={config}
      customChannelId={customChannelId}
      initConversation={initConversation}
    >
      <ChatbotHeader />
      <ChatbotBody />
      <ChatbotFooter />
    </AsgardServiceContextProvider>
  );
}
