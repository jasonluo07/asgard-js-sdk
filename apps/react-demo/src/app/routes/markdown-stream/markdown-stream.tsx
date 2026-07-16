import { ReactNode, useRef } from 'react';
import { Chatbot, ChatbotRef } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './markdown-stream.module.scss';

// Markdown 串流渲染示範：scoped mock（customChannelId `markdown-stream-demo`）會把一段豐富 markdown
// 以細碎 delta 串流回來，讓 streamdown 一邊接收未完成的 markdown（標題／清單／表格／code fence／
// 連結）一邊漸進渲染，並驗證開頭標題沒有多餘的頂端空白。
const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

export function MarkdownStream(): ReactNode {
  const chatbotRef = useRef<ChatbotRef>(null);

  const ask = (): void => {
    chatbotRef.current?.serviceContext?.sendMessage?.({ text: '幫我分析上週的通路訂單。' });
  };

  return (
    <DemoWrapper
      title="Markdown 串流渲染"
      description="按下方按鈕送出訊息，後端會把一段豐富 markdown（標題／清單／表格／程式碼／連結）以細碎 delta 串流回來，觀察 streamdown 邊收邊漸進渲染的效果。"
    >
      <div className={styles.controls}>
        <button type="button" className={styles.button} onClick={ask}>
          觸發 markdown 串流
        </button>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          ref={chatbotRef}
          title="Markdown 串流渲染"
          config={config}
          customChannelId="markdown-stream-demo"
          theme={{ chatbot: { width: '100%', height: '80vh' } }}
          inputPlaceholder="或直接送任意訊息觸發串流…"
        />
      </div>
    </DemoWrapper>
  );
}
