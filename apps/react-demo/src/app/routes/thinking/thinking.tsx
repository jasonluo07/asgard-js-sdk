import { ReactNode, useRef } from 'react';
import { Chatbot, ChatbotRef } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './thinking.module.scss';

// F-001 — the scoped mock (customChannelId `thinking-demo`) streams a reasoning sequence
// (thinking.start → delta×N → complete) then the answer. Send any message to trigger it and watch:
//  - streaming: the block auto-expands, header "Thinking…", reasoning scrolls in a bottom-anchored
//    window with a top fade once it overflows;
//  - completed: it collapses to "Thought for a moment" — click to expand, "顯示更多 / 顯示較少".
const QUESTIONS = ['這幾個通路裡，哪個成長最快？', '幫我分析上週各通路的訂單，排出前幾名。'];

const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

export function Thinking(): ReactNode {
  const chatbotRef = useRef<ChatbotRef>(null);

  const ask = (text: string): void => {
    chatbotRef.current?.serviceContext?.sendMessage?.({ text });
  };

  return (
    <DemoWrapper
      title="Thinking Message Display (F-001)"
      description="送出問題後，後端會先串一段 extended-thinking（asgard.message.thinking.*）再給答案。串流中 thinking block 自動展開、標頭「Thinking…」、推理走底部錨定自動向下捲的視窗（溢出時上緣漸層遮罩）；完成後收合成固定「Thought for a moment」（不計耗時），可展開看完整推理並「顯示更多 / 顯示較少」。"
    >
      <div className={styles.controls}>
        {QUESTIONS.map(q => (
          <button key={q} type="button" className={styles.button} onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          ref={chatbotRef}
          title="Thinking Demo"
          config={config}
          customChannelId="thinking-demo"
          inputPlaceholder="或按上方問題觸發 thinking 串流…"
        />
      </div>
    </DemoWrapper>
  );
}
