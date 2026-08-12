import { memo, ReactNode, useCallback, useRef, useState } from 'react';
import { Channel, ConversationMessage, EventType } from '@asgard-js/core';
import { Chatbot, ChatbotRef, Locale, usePromptSuggestion } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './prompt-suggestion.module.scss';

// F-028 — the next-turn suggestion. The backend pushes `asgard.prompt_suggestion` after a reply and
// before the run terminal; the composer offers it as its placeholder and Tab adopts it. Three scripts
// are driven from what you type (see `sse-mock.ts`), because the interesting cases are the ones a live
// bot will not reproduce on demand: a silent turn, and two suggestions inside one run.
//
// The panel below the chatbot subscribes to the same store from *outside* the Chatbot via
// `usePromptSuggestion`, with a render badge — proof that this is a store (a late subscriber gets the
// current value) rather than a fire-and-forget event.

const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

const INIT_MESSAGES: ConversationMessage[] = [
  {
    type: 'bot',
    messageId: 'b1',
    eventType: EventType.MESSAGE_COMPLETE,
    isTyping: false,
    typingText: null,
    message: { messageId: 'b1', text: '您好，我是營運數據助理，想看哪一段時間的數字？' } as never,
    time: new Date(),
    raw: '',
  },
];

const SCRIPTS: { label: string; hint: string }[] = [
  { label: '一般：隨便問一句（例：上週營收如何）', hint: '回覆結束後推一則建議 → placeholder 變灰字 + ⇥ Tab（R1）' },
  { label: '打「沉默」', hint: '該輪不推建議 —— 多數情況就是這樣，placeholder 維持消費端原本的文案（R3）' },
  { label: '打「兩則」', hint: '同一個 run 連推兩則，畫面上只會看到後面那則（R10）' },
  { label: '打「很長」', hint: '推一則過長的建議 —— 應該被截斷，不可以把輸入框或版面推開' },
];

const SuggestionPanel = memo(function SuggestionPanel({ channel }: { channel: Channel | null }): ReactNode {
  const renders = useRef(0);
  renders.current += 1;
  const suggestion = usePromptSuggestion(channel);

  return (
    <div className={styles.panel}>
      <div className={styles.panel__head}>
        <span>promptSuggestion store（框外訂閱）</span>
        <span className={styles.badge}>render × {renders.current}</span>
      </div>
      {suggestion === null ? (
        <div className={styles.empty}>（沒有建議 · null —— 這是常態，不是等待中）</div>
      ) : (
        <div className={styles.value}>{suggestion}</div>
      )}
    </div>
  );
});

const LOCALES: Locale[] = ['en-US', 'zh-TW', 'ja-JP'];

export function PromptSuggestionRoute(): ReactNode {
  const chatbotRef = useRef<ChatbotRef>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [locale, setLocale] = useState<Locale>('en-US');

  const onChannelReady = useCallback((): void => {
    setChannel(chatbotRef.current?.serviceContext?.channel ?? null);
  }, []);

  return (
    <DemoWrapper
      title="Prompt Suggestion (F-028)"
      description="每輪回覆之後，後端最多推一則「下一句你大概想說什麼」。輸入框為空時它以灰字 placeholder 呈現、後面綴 ⇥ Tab；按 Tab 只是填進輸入框，送不送由你決定。沒有建議、或輸入框已經有字，placeholder 就完全照消費端原本的文案顯示。"
    >
      <div className={styles.legend}>
        <div className={styles.legend__title}>三個腳本（打字內容決定走哪一條）</div>
        <ul className={styles.scripts}>
          {SCRIPTS.map(s => (
            <li key={s.label}>
              <strong>{s.label}</strong>
              <span>{s.hint}</span>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>
          鍵盤行為要一起看：有建議時按 <kbd>Tab</kbd> 採用（焦點留在輸入框、不送出）；輸入框一有字建議就讓位、
          <kbd>Tab</kbd> 回到原本的移動焦點；<kbd>Shift</kbd>+<kbd>Tab</kbd> 一律不攔。採用後、送出後、下一輪
          開始時建議都會被清掉。重新整理不會有建議 —— 這個事件是 live-only，歷史不重播。
        </p>
        <div className={styles.locales}>
          <span>locale：</span>
          {LOCALES.map(l => (
            <button
              type="button"
              key={l}
              className={locale === l ? styles.active : undefined}
              onClick={(): void => setLocale(l)}
            >
              {l}
            </button>
          ))}
          <span className={styles.localeHint}>
            切換後把滑鼠移到輸入框看 tooltip —— 建議本身是後端內容，不隨語系翻譯。
          </span>
        </div>
      </div>

      <div className={styles.stage}>
        <div className={styles.chatbotContainer}>
          <Chatbot
            ref={chatbotRef}
            title="營運數據助理"
            config={config}
            customChannelId="prompt-suggestion-demo"
            initMessages={INIT_MESSAGES}
            inputPlaceholder="輸入你的問題"
            locale={locale}
            onChannelReady={onChannelReady}
          />
        </div>

        <SuggestionPanel channel={channel} />
      </div>
    </DemoWrapper>
  );
}
