import { ReactNode, useRef } from 'react';
import { Chatbot, ChatbotRef } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './run-indicator.module.scss';

// F-003 — the scoped mock (customChannelId `run-indicator-demo`) streams one connection carrying two
// messages with a deliberate gap between them and a complete→done tail. The run indicator sits at the
// thread↔input seam and is bound to the whole connection (`isConnecting`): it stays lit continuously
// across both messages and the gap (no flicker, no disappearance), then turns off at run.done. The
// input is disabled while the run is in progress.
const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

export function RunIndicator(): ReactNode {
  const chatbotRef = useRef<ChatbotRef>(null);

  const start = (): void => {
    chatbotRef.current?.serviceContext?.sendMessage?.({ text: '開始一段多訊息 run' });
  };

  return (
    <DemoWrapper
      title="Run Indicator at the Seam (F-003)"
      description="按「開始 run」送出一則訊息，後端會在同一條連線內串三則 bot 訊息、中間留兩段等待空檔、最後 complete→done 尾段（整段約 10 秒）。交界（thread↔輸入）的進度線綁整條連線（isConnecting）：整段 run 持續亮、跨訊息與空檔都不閃爍/不消失，run.done 才熄；run 期間輸入停用。舊的 per-message 三點動畫與 placeholder 已移除，串流文字仍即時顯示。"
    >
      <div className={styles.controls}>
        <button type="button" className={styles.button} onClick={start}>
          開始 run（約 10 秒：三則訊息 + 兩段空檔 + 尾段）
        </button>
        <span className={styles.hint}>觀察 footer 上緣的進度線整段 run（約 10 秒）不中斷</span>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          ref={chatbotRef}
          title="Run Indicator Demo"
          config={config}
          customChannelId="run-indicator-demo"
          inputPlaceholder="run 期間此輸入框會停用…"
        />
      </div>
    </DemoWrapper>
  );
}
