import { ReactNode, useState } from 'react';
import { Chatbot, ChatbotTheme } from '@asgard-js/react';
import '@asgard-js/react/style';
import { ConversationMessage, EventType, MessageTemplateType } from '@asgard-js/core';
import { nanoid } from 'nanoid';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './markdown-theme.module.scss';

// Markdown 的顏色（blockquote、hr、inline code 底、code block 底、表格框線／表頭／斑馬紋）
// 應該跟著 theme 的 `backgroundColor` / `borderColor` / `inactiveColor` /
// `primaryComponent.secondaryColor` 走。這條 route 用同一段內文比對三種情境：
//   Default（不傳 theme）→ 必須維持原本寫死的暗色，切換前後零變化
//   Light / Dark（傳 theme）→ markdown 必須跟著明暗一起翻
const DEMO_TEXT = `## Markdown 主題連動

一般段落文字，含 \`inline code\` 與[連結](https://asgard-ai.com)。

> Blockquote：淺色主題下必須讀得到，不能是白字白底。

---

\`\`\`ts
const answer: number = 42;
\`\`\`

| 產品 | 價格 | 庫存 |
| --- | --- | --- |
| 滑鼠 | 300 | 50 |
| 鍵盤 | 800 | 30 |
| 螢幕 | 5000 | 12 |
`;

const PRESETS: { name: string; theme: ChatbotTheme }[] = [
  { name: 'Default (no theme)', theme: {} },
  {
    name: 'Light',
    theme: {
      chatbot: {
        backgroundColor: '#fafafa',
        borderColor: '#e5e5e5',
        inactiveColor: '#737373',
        primaryComponent: { mainColor: '#171717', secondaryColor: '#171717' },
      },
      botMessage: { color: '#171717', backgroundColor: '#ffffff' },
      userMessage: { color: '#fafafa', backgroundColor: '#171717' },
    },
  },
  {
    name: 'Dark',
    theme: {
      chatbot: {
        backgroundColor: '#141414',
        borderColor: '#434343',
        inactiveColor: '#a3a3a3',
        primaryComponent: { mainColor: '#f6c814', secondaryColor: '#fafafa' },
      },
      botMessage: { color: '#fafafa', backgroundColor: '#1f1f1f' },
      userMessage: { color: '#000000', backgroundColor: '#f6c814' },
    },
  },
];

function createDemoMessage(): ConversationMessage {
  const messageId = nanoid();
  const message = {
    text: DEMO_TEXT,
    template: {
      type: MessageTemplateType.TEXT as const,
      text: DEMO_TEXT,
      quickReplies: [],
    },
    messageId,
    replyToCustomMessageId: '',
    payload: undefined,
    isDebug: false,
    idx: 0,
  };

  return {
    type: 'bot',
    messageId,
    isTyping: false,
    typingText: '',
    eventType: EventType.MESSAGE_COMPLETE,
    time: new Date(),
    message,
    raw: JSON.stringify({
      eventType: EventType.MESSAGE_COMPLETE,
      fact: { messageComplete: { message } },
    }),
  };
}

export function MarkdownTheme(): ReactNode {
  const [presetName, setPresetName] = useState(PRESETS[0].name);
  const preset = PRESETS.find(p => p.name === presetName) ?? PRESETS[0];
  const initMessages = [createDemoMessage()];

  return (
    <DemoWrapper
      title="Markdown 主題連動"
      description="切換主題，確認 markdown 的 blockquote／分隔線／程式碼底色／表格框線跟著 theme 走；Default 必須維持原本的暗色預設。"
    >
      <div className={styles.controls}>
        {PRESETS.map(p => (
          <button
            key={p.name}
            className={p.name === presetName ? styles.active : undefined}
            onClick={() => setPresetName(p.name)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          key={presetName}
          title="Markdown 主題連動"
          config={{ botProviderEndpoint: 'skip' }}
          customChannelId="markdown-theme-demo"
          initMessages={initMessages}
          autoResetChannel={false}
          theme={preset.theme}
        />
      </div>
    </DemoWrapper>
  );
}
