'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RemoveScroll } from 'react-remove-scroll';
import { ChatIcon } from '~/icons';

// 動態導入 Chatbot 以避免 SSR 問題
const Chatbot = dynamic(
  () => import('@asgard-js/react').then((mod) => ({ default: mod.Chatbot })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">載入中...</div>
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

export default function SimpleChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [customChannelId, setCustomChannelId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setCustomChannelId(crypto.randomUUID());

    // 檢查螢幕寬度
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // 初始檢查
    checkScreenSize();

    // 監聽視窗大小變化
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);


  return (
    <>
      {/* 聊天按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-12 h-12
          bg-blue-600 hover:bg-blue-700
          text-white
          rounded-full
          shadow-lg hover:shadow-xl
          transition-all duration-200 ease-in-out
          flex items-center justify-center
          hover:outline-none hover:ring-2 hover:ring-blue-500 hover:ring-offset-2
          cursor-pointer
        "
        aria-label={isOpen ? '關閉 AI 助手' : '開啟 AI 助手'}
      >
        <ChatIcon />
      </button>

      {/* 聊天框 */}
      {isOpen && customChannelId && (
        <RemoveScroll enabled={isMobile && isOpen}>
          <div className={isMobile ? "" : "absolute bottom-16 right-0"}>
            <Chatbot
              config={{
                botProviderEndpoint:
                  process.env.NEXT_PUBLIC_BOT_PROVIDER_ENDPOINT || '',
                apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
              }}
              customChannelId={customChannelId}
              title="AI 助手"
              onClose={() => setIsOpen(false)}
              theme={theme}
              fullScreen={isMobile}
            />
          </div>
        </RemoveScroll>
      )}
    </>
  );
}
