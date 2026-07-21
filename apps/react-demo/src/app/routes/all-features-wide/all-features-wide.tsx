import { ReactNode, useState } from 'react';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import { SHOWCASE_THEME_PRESETS } from '../../components/showcase-theme-presets';
import styles from './all-features-wide.module.scss';

// Big-layout variant of /all-features — the exact same `all-features-demo` mock stream, but the
// <Chatbot> fills the whole content area (roomier, good for presenting/projecting) instead of the
// compact side-by-side card. /all-features is untouched; this only adds a second, larger view.
const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

type Locale = 'zh-TW' | 'en-US' | 'ja-JP';
const LOCALES: Locale[] = ['zh-TW', 'en-US', 'ja-JP'];

export function AllFeaturesWideRoute(): ReactNode {
  const [locale, setLocale] = useState<Locale>('zh-TW');
  const [runKey, setRunKey] = useState(0);
  const [themeIdx, setThemeIdx] = useState(0);

  const preset = SHOWCASE_THEME_PRESETS[themeIdx];
  // Merge the preset's primary colors with the big-layout width/height override (deepMergeTheme keeps
  // the other chatbot theme defaults). Theme changes re-render live — no remount, so the run isn't replayed.
  const theme = { ...preset.config, chatbot: { ...preset.config.chatbot, width: '100%', height: '100%' } };

  return (
    <DemoWrapper
      title="All-Features Showcase — Wide (F-001 ~ F-018)"
      description="與 /all-features 相同的 all-features-demo 串流，但 <Chatbot> 佔滿整個內容區的大版面，適合展示 / 投影。/all-features 頁不受影響。"
    >
      <div className={styles.stack}>
        <div className={styles.bar}>
          <button type="button" className={styles.replay} onClick={() => setRunKey(k => k + 1)}>
            ↻ 重新進房（重播整段）
          </button>
          <span className={styles.localeLabel}>locale (F-005):</span>
          {LOCALES.map(l => (
            <button
              key={l}
              type="button"
              className={l === locale ? styles.localeActive : styles.locale}
              onClick={() => setLocale(l)}
            >
              {l}
            </button>
          ))}
          <span className={styles.localeLabel}>theme:</span>
          {SHOWCASE_THEME_PRESETS.map((p, i) => (
            <button
              key={p.name}
              type="button"
              className={i === themeIdx ? styles.localeActive : styles.locale}
              onClick={() => setThemeIdx(i)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className={styles.chatbotContainer}>
          <Chatbot
            key={runKey}
            title="Asgard SDK · 全功能展示（大版面）"
            config={config}
            customChannelId="all-features-demo"
            locale={locale}
            theme={theme}
            inputPlaceholder="展示串流中會停用；結束後可送訊息（會得到簡短回覆）…"
          />
        </div>
      </div>
    </DemoWrapper>
  );
}
