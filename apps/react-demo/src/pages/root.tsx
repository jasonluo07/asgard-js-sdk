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
    <div style={{ width: '100vw', height: '100vh' }}>
      <Chatbot
        fullScreen
        title="Chatbot"
        config={{
          endpoint: VITE_ENDPOINT,
          apiKey: VITE_API_KEY,
        }}
        avatar="./showtime.webp"
        customChannelId={customChannelId}
        initMessages={initMessages}
      />
    </div>
  );
}
