import { describe } from 'vitest';
import SSEClient from '../client';
import { EventType } from '../enum';

const {
  VITE_BASE_URL,
  VITE_NAMESPACE,
  VITE_BOT_PROVIDER_NAME,
  VITE_WEBHOOK_TOKEN,
} = import.meta.env;

describe('client', async () => {
  const client = new SSEClient({
    baseUrl: VITE_BASE_URL,
    namespace: VITE_NAMESPACE,
    botProviderName: VITE_BOT_PROVIDER_NAME,
    webhookToken: VITE_WEBHOOK_TOKEN,
  });

  client.on(EventType.MESSAGE_START, (data) => {
    console.log('start: ', data.fact.messageStart.message.template.type);
  });

  client.on(EventType.MESSAGE_DELTA, (data) => {
    console.log('delta: ', data.fact.messageDelta.message.text);
  });

  client.on(EventType.MESSAGE_COMPLETE, (data) => {
    console.log('complete: ', data.fact.messageComplete.message.template);
  });

  await client.resetChannel();

  await client.sendMessage({
    customChannelId: 'ch-2468',
    customMessageId: '',
    text: '死侍有上映嗎?',
    action: 'NONE',
  });

  await client.sendMessage({
    customChannelId: 'ch-2468',
    customMessageId: '',
    text: '板橋秀泰',
    action: 'NONE',
  });

  await client.close();
});
