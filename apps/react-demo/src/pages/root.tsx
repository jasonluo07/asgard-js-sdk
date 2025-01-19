import { Chatbot, ConversationMessage } from '@asgard-js/react';
import { ReactNode, useState } from 'react';
import {
  createButtonTemplateExample,
  createCarouselTemplateExample,
  createHintTemplateExample,
  createTextTemplateExample,
} from './const';

const {
  VITE_BASE_URL,
  VITE_NAMESPACE,
  VITE_BOT_PROVIDER_NAME,
  VITE_WEBHOOK_TOKEN,
} = import.meta.env;

export function Root(): ReactNode {
  const [customChannelId] = useState(crypto.randomUUID());

  const [initConversation] = useState<ConversationMessage[]>([
    createTextTemplateExample(),
    createHintTemplateExample(),
    createButtonTemplateExample(),
    createCarouselTemplateExample(),
  ]);

  return (
    <div>
      <Chatbot
        config={{
          baseUrl: VITE_BASE_URL,
          namespace: VITE_NAMESPACE,
          botProviderName: VITE_BOT_PROVIDER_NAME,
          webhookToken: VITE_WEBHOOK_TOKEN,
        }}
        customChannelId={customChannelId}
        initConversation={initConversation}
      />
    </div>
  );
}
