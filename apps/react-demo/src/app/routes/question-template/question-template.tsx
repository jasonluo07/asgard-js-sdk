import { ReactNode, useState } from 'react';
import { ConversationMessage, EventType } from '@asgard-js/core';
import { Chatbot, Locale } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './question-template.module.scss';

// F-029 — the QUESTION card. The agent asks a multiple-choice question when it needs a decision rather
// than a guess. The card is deliberately **not** a handshake: the run that produced it has already
// ended, so submitting just folds the picks into text and posts them as an ordinary next message. The
// two things worth exercising here are the ones a live bot will not reproduce on demand — a card the
// conversation has moved past (which must collapse), and extreme string lengths.

const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

const INIT_MESSAGES: ConversationMessage[] = [
  {
    type: 'bot',
    messageId: 'q-intro',
    eventType: EventType.MESSAGE_COMPLETE,
    isTyping: false,
    typingText: null,
    message: {
      messageId: 'q-intro',
      text: '哈囉，我可以幫你決定技術選型。打「問我」給你一張表單，「一題」給單題版，「長」給極端長度版。',
    } as never,
    time: new Date(),
    raw: '',
  },
];

const SCRIPTS: { label: string; hint: string }[] = [
  { label: '打「問我」', hint: '兩題卡：單選（圓框）+ 複選（方框），每題都有「其他」自由輸入出口（R1–R3）' },
  { label: '打「一題」', hint: '單題卡 —— 最小的卡片，用來看送出鈕的 disabled 條件（R4）' },
  { label: '打「長」', hint: '極長的題目與選項字串 —— 應該換行，不可以把版面推開或水平溢出（R14）' },
  { label: '卡片出現後改打別的字', hint: '不理表單直接打字：卡片會收折成一行摘要（R9 / UC-050）' },
];

const LOCALES: Locale[] = ['en-US', 'zh-TW', 'ja-JP'];

// Both sizes at once, per FRONTEND_RULE_COMMON §4.3+: the SDK's default theme is a 375×640 mobile
// widget while every consumer mounts it full-bleed, and this card is exactly the kind of wide content
// (long option rows, a summary line that truncates) that reads fine in one and breaks in the other.
const WIDE_THEME = { chatbot: { width: '100%', height: '100%' } };

export function QuestionTemplateRoute(): ReactNode {
  const [locale, setLocale] = useState<Locale>('zh-TW');

  return (
    <DemoWrapper
      title="Question Card (F-029)"
      description="Agent 需要一個決定而不是猜測時，會送出一張選擇題卡片。它不是握手 —— 送出只是把你的選擇折成一段文字，當成下一則普通訊息送出；你也可以完全不理它、直接打字（輸入框全程可用，沒有 modal、沒有遮罩）。後面一旦有你的訊息，那張卡就收折成一行摘要，點開只能回看、不能再填。"
    >
      <div className={styles.stack}>
        <div className={styles.legend}>
          <div className={styles.legend__title}>四個腳本（打字內容決定走哪一條）</div>
          <ul className={styles.scripts}>
            {SCRIPTS.map(script => (
              <li key={script.label}>
                <strong>{script.label}</strong>
                <span>{script.hint}</span>
              </li>
            ))}
          </ul>
          <p className={styles.hint}>
            單選選了 B 會取消 A · 複選可同時選多個 · 單選題選正式選項會收掉「其他」 · 展開「其他」但沒打字不算作答 ·
            一題都沒答時送出鈕 disabled · 送出後該卡立刻收折（不等新訊息回來）· 送出的內容與你自己打字送出無法區分
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
            <span className={styles.localeHint}>
              切換只會換卡片的外框文案（其他／送出／已回覆）—— 題目與選項是後端內容，不翻譯。
            </span>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.chatbotWide}>
            <div className={styles.sizeLabel}>寬版 —— 消費端（Mimir / Sindri / Odin）實際的掛法</div>
            <div className={styles.wideBox}>
              <Chatbot
                title="技術選型助理"
                config={config}
                customChannelId="question-template-demo"
                initMessages={INIT_MESSAGES}
                inputPlaceholder="輸入你的問題"
                locale={locale}
                theme={WIDE_THEME}
              />
            </div>
          </div>

          {/* R11 — a channel the metadata gate reports as existing, so mounting replays a transcript that
              already contains two cards: one overtaken by a later user message, one last. Nothing about
              answered-ness is replayed, so what you see here is the derivation running from scratch. */}
          <div className={styles.chatbotNarrow}>
            <div className={styles.sizeLabel}>重新進房（R11）—— 歷史重播，收折狀態靠衍生重算</div>
            <div className={styles.narrowBox}>
              <Chatbot
                title="技術選型助理"
                config={config}
                customChannelId="question-template-rejoin-demo"
                inputPlaceholder="輸入你的問題"
                locale={locale}
              />
            </div>
          </div>

          <div className={styles.chatbotNarrow}>
            <div className={styles.sizeLabel}>窄版 375×640 —— SDK 預設 theme</div>
            <div className={styles.narrowBox}>
              <Chatbot
                title="技術選型助理"
                config={config}
                customChannelId="question-template-demo-narrow"
                initMessages={INIT_MESSAGES}
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
