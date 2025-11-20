'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  EventType,
  MessageTemplateType,
  ConversationMessage,
  Message,
} from '@asgard-js/core';
import { nanoid } from 'nanoid';
import styles from './page.module.css';

const Chatbot = dynamic(
  () => import('@asgard-js/react').then((mod) => ({ default: mod.Chatbot })),
  {
    ssr: false,
    loading: () => (
      <div className={styles.loading}>
        <div className={styles.loadingText}>載入中...</div>
      </div>
    ),
  }
);

const theme = {
  chatbot: {
    backgroundColor: '#1F1F1F',
    borderRadius: '16px',
  },
  botMessage: {
    backgroundColor: '#585858',
    color: '#ffffff',
  },
  userMessage: {
    backgroundColor: '#4767EB',
    color: '#ffffff',
  },
};

const quickReplies = [
  { text: '死侍有上映嗎?' },
  { text: '哪邊可以找得到哺乳室' },
  { text: '請問停車場入場幾分鐘內免費' },
  { text: '可以跨影城進行網路訂票的現場取票嗎' },
  { text: '台中文心秀泰充電樁是新款還是舊款?' },
];

function createBaseTemplateExample(message: Message): ConversationMessage {
  return {
    type: 'bot',
    messageId: message.messageId,
    isTyping: false,
    typingText: '',
    eventType: EventType.MESSAGE_COMPLETE,
    time: new Date(),
    message,
  };
}

function createTextTemplateExample(): ConversationMessage {
  const messageId = nanoid();

  return createBaseTemplateExample({
    text: '我是秀泰影城 / 生活常見問答 AI，我可以回答你各項關於秀泰商場 / 影城相關的問題，你可以問我任何問題，我會盡力回答你。(目前資料更新至 2024/08)',
    template: {
      type: MessageTemplateType.TEXT,
      text: '我是秀泰影城 / 生活常見問答 AI，我可以回答你各項關於秀泰商場 / 影城相關的問題，你可以問我任何問題，我會盡力回答你。(目前資料更新至 2024/08)',
      quickReplies,
    },
    messageId,
    replyToCustomMessageId: '',
    payload: undefined,
    isDebug: false,
    idx: 0,
  });
}

function createMathTemplateExample(): ConversationMessage {
  const messageId = nanoid();

  return createBaseTemplateExample({
    messageId,
    replyToCustomMessageId: '',
    text: '數學公式範例：\\\\(E = mc^2\\\\) 以及區塊公式：\\n\\n\\\\[\\n\\\\int_{-\\\\infty}^{\\\\infty} e^{-x^2} dx = \\\\sqrt{\\\\pi}\\n\\\\]',
    payload: null,
    isDebug: false,
    idx: 0,
    template: {
      type: MessageTemplateType.TEXT,
      text: '數學公式範例：\\\\(E = mc^2\\\\) 以及區塊公式：\\n\\n\\\\[\\n\\\\int_{-\\\\infty}^{\\\\infty} e^{-x^2} dx = \\\\sqrt{\\\\pi}\\n\\\\]',
      quickReplies: [],
    },
  });
}

function createHintTemplateExample(): ConversationMessage {
  const messageId = nanoid();

  return createBaseTemplateExample({
    messageId,
    replyToCustomMessageId: '',
    text: '目前位於: 板橋秀泰',
    payload: null,
    isDebug: false,
    idx: 0,
    template: {
      type: MessageTemplateType.HINT,
      text: '目前位於: 板橋秀泰',
      quickReplies,
    },
  });
}

function createButtonTemplateExample(): ConversationMessage {
  const messageId = nanoid();

  return createBaseTemplateExample({
    messageId,
    replyToCustomMessageId: '',
    text: '死侍與金鋼狼',
    payload: null,
    isDebug: false,
    idx: 0,
    template: {
      type: MessageTemplateType.BUTTON,
      title: '死侍與金鋼狼',
      text: '演員: 萊恩·雷諾斯、休·傑克曼\\n導演: 薛恩·李維\\n簡介: 本片是《死侍》系列加入漫威電影宇宙的第一炮，並象徵X戰警正式「回歸」漫威懷抱。',
      thumbnailImageUrl:
        'https://capi.showtimes.com.tw/assets/57/576ed12bedb3ae6e548c6bfa50e9cbb5.jpg',
      imageAspectRatio: 'rectangle',
      imageSize: 'cover',
      imageBackgroundColor: '#FFFFFF',
      buttons: [
        {
          label: '訂票去',
          action: {
            type: 'uri',
            uri: 'https://www.showtimes.com.tw/programs/11502',
          },
        },
        {
          label: '觀看預告片',
          action: {
            type: 'uri',
            uri: 'https://youtu.be/O4PlaF13SH4',
          },
        },
      ],
      defaultAction: {
        type: 'uri',
        uri: 'https://www.showtimes.com.tw/programs/11502',
      },
      quickReplies,
    },
  });
}

