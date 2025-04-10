import { Chatbot } from '@asgard-js/react';
import { ReactNode, useState } from 'react';
import { ConversationMessage } from '@asgard-js/core';
import {
  // createButtonTemplateExample,
  // createCarouselTemplateExample,
  // createHintTemplateExample,
  // createTextTemplateExample,
  // createChartTemplateExample,
  createImageTemplateExample,
} from './const';

const { VITE_ENDPOINT, VITE_API_KEY } = import.meta.env;

export function Root(): ReactNode {
  const [customChannelId] = useState(crypto.randomUUID());

  const [initMessages] = useState<ConversationMessage[]>([
    // createTextTemplateExample(),
    // createHintTemplateExample(),
    // createButtonTemplateExample(),
    // createCarouselTemplateExample(),
    // createChartTemplateExample(),
    createImageTemplateExample(),
  ]);

  return (
    <div style={{ width: '800px' }}>
      <Chatbot
        fullScreen
        title="Chatbot"
        config={{
          endpoint: VITE_ENDPOINT,
          apiKey: VITE_API_KEY,
        }}
        avatar="./showtime.webp"
        botTypingPlaceholder="typing"
        customChannelId={customChannelId}
        initMessages={initMessages}
      />
    </div>
  );
}
