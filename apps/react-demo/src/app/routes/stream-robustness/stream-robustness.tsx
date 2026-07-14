import { ReactNode, useRef } from 'react';
import { Chatbot, ChatbotRef } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './stream-robustness.module.scss';

// F-011 — each button sends a keyword message; the scoped mock (customChannelId `stream-robustness-demo`)
// replays one adversarial SSE frame order for it. The bot message must render correctly under every one:
// no dropped text, no stuck typing, no blanked bubble, no crash.
const SEQUENCES: { keyword: string; label: string; hint: string }[] = [
  { keyword: 'complete-only', label: '只有 complete', hint: 'R1 · 無 start/delta 直達 complete → 直接呈現終態' },
  { keyword: 'delta-before-start', label: 'delta 早於 start', hint: 'R2 · 缺 start → lazy-init 累加，不丟字' },
  { keyword: 'start-after-complete', label: 'complete 後又來 start·delta', hint: 'R3 · 終態防回退，遲到 frame 被忽略' },
  { keyword: 'dup-complete', label: '重複 complete', hint: 'R4 · 冪等，只有一則' },
  { keyword: 'no-template', label: 'complete 無 template', hint: 'R5 · fallback 顯示純文字，非空白' },
];

const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

export function StreamRobustness(): ReactNode {
  const chatbotRef = useRef<ChatbotRef>(null);

  const fire = (keyword: string): void => {
    chatbotRef.current?.serviceContext?.sendMessage?.({ text: keyword });
  };

  return (
    <DemoWrapper
      title="Message Stream Assembly Robustness (F-011)"
      description="按各按鈕觸發一種病態 SSE frame 順序（缺前綴 / 亂序 / 重複）；bot 訊息應在每種順序下都正確組裝 —— 不掉字、不卡 typing、不空白、不 crash。這是 conversation.ts reducer 的健壯性，單元測試為主證據，這裡目視佐證。"
    >
      <div className={styles.controls}>
        {SEQUENCES.map(s => (
          <button key={s.keyword} type="button" className={styles.button} onClick={() => fire(s.keyword)}>
            <span className={styles.button__label}>{s.label}</span>
            <span className={styles.button__hint}>{s.hint}</span>
          </button>
        ))}
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          ref={chatbotRef}
          title="Stream Robustness Demo"
          config={config}
          customChannelId="stream-robustness-demo"
          inputPlaceholder="或按上方按鈕觸發病態順序…"
        />
      </div>
    </DemoWrapper>
  );
}
