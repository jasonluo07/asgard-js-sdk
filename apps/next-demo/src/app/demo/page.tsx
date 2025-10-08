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
  createTextWithLinksTemplateExample,
  createStreamdownFeaturesExample,
  createMermaidDiagramExample,
  createCodeBlockExample,
  createTableExample,
} from './const';

export default function DemoPage() {
  const [initMessages] = useState<ConversationMessage[]>([
    // Streamdown Markdown 渲染功能展示
    createStreamdownFeaturesExample(),
    createCodeBlockExample(),
    createMermaidDiagramExample(),
    createTableExample(),
    createMathTemplateExample(),

    // Message Template 展示
    createTextTemplateExample(),
    createTextWithLinksTemplateExample(),
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
