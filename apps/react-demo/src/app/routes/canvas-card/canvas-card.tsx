import { ReactNode, useState } from 'react';
import { Chatbot, Locale } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './canvas-card.module.scss';

// F-030 — the canvas card. The fragment is untrusted model-generated markup, so it renders inside an
// iframe sandboxed *without* same-origin and fed by srcdoc, with a `default-src 'none'` CSP. It also
// streams: the mock replays it at the cadence measured on the product path (~7 bytes per delta, ~25ms
// apart), which is why the card spends its first seconds in the skeleton state — the fragment is
// style-first, so its first half has nothing to look at.
//
// **UI acceptance here must be headed.** A headed browser does not re-navigate when `srcdoc` is
// reassigned after mount; headless does. That difference once let nine passing headless scenarios
// coexist with a blank card for every real user.

const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

const SCRIPTS: { label: string; hint: string }[] = [
  { label: '打「畫」', hint: '完整串流：骨架 → 內容逐段浮現 → 完成後跑片段自己的 script（UC-051）' },
  { label: '打「重播」', hint: '只有 complete、沒有任何 delta —— 重新進房會看到的樣子（UC-052）' },
  { label: '打「壞掉」', hint: 'delta 之後來一個沒有 template 的 complete → 整張卡消失，不留殘骸（UC-053）' },
  { label: '打「長」', hint: '片段高過 520px 上限 → 卡片停在上限、內容在卡內捲動，不把對話擠掉（AC13）' },
  {
    label: '打「亂寫」',
    hint: 'agent 不守規矩：片段裡重複寫標題、硬寫色碼、標籤沒關 —— 看災情停不停得住（AC17）',
  },
];

const LOCALES: Locale[] = ['en-US', 'zh-TW', 'ja-JP'];

const WIDE_THEME = { chatbot: { width: '100%', height: '100%' } };

export function CanvasCardRoute(): ReactNode {
  const [locale, setLocale] = useState<Locale>('zh-TW');

  return (
    <DemoWrapper
      title="Canvas Card (F-030)"
      description="Agent 需要把東西畫出來而不是描述它時，會寫一段自給自足的 HTML/SVG 片段。它是模型產生的不可信內容，所以關在 sandboxed iframe 裡（只給 allow-scripts、絕不加 allow-same-origin），並用 default-src 'none' 的 CSP 讓它連不出去。內容是串流來的，用 morph 逐節點更新而不是重設 innerHTML。"
    >
      <div className={styles.stack}>
        <div className={styles.legend}>
          <div className={styles.legend__title}>三個腳本（打字內容決定走哪一條）</div>
          <ul className={styles.scripts}>
            {SCRIPTS.map(script => (
              <li key={script.label}>
                <strong>{script.label}</strong>
                <span>{script.hint}</span>
              </li>
            ))}
          </ul>
          <p className={styles.hint}>
            片段只用注入的五個 token（<code>--canvas-fg / -bg / -accent / -muted / -border</code>）——
            這是與後端工具說明的契約 · 片段刻意不重複標題（標題由卡片 chrome 顯示）· 高度由 iframe 內 ResizeObserver
            回報、上限 520px 後在卡內捲動
          </p>
          <div className={styles.locales}>
            <span>locale：</span>
            {LOCALES.map(item => (
              <button
                type="button"
                key={item}
                className={locale === item ? styles.active : undefined}
                onClick={(): void => setLocale(item)}
              >
                {item}
              </button>
            ))}
            <span className={styles.localeHint}>切換只影響卡片外框（繪製中／畫布）—— 片段內容不翻譯。</span>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.chatbotWide}>
            <div className={styles.sizeLabel}>寬版 —— 消費端實際的掛法</div>
            <div className={styles.wideBox}>
              <Chatbot
                title="資料架構助理"
                config={config}
                customChannelId="canvas-demo"
                inputPlaceholder="輸入你的問題"
                locale={locale}
                theme={WIDE_THEME}
              />
            </div>
          </div>

          <div className={styles.chatbotNarrow}>
            <div className={styles.sizeLabel}>窄版 375×640 —— SDK 預設 theme</div>
            <div className={styles.narrowBox}>
              <Chatbot
                title="資料架構助理"
                config={config}
                customChannelId="canvas-demo-narrow"
                inputPlaceholder="輸入你的問題"
                locale={locale}
              />
            </div>
          </div>
        </div>
      </div>
    </DemoWrapper>
  );
}
