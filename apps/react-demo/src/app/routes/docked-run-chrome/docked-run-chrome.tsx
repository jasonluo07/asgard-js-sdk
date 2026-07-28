import { ReactNode, useState } from 'react';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './docked-run-chrome.module.scss';

// BUG-003 — the docked Task (F-010) / Subagent (F-012) panels used to render at the tail of the thread's
// scroll flow, so a streaming run (thread growing + auto-scroll following) shoved them around instead of
// leaving them in one place. They now live in a fixed strip outside the scroll box, between the thread and
// the composer. Every scenario streams the same ~15s thread and mutates the strip mid-run, which is what
// makes the positioning difference visible; the `-tall-` variant additionally pushes the strip past its
// 50% cap (so the internal scroll is exercised), and `-empty-` covers the "no strip → no gap" case.
const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

const EXPECTED = [
  'run 一開始就出現 docked 面板：Subagent 疊在 Task List 之上，釘在輸入交界（RunningIndicator seam）上方',
  '串流持續進行、thread 不斷長高並自動捲到底時，面板位置完全不動（不閃爍、不位移）',
  '手動往上捲對話：只有訊息在捲，面板固定不動（面板在 scroll 匡之外）',
  '面板與 thread 之間有一條分隔線，標出「這裡開始是固定區」',
  '面板內容中途變動（新增 task、狀態轉換）時，thread 的自動捲動不被牽動',
  '長對話下 footer 仍固定在底、thread 內部捲動（版面無回歸）',
  '切「長清單」→ 固定區封頂在 body 區的 50%、自己內部可捲，對話區永遠保住另一半，面板底部捲得到、不被裁掉',
  '切「無 run chrome」→ 整條固定區不存在、不占位、無分隔線，composer 貼齊最後一則訊息',
  '切 hideRunChrome → 同樣不 render 內建面板（consumer 自行擺放的逃生口不變）',
];

const SCENARIOS = [
  { id: 'docked-run-chrome-demo', label: '一般 run（3 個任務 + 1 個子代理）' },
  { id: 'docked-run-chrome-tall-demo', label: '長清單（超過 50% 上限，固定區內部可捲）' },
  { id: 'docked-run-chrome-empty-demo', label: '無 run chrome（固定區應完全消失）' },
] as const;

export function DockedRunChromeRoute(): ReactNode {
  const [channelId, setChannelId] = useState<string>(SCENARIOS[0].id);
  const [hideRunChrome, setHideRunChrome] = useState(false);

  return (
    <DemoWrapper
      title="Docked run-chrome positioning (BUG-003)"
      description="Task / Subagent 面板改釘在 thread 的 scroll 匡之外、composer 之上的固定區。載入頁面即開始一段約 15 秒的長串流：對話串會遠超出可視範圍並持續自動捲動，用來檢查面板是否穩定停在原位、不隨訊息捲動或串流位移。"
    >
      <div className={styles.legend}>
        <div className={styles.legend__title}>預期</div>
        <ol className={styles.legend__list}>
          {EXPECTED.map(e => (
            <li key={e}>{e}</li>
          ))}
        </ol>
        <div className={styles.controls}>
          <label className={styles.scenarioLabel}>
            情境
            <select className={styles.select} value={channelId} onChange={(e): void => setChannelId(e.target.value)}>
              {SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={styles.toggle} onClick={(): void => setHideRunChrome(v => !v)}>
            {hideRunChrome ? 'hideRunChrome: true → 切回 false' : 'hideRunChrome: false → 切成 true'}
          </button>
        </div>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          key={`${channelId}-${hideRunChrome}`}
          title="Docked run-chrome"
          config={config}
          customChannelId={channelId}
          hideRunChrome={hideRunChrome}
        />
      </div>
    </DemoWrapper>
  );
}
