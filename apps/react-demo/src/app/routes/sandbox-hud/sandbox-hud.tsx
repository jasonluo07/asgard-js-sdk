import { ReactNode, useRef } from 'react';
import { Chatbot, ChatbotRef } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './sandbox-hud.module.scss';

// F-018 — the scoped mock (customChannelId `sandbox-hud-demo`) streams sandbox.launch → (gap) →
// sandbox.ready around a short message run. A "cold" send holds launch >1s so the HUD floats into the
// chat view's bottom-right then rings out on ready; a "warm" send reaches ready <1s so the HUD stays
// silent. The seam run indicator lights the whole time — the two are independent and coexist.
const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

export function SandboxHud(): ReactNode {
  const chatbotRef = useRef<ChatbotRef>(null);

  const send = (text: string): void => {
    chatbotRef.current?.serviceContext?.sendMessage?.({ text });
  };

  return (
    <DemoWrapper
      title="Sandbox Launch HUD (F-018)"
      description="按「冷啟動」送出：後端串 sandbox.launch，撐過 1s 門檻仍未 ready，chat view 右下角浮出獨立的「Sandbox 啟動中」HUD（grid 晶片掃描、單一 accent、pointer-events:none、不侵入宿主頁面）；ready 到達後切「Sandbox 就緒」+ 擴散環，播收尾拍再慢速淡出。按「熱啟動」：<1s 就 ready，HUD 全程靜音不打擾。整段 run 期間，footer 上緣的連線進度線（RunningIndicator）獨立亮起，與 HUD 互不干擾。可在系統開啟「減少動態效果」後重試，觀察 HUD 退成靜態組合圖。"
    >
      <div className={styles.controls}>
        <button type="button" className={styles.button} onClick={(): void => send('冷啟動 sandbox（模擬 >1s 冷啟動）')}>
          冷啟動（launch 卡 ~2.6s → 浮出 HUD → ready 收尾）
        </button>
        <button type="button" className={styles.button} onClick={(): void => send('熱啟動 warm sandbox（<1s ready）')}>
          熱啟動（1s 內就 ready → HUD 全程靜音）
        </button>
        <span className={styles.hint}>冷啟動看右下角 HUD；熱啟動應完全不閃</span>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          ref={chatbotRef}
          title="Sandbox HUD Demo"
          config={config}
          customChannelId="sandbox-hud-demo"
          locale="zh-TW"
          inputPlaceholder="或直接送訊息（含「熱」= 熱啟動）…"
        />
      </div>
    </DemoWrapper>
  );
}
