'use client';

import { Chatbot } from '@asgard-js/react';
import { nanoid } from 'nanoid';

const CONFIG = {
  botProviderEndpoint:
    'https://api.asgard-ai.com/ns/proj-0e7bc093-ef35-420f-a367-3d8abb5453c0/bot-provider/bp-public101-0e7bc093-ef35-420f-a367-3d8abb5453c0',
};

export default function RealPage() {
  return (
    <Chatbot
      customChannelId={nanoid()}
      config={CONFIG}
      fullScreen={true}
      enableUpload={true}
    />
  );
}
