import { Chatbot } from '@asgard-js/react';
import { ReactNode, useState } from 'react';
import { ConversationMessage } from '@asgard-js/core';
import {
  // createButtonTemplateExample,
  // createCarouselTemplateExample,
  // createHintTemplateExample,
  createTextTemplateExample,
} from './const';

const { VITE_ENDPOINT, VITE_API_KEY } = import.meta.env;

export function Root(): ReactNode {
  const [customChannelId] = useState(crypto.randomUUID());

  const [initMessages] = useState<ConversationMessage[]>([
    createTextTemplateExample(),
    // createHintTemplateExample(),
    // createButtonTemplateExample(),
    // createCarouselTemplateExample(),
  ]);

  return (
    <div style={{ width: '800px' }}>
      <Chatbot
        fullScreen
        title="Chatbot"
        config={{
          endpoint: VITE_ENDPOINT,
          apiKey: VITE_API_KEY,
          transformSsePayload: (payload) => {
            console.log('transformSsePayload', payload);

            return payload;
          },
        }}
        avatar="./showtime.webp"
        botTypingPlaceholder="typing"
        customChannelId={customChannelId}
        initMessages={initMessages}
      />
    </div>
  );
}
