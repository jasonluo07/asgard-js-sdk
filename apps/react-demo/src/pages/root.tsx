import { Chatbot, ConversationMessage } from '@asgard-js/react';
import { ReactNode, useState } from 'react';

const {
  VITE_BASE_URL,
  VITE_NAMESPACE,
  VITE_BOT_PROVIDER_NAME,
  VITE_WEBHOOK_TOKEN,
} = import.meta.env;

export function Root(): ReactNode {
  const [customChannelId] = useState(crypto.randomUUID());

  const [initConversation] = useState<ConversationMessage[]>([
    {
      type: 'bot',
      eventType: 'message',
      message: {
        text: '我是秀泰影城 / 生活常見問答 AI，我可以回答你各項關於秀泰商場 / 影城相關的問題，你可以問我任何問題，我會盡力回答你。(目前資料更新至 2024/08)',
        template: {
          type: 'TEXT',
          quickReplies: [
            { text: '死侍有上映嗎?' },
            { text: '哪邊可以找得到哺乳室' },
            { text: '請問停車場入場幾分鐘內免費' },
            { text: '可以跨影城進行網路訂票的現場取票嗎' },
            { text: '台中文心秀泰充電樁是新款還是舊款?' },
          ],
        },
      },
      time: new Date(),
    },
  ]);

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
        initConversation={initConversation}
      />
    </div>
  );
}