function createCarouselTemplateExample(): ConversationMessage {
  const messageId = nanoid();

  return createBaseTemplateExample({
    messageId,
    replyToCustomMessageId: '',
    text: '電影推薦',
    payload: null,
    isDebug: false,
    idx: 0,
    template: {
      type: MessageTemplateType.CAROUSEL,
      quickReplies,
      columns: [
        {
          title: '死侍與金鋼狼',
          text: '演員: 萊恩·雷諾斯、休·傑克曼',
          thumbnailImageUrl:
            'https://capi.showtimes.com.tw/assets/57/576ed12bedb3ae6e548c6bfa50e9cbb5.jpg',
          imageAspectRatio: 'rectangle',
          imageSize: 'cover',
          imageBackgroundColor: '#FFFFFF',
          buttons: [
            {
              label: '訂票去',
              action: {
                type: 'uri',
                uri: 'https://www.showtimes.com.tw/programs/11502',
              },
            },
          ],
          defaultAction: {
            type: 'uri',
            uri: 'https://www.showtimes.com.tw/programs/11502',
          },
        },
        {
          title: '腦筋急轉彎2',
          text: '一部溫馨有趣的動畫電影',
          thumbnailImageUrl:
            'https://capi.showtimes.com.tw/assets/76/76b16701a7ea36de21e11bc8d85aa95a.jpg',
          imageAspectRatio: 'rectangle',
          imageSize: 'cover',
          imageBackgroundColor: '#FFFFFF',
          buttons: [
            {
              label: '訂票去',
              action: {
                type: 'uri',
                uri: 'https://www.showtimes.com.tw/programs/11499',
              },
            },
          ],
          defaultAction: {
            type: 'uri',
            uri: 'https://www.showtimes.com.tw/programs/11499',
          },
        },
      ],
    },
  });
}

function createImageTemplateExample(): ConversationMessage {
  const messageId = nanoid();

  return createBaseTemplateExample({
    messageId,
    replyToCustomMessageId: '',
    text: '圖片範例',
    payload: null,
    isDebug: false,
    idx: 0,
    template: {
      type: MessageTemplateType.IMAGE,
      originalContentUrl:
        'https://capi.showtimes.com.tw/assets/57/576ed12bedb3ae6e548c6bfa50e9cbb5.jpg',
      previewImageUrl:
        'https://capi.showtimes.com.tw/assets/57/576ed12bedb3ae6e548c6bfa50e9cbb5.jpg',
      quickReplies: [],
    },
  });
}

const initMessages: ConversationMessage[] = [
  createTextTemplateExample(),
  createMathTemplateExample(),
  createHintTemplateExample(),
  createButtonTemplateExample(),
  createCarouselTemplateExample(),
  createImageTemplateExample(),
];

export default function TemplatesPage(): JSX.Element {
  const [customChannelId, setCustomChannelId] = useState<string>('');

  useEffect(() => {
    setCustomChannelId(nanoid());
  }, []);

  if (!customChannelId) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>載入中...</div>
      </div>
    );
  }

  return (
    <Chatbot
      config={{
        botProviderEndpoint:
          process.env.NEXT_PUBLIC_BOT_PROVIDER_ENDPOINT ||
          'http://localhost:4301/api/mock-sse',
        apiKey: process.env.NEXT_PUBLIC_API_KEY || 'mock-api-key',
      }}
      customChannelId={customChannelId}
      title="消息模板展示"
      theme={theme}
      fullScreen={true}
      initMessages={initMessages}
      avatar="https://img.icons8.com/fluency/48/bot.png"
      enableUpload={false}
      enableExport
    />
  );
}
