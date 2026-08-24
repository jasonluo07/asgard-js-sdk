import { ReactNode, useState } from 'react';
import { Chatbot, Locale } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './attachment-rejoin.module.scss';

// asgard-js-sdk#448 — what a conversation that carried attachments looks like after a reload. The mock
// channel exists, so mounting takes the restore path and GET /message/sse replays the transcript; the
// chips you see are drawn from the `blobs` metadata the frame snapshotted, because the live fields
// (`filePreviewUrls`, `documentNames`) are supplied at send time and do not survive a reload.

const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

const TURNS: { label: string; hint: string }[] = [
  {
    label: '第 1 則（純附件，text 為空）',
    hint: 'blobs 兩筆：DOCUMENT `quarterly.txt` 與 fileName 為 null 的 IMAGE → 檔名 chip ＋ 型別替代標籤 chip。修正前這一整則訊息在歷史裡不會出現（R2 / R3 / R6）',
  },
  {
    label: '第 2 則（附件 ＋ 文字）',
    hint: 'IMAGE `revenue-chart.png` ＋ 一句話 → chip 與文字泡泡並存。Phase 1 沒有 URL，所以圖片也是 chip、不是縮圖（R2 / R3）',
  },
  {
    label: '第 3 則（舊 transcript 列）',
    hint: '只有 blobId、沒有 blobs，永遠不會回填 → 中性「附件」chip，讓泡泡存在（R4）',
  },
];

const LOCALES: Locale[] = ['en-US', 'zh-TW', 'ja-JP'];

// Both sizes at once: the SDK's default theme is a 375×640 mobile widget while every consumer mounts it
// full-bleed, and a chip row with a long file name is exactly the content that reads fine in one width
// and truncates in the other.
const WIDE_THEME = { chatbot: { width: '100%', height: '100%' } };

export function AttachmentRejoinRoute(): ReactNode {
  const [locale, setLocale] = useState<Locale>('zh-TW');

  return (
    <DemoWrapper
      title="Replayed attachments (#448)"
      description="重整之後，帶附件的歷史訊息還剩下什麼。附件的檔名與型別由後端在寫入 transcript 時快照進 asgard.message.user 的 blobs；送出當下用的本機預覽 URL 一重整就失效，所以重播只能靠這份 metadata。舊的 transcript 列只有 blob id、且不會回填，那種就畫一個中性的「附件」chip —— 至少泡泡要存在。"
    >
      <div className={styles.stack}>
        <div className={styles.legend}>
          <div className={styles.legend__title}>重播的三則使用者訊息</div>
          <ul className={styles.turns}>
            {TURNS.map(turn => (
              <li key={turn.label}>
                <strong>{turn.label}</strong>
                <span>{turn.hint}</span>
              </li>
            ))}
          </ul>
          <div className={styles.locales}>
            <span>locale：</span>
            {LOCALES.map(item => (
              <button
                key={item}
                type="button"
                className={item === locale ? styles.active : undefined}
                onClick={() => setLocale(item)}
              >
                {item}
              </button>
            ))}
            <span>替代標籤（圖片／檔案／附件）三語都有，檔名本身是內容、不翻譯。</span>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.chatbotWide}>
            <div className={styles.sizeLabel}>寬版 —— 消費端（Mimir / Sindri / Odin）實際的掛法</div>
            <div className={styles.wideBox}>
              <Chatbot
                title="帶附件的歷史對話"
                config={config}
                customChannelId="attachment-rejoin-demo"
                locale={locale}
                theme={WIDE_THEME}
              />
            </div>
          </div>

          <div className={styles.chatbotNarrow}>
            <div className={styles.sizeLabel}>窄版 375×640 —— SDK 預設 theme</div>
            <div className={styles.narrowBox}>
              <Chatbot
                title="帶附件的歷史對話"
                config={config}
                customChannelId="attachment-rejoin-demo-narrow"
                locale={locale}
              />
            </div>
          </div>
        </div>
      </div>
    </DemoWrapper>
  );
}
