import { ReactNode, useRef } from 'react';
import { Chatbot, ChatbotRef } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './stream-resume.module.scss';

// F-002 — the scoped mock (customChannelId `stream-resume-demo`) drops the socket mid-stream for the
// resume scenario, and fails before 200 for the no-cursor scenario. Other routes are untouched.
const SCENARIOS: { keyword: string; label: string; hint: string }[] = [
  {
    keyword: 'resume-drop',
    label: '透明續傳（中途斷線）',
    hint: 'UC-003 · 串到一半砍連線 → Last-Event-ID 自動重連續傳，不缺不重',
  },
  {
    keyword: 'no-cursor',
    label: '無 cursor 失敗（不重送）',
    hint: 'UC-004 · 200 前失敗 → surface 錯誤，不 re-POST（防重複派送）',
  },
];

const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

export function StreamResume(): ReactNode {
  const chatbotRef = useRef<ChatbotRef>(null);

  const fire = (keyword: string): void => {
    chatbotRef.current?.serviceContext?.sendMessage?.({ text: keyword });
  };

  return (
    <DemoWrapper
      title="Last-Event-ID Resume (F-002)"
      description="「透明續傳」讓 mock 串到一半切斷連線；@microsoft/fetch-event-source 帶著 Last-Event-ID 自動重連，後端從 cursor 續傳 —— 訊息接續、不缺漏、不重複。「無 cursor 失敗」在 200 前就失敗，SDK 不重送 POST、錯誤如實 surface（防後端重複派送）。開 DevTools Network 可看到重連請求帶 last-event-id header。"
    >
      <div className={styles.controls}>
        {SCENARIOS.map(s => (
          <button key={s.keyword} type="button" className={styles.button} onClick={() => fire(s.keyword)}>
            <span className={styles.button__label}>{s.label}</span>
            <span className={styles.button__hint}>{s.hint}</span>
          </button>
        ))}
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          ref={chatbotRef}
          title="Resume Demo"
          config={config}
          customChannelId="stream-resume-demo"
          inputPlaceholder="或按上方按鈕觸發斷線續傳 / 無 cursor 失敗…"
        />
      </div>
    </DemoWrapper>
  );
}
