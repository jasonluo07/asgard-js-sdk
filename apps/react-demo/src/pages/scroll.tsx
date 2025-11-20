import { Chatbot, ChatbotRef } from '@asgard-js/react';
import { ReactNode, useCallback, useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import styles from './root.module.scss';
import { ConversationMessage, AuthState } from '@asgard-js/core';
import { nanoid } from 'nanoid';
import {
  createButtonTemplateExample,
  createCarouselTemplateExample,
  createHintTemplateExample,
  createTextTemplateExample,
  createChartTemplateExample,
  createImageTemplateExample,
  createMathTemplateExample,
} from './const';

const { VITE_API_KEY, VITE_BOT_PROVIDER_ENDPOINT } = import.meta.env;

export function ScrollTest(): ReactNode {
  const [customChannelId] = useState(nanoid());
  const [isOpen, setIsOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>('authenticated');
  const [useFullScreen, setUseFullScreen] = useState(true);

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

  const chatbotRef = useRef<ChatbotRef>(null);
  const fetchContextForInitialization = useCallback(() => {
    return Promise.resolve('init');
  }, []);

  const handleApiKeySubmit = useCallback(async (apiKey: string) => {
    console.log('Demo: API Key submitted:', apiKey);
    // Simulate API key validation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (apiKey === 'wrong-key') {
      setAuthState('invalidApiKey');
    } else {
      setAuthState('authenticated');
    }
  }, []);

  // 追蹤滾動位置
  useEffect(() => {
    const updateScrollPosition = () => {
      const scrollElement = document.getElementById('scroll-position');
      if (scrollElement) {
        scrollElement.textContent = Math.round(window.scrollY).toString();
      }
    };

    window.addEventListener('scroll', updateScrollPosition);
    updateScrollPosition();

    return () => {
      window.removeEventListener('scroll', updateScrollPosition);
    };
  }, []);

  return (
    <>
      {/* 添加可滾動的內容來測試滾動問題 */}
      <div style={{
        height: '200vh',
        background: 'linear-gradient(to bottom, #f0f0f0, #e0e0e0)',
        padding: '2rem',
      }}>
        <h1 style={{ marginBottom: '2rem' }}>測試頁面滾動問題</h1>
        
        <div style={{ marginBottom: '1rem' }}>
          <p>這是頁面頂部的內容。</p>
          <p>請往下滾動頁面到中間或底部位置。</p>
        </div>
        
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{
            padding: '1rem',
            margin: '1rem 0',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3>區塊 {i + 1}</h3>
            <p>這是測試內容區塊。當你滾動到頁面中間或底部後，點擊「開啟 Chatbot」按鈕。</p>
            <p>如果問題存在，頁面會自動滾動到最上方。</p>
          </div>
        ))}
        
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 10
        }}>
          <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>目前滾動位置: <span id="scroll-position">0</span>px</p>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <input
              type="checkbox"
              checked={useFullScreen}
              onChange={(e) => setUseFullScreen(e.target.checked)}
            />
            使用全螢幕模式
          </label>
          <button
            style={{
              padding: '0.5rem 1rem',
              background: isOpen ? '#dc2626' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={() => {
              console.log('Toggle chatbot, current scroll:', window.scrollY);
              setIsOpen(!isOpen);
              // 延遲一點檢查滾動位置是否改變
              setTimeout(() => {
                console.log('After toggle, scroll position:', window.scrollY);
              }, 100);
            }}
          >
            {isOpen ? '關閉' : '開啟'} Chatbot
          </button>
        </div>
      </div>

      {/* 移除原本的 Toggle 按鈕，已整合到底部控制面板 */}
      
      <div className={styles.root__debug_panel}>
        <button
          className={clsx(styles.root__debug_button, styles['root__debug_button--authenticated'])}
          onClick={() => setAuthState('authenticated')}
        >
          Authenticated
        </button>
        <button
          className={clsx(styles.root__debug_button, styles['root__debug_button--need-api-key'])}
          onClick={() => setAuthState('needApiKey')}
        >
          Need API Key
        </button>
        <button
          className={clsx(styles.root__debug_button, styles['root__debug_button--loading'])}
          onClick={() => setAuthState('loading')}
        >
          Loading
        </button>
        <button
          className={clsx(styles.root__debug_button, styles['root__debug_button--invalid-api-key'])}
          onClick={() => setAuthState('invalidApiKey')}
        >
          Invalid API Key
        </button>
      </div>
      <div style={{ width: '800px', position: 'relative' }}>
        <div
          style={{ position: 'relative', display: isOpen ? 'block' : 'none' }}
        >
          {authState === 'authenticated' && (
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
                chatbotRef.current?.serviceContext?.sendMessage?.({
                  text: 'Hello',
                })
              }
            >
              Send a message from outside of chatbot
            </button>
          )}
          <Chatbot
            ref={chatbotRef}
            asyncInitializers={{
              fetchContextForInitialization,
            }}
            fullScreen={useFullScreen}
            title="Preview"
            config={{
              botProviderEndpoint: VITE_BOT_PROVIDER_ENDPOINT,
              apiKey: VITE_API_KEY,
            }}
            avatar="./showtime.webp"
            enableLoadConfigFromService={true}
            maintainConnectionWhenClosed={true}
            loadingComponent={<div>Custom Loading...</div>}
            botTypingPlaceholder="typing"
            customChannelId={customChannelId}
            initMessages={authState === 'authenticated' ? initMessages : []}
            
            // Auth state prop
            authState={authState}
            onApiKeySubmit={handleApiKeySubmit}
            onClose={() => {
              setIsOpen(false);
            }}
            theme={{
              "botMessage": {
                "backgroundColor": "#8728a6",
                "carouselButtonBackgroundColor": "#333333",
                "color": "#FFFFFF"
              },
              "chatbot": {
                "backgroundColor": "#ea8585",
                "borderColor": "#434343",
                "inactiveColor": "#8C8C8C",
                "primaryComponent": {
                  "mainColor": "#ebe246",
                  "secondaryColor": "#FFFFFF"
                }
              },
              "userMessage": { "backgroundColor": "#1f2d67", "color": "#12cc27" }
            }}
          />
        </div>
      </div>
    </>
  );
}