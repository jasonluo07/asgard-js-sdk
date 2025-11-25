'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { RemoveScroll } from 'react-remove-scroll';
import { EventType, MessageTemplateType, ConversationMessage, SseResponse } from '@asgard-js/core';
import type { ChatbotRef } from '@asgard-js/react';
import { nanoid } from 'nanoid';
import { ChatIcon } from '~/icons';
import QuickQuestionButtons from './QuickQuestionButtons';
import styles from './SimpleChatbot.module.css';

const Chatbot = dynamic(() => import('@asgard-js/react').then(mod => ({ default: mod.Chatbot })), {
  ssr: false,
  loading: () => (
    <div className={styles.loading}>
      <div className={styles.loadingText}>載入中...</div>
    </div>
  ),
});

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

const initMessages: ConversationMessage[] = [
  {
    type: 'bot',
    messageId: 'welcome-msg',
    eventType: EventType.MESSAGE_COMPLETE,
    isTyping: false,
    typingText: null,
    message: {
      messageId: 'welcome-msg',
      replyToCustomMessageId: '',
      text: '我是秀泰影城 / 生活常見問答 AI，我可以回答你各項關於秀泰商場 / 影城相關的問題，你可以問我任何問題，我會盡力回答你。(目前資料更新至 2024/08)',
      payload: null,
      isDebug: false,
      idx: 0,
      template: {
        type: MessageTemplateType.TEXT,
        text: '我是秀泰影城 / 生活常見問答 AI，我可以回答你各項關於秀泰商場 / 影城相關的問題，你可以問我任何問題，我會盡力回答你。(目前資料更新至 2024/08)',
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
];

export default function SimpleChatbot(): JSX.Element {
  const chatbotRef = useRef<ChatbotRef>(null);
  const questionToSendRef = useRef<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [customChannelId, setCustomChannelId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setCustomChannelId(nanoid());

    const checkScreenSize = (): void => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const handleQuestionClick = (question: string): void => {
    if (!isOpen) {
      questionToSendRef.current = question;
      setIsOpen(true);
    } else {
      chatbotRef.current?.serviceContext?.sendMessage?.({
        text: question,
      });
    }
  };

  const handleSseMessage = (response: SseResponse<EventType>): void => {
    if (questionToSendRef.current && response.eventType === EventType.DONE) {
      const textToSend = questionToSendRef.current.trim();

      const waitAndSend = (): void => {
        if (chatbotRef.current?.serviceContext?.isConnecting) {
          setTimeout(waitAndSend, 0);
        } else if (textToSend && chatbotRef.current?.serviceContext?.sendMessage) {
          chatbotRef.current.serviceContext.sendMessage({ text: textToSend });
        }
      };

      if (!chatbotRef.current?.serviceContext?.isConnecting && textToSend) {
        chatbotRef.current?.serviceContext?.sendMessage?.({ text: textToSend });
      } else {
        waitAndSend();
      }

      questionToSendRef.current = null;
    }
  };

  return (
    <>
      <QuickQuestionButtons onQuestionClick={handleQuestionClick} />

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.button}
        aria-label={isOpen ? '關閉 AI 助手' : '開啟 AI 助手'}
      >
        <ChatIcon />
      </button>

      {isOpen && customChannelId && (
        <RemoveScroll enabled={isMobile && isOpen}>
          <div className={isMobile ? '' : styles.chatbotContainer}>
            <Chatbot
              ref={chatbotRef}
              config={{
                botProviderEndpoint:
                  process.env.NEXT_PUBLIC_BOT_PROVIDER_ENDPOINT || 'http://localhost:4301/api/mock-sse',
                apiKey: process.env.NEXT_PUBLIC_API_KEY || 'mock-api-key',
              }}
              onSseMessage={handleSseMessage}
              customChannelId={customChannelId}
              title="測試人員"
              onClose={() => setIsOpen(false)}
              theme={theme}
              fullScreen={isMobile}
              initMessages={initMessages}
              avatar="https://img.icons8.com/fluency/48/bot.png"
              enableUpload={true}
              enableExport
            />
          </div>
        </RemoveScroll>
      )}
    </>
  );
}
