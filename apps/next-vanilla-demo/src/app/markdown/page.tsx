'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  EventType,
  MessageTemplateType,
  ConversationMessage,
} from '@asgard-js/core';
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

const markdownContent = `# Markdown Demo

這是一個使用 Chatbot 展示的 Markdown 頁面。

## 功能特色

- **粗體文字**
- *斜體文字*
- ~~刪除線~~
- \`程式碼\`

## 程式碼區塊

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

## 引用

> 這是一段引用文字。
> 可以跨越多行。

## 清單

### 無序清單
- 項目 1
- 項目 2
  - 子項目 2.1
  - 子項目 2.2
- 項目 3

### 有序清單
1. 第一項
2. 第二項
3. 第三項

## 表格

| 名稱 | 類型 | 說明 |
|------|------|------|
| next-demo | Tailwind | 使用 Tailwind CSS |
| next-vanilla-demo | CSS Modules | 使用原生 CSS |

## 結論

這是 Next.js 15 App Router 使用 Asgard Chatbot 渲染的 Markdown 展示頁面。`;

const initMessages: ConversationMessage[] = [
  {
    type: 'bot',
    messageId: 'markdown-demo',
    eventType: EventType.MESSAGE_COMPLETE,
    isTyping: false,
    typingText: null,
    message: {
      messageId: 'markdown-demo',
      replyToCustomMessageId: '',
      text: markdownContent,
      payload: null,
      isDebug: false,
      idx: 0,
      template: {
        type: MessageTemplateType.TEXT,
        text: markdownContent,
        quickReplies: [
          { text: '顯示更多範例' },
          { text: '返回首頁' },
        ],
      },
    },
    time: new Date(),
  },
];

export default function MarkdownPage(): JSX.Element {
  const [customChannelId, setCustomChannelId] = useState<string>('');

  useEffect(() => {
    setCustomChannelId(crypto.randomUUID());
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
      title="Markdown 展示"
      theme={theme}
      fullScreen={true}
      initMessages={initMessages}
      avatar="https://img.icons8.com/fluency/48/bot.png"
      enableUpload={false}
      enableExport
    />
  );
}
