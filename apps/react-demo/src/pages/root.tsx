import { Chatbot, ChatbotRef } from '@asgard-js/react';
import { ReactNode, useRef, useState } from 'react';
import { ConversationMessage } from '@asgard-js/core';
import {
  // createButtonTemplateExample,
  // createCarouselTemplateExample,
  // createHintTemplateExample,
  // createTextTemplateExample,
  createChartTemplateExample,
  // createImageTemplateExample,
} from './const';

const { VITE_ENDPOINT, VITE_API_KEY, VITE_BOT_PROVIDER_ENDPOINT } = import.meta
  .env;

export function Root(): ReactNode {
  const [customChannelId] = useState(crypto.randomUUID());

  const [initMessages] = useState<ConversationMessage[]>([
    // createTextTemplateExample(),
    // createHintTemplateExample(),
    // createButtonTemplateExample(),
    // createCarouselTemplateExample(),
    createChartTemplateExample(),
    // createImageTemplateExample(400, 600),
    // createImageTemplateExample(600, 400),
  ]);

  const chatbotRef = useRef<ChatbotRef>(null);

  return (
    <div style={{ width: '800px', position: 'relative' }}>
      <button
        style={{
          position: 'absolute',
          top: '80px',
          right: '50%',
          transform: 'translateX(50%)',
          zIndex: 10,
          border: '1px solid white',
          borderRadius: '5px',
          color: 'white',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          padding: '0.5rem 1rem',
        }}
        onClick={() =>
          chatbotRef.current?.serviceContext?.sendMessage?.({ text: 'Hello' })
        }
      >
        Send a message from outside of chatbot
      </button>
      <Chatbot
        ref={chatbotRef}
        fullScreen
        title="Chatbot"
        config={{
          endpoint: VITE_ENDPOINT,
          botProviderEndpoint: VITE_BOT_PROVIDER_ENDPOINT,
          apiKey: VITE_API_KEY,
        }}
        avatar="./showtime.webp"
        enableLoadConfigFromService={true}
        loadingComponent={<div>Custom Loading...</div>}
        botTypingPlaceholder="typing"
        customChannelId={customChannelId}
        initMessages={initMessages}
        onSseMessage={(response, ctx) => {
          if (response.eventType === 'asgard.run.done') {
            console.log('onSseMessage', response, ctx.conversation);

            setTimeout(() => {
              // delay some time to wait for the serviceContext to be available
              chatbotRef.current?.serviceContext?.sendMessage?.({
                text: 'Say hi after 5 seconds',
              });
            }, 5000);
          }
        }}
        theme={{
          chatbot: {
            header: {
              style: {
                backgroundColor: 'tomato',
              },
              title: {
                style: {
                  color: 'yellow',
                },
              },
            },
          },
          template: {
            quickReplies: {
              style: {
                backgroundColor: 'blue',
              },
              button: {
                style: {
                  backgroundColor: 'green',
                  color: 'yellow',
                  border: '1px solid red',
                },
              },
            },
          },
        }}
      />
    </div>
  );
}
