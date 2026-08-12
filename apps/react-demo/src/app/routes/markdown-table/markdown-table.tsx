import { ReactNode } from 'react';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { ConversationMessage, EventType, MessageTemplateType } from '@asgard-js/core';
import { nanoid } from 'nanoid';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './markdown-table.module.scss';

// 重現「Markdown Table 呈現失敗」：bot TEXT 訊息裡的 GFM pipe table 應該渲染成
// 有框線的表格。Streamdown 的 remarkPlugins prop 會整組覆蓋掉預設外掛，所以這段
// 也同時驗證 remark-math（$$…$$ 區塊數學）與 remark-cjk-friendly（中文緊貼粗體）。
const DEMO_TEXT = `## GFM 表格回歸測試

下方應該渲染成有框線的表格，而不是擠成一團的純文字：

| 產品 | 價格 | 庫存 |
| --- | --- | --- |
| 滑鼠 | 300 | 50 |
| 鍵盤 | 800 | 30 |
| 螢幕 | 5000 | 12 |

數學（remark-math）：

$$E = mc^2$$

CJK 粗體（remark-cjk-friendly）：這是**粗體**中文。`;

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

export function MarkdownTable(): ReactNode {
  const initMessages = [createDemoMessage()];

  return (
    <DemoWrapper
      title="Markdown 表格渲染"
      description="驗證 bot TEXT 訊息裡的 GFM 表格、行內數學與 CJK 粗體是否正確渲染。"
    >
      <div className={styles.chatbotContainer}>
        <Chatbot
          title="Markdown 表格渲染"
          config={{ botProviderEndpoint: 'skip' }}
          customChannelId="markdown-table-demo"
          initMessages={initMessages}
          autoResetChannel={false}
        />
      </div>
    </DemoWrapper>
  );
}
