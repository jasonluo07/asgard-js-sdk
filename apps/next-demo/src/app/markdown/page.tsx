'use client';

import { Chatbot } from '@asgard-js/react';
import { ConversationMessage } from '@asgard-js/core';
import { useState } from 'react';
import {
  createTextTemplateExample,
  createMathTemplateExample,
  createHintTemplateExample,
  createButtonTemplateExample,
  createCarouselTemplateExample,
  createChartTemplateExample,
  createImageTemplateExample,
} from './const';

export default function MarkdownPage() {
  const [initMessages] = useState<ConversationMessage[]>([
    createTextTemplateExample(),
    createMathTemplateExample(),
    createHintTemplateExample(),
    createButtonTemplateExample(),
    createCarouselTemplateExample(),
    createChartTemplateExample(),
    createImageTemplateExample(400, 600),
    createImageTemplateExample(600, 400),
  ]);

  return (
    <div>
      <Chatbot
        customChannelId={crypto.randomUUID()}
        config={{
          botProviderEndpoint:
            process.env.NEXT_PUBLIC_BOT_PROVIDER_ENDPOINT ||
            'http://localhost:4300/api/mock-sse',
          apiKey: process.env.NEXT_PUBLIC_API_KEY || 'mock-api-key',
        }}
        initMessages={initMessages}
        fullScreen={true}
      />
    </div>
  );
}
