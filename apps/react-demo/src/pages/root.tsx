import { Chatbot } from '@asgard-js/react';
import { ReactNode, useState } from 'react';
import { ConversationMessage } from '@asgard-js/core';
import {
  createButtonTemplateExample,
  createCarouselTemplateExample,
  createHintTemplateExample,
  createTextTemplateExample,
} from './const';

const { VITE_DEV_ENDPOINT, VITE_API_KEY } = import.meta.env;

export function Root(): ReactNode {
  const [customChannelId] = useState(crypto.randomUUID());

  const [initMessages] = useState<ConversationMessage[]>([
    // createTextTemplateExample(),
    // createHintTemplateExample(),
    // createButtonTemplateExample(),
    // createCarouselTemplateExample(),
  ]);

  return (
    <div>
      <Chatbot
        config={{
          endpoint: VITE_DEV_ENDPOINT,
          apiKey: VITE_API_KEY,
        }}
        customChannelId={customChannelId}
        initMessages={initMessages}
        options={{
          showDebugMessage: true,
        }}
      />
    </div>
  );
}
