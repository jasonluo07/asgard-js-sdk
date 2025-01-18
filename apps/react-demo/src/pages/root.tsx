import { Chatbot } from '@asgard-js/react';
import { ReactNode, useState } from 'react';

const {
  VITE_BASE_URL,
  VITE_NAMESPACE,
  VITE_BOT_PROVIDER_NAME,
  VITE_WEBHOOK_TOKEN,
} = import.meta.env;

export function Root(): ReactNode {
  const [customChannelId] = useState(crypto.randomUUID());

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
      />
    </div>
  );
}
