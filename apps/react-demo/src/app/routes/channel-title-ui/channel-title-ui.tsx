import { ReactNode, useState } from 'react';
import { ConversationMessage, EventType } from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './channel-title-ui.module.scss';

// F-017 — the channel-title row rendered at the thread top of a live <Chatbot>. Driven here (preview
// mode) by the `channelTitle` / `renderTitle` / `channelTitleHidden` props so the states can be cycled;
// in production the title comes from F-016's `channelTitle$` (metadata seed + `title.update`).

type Mode = 'untitled' | 'named' | 'updated' | 'custom' | 'hidden';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'untitled', label: '未命名（null → placeholder）' },
  { mode: 'named', label: '命名（metadata seed）' },
  { mode: 'updated', label: '換新（title.update · 淡入）' },
  { mode: 'custom', label: '客製 renderTitle' },
  { mode: 'hidden', label: '隱藏' },
];

const SEED_TITLE = 'Bolzen 法蘭螺栓急單備料查詢';
const UPDATED_TITLE = '法蘭螺栓急單：已改查替代料號 SWRCH38K';

const config = { botProviderEndpoint: 'skip' };

const INIT_MESSAGES: ConversationMessage[] = [
  {
    type: 'bot',
    messageId: 'b1',
    eventType: EventType.MESSAGE_COMPLETE,
    isTyping: false,
    typingText: null,
    message: { messageId: 'b1', text: '您好，我是備料查詢助理，請問要查哪張急單？' } as never,
    time: new Date(),
    raw: '',
  },
];

// A custom title row (F-017 renderTitle escape hatch): own icon + a share action.
function customRenderTitle({ title }: { title: string | null }): ReactNode {
  return (
    <div className={styles.customRow}>
      <span className={styles.customRow__hash}>#</span>
      <span className={styles.customRow__title}>{title ?? '新對話'}</span>
      <button type="button" className={styles.customRow__share}>
        分享
      </button>
    </div>
  );
}

export function ChannelTitleUiRoute(): ReactNode {
  const [mode, setMode] = useState<Mode>('named');

  const channelTitle = mode === 'untitled' ? null : mode === 'updated' ? UPDATED_TITLE : SEED_TITLE;
  const renderTitle = mode === 'custom' ? customRenderTitle : undefined;
  const channelTitleHidden = mode === 'hidden';

  return (
    <DemoWrapper
      title="Channel Title UI (F-017)"
      description="channel title 呈現在 chat thread 頂端（bot 名稱 header 之下）：MessageSquare muted icon + 單行 truncate；未命名 → muted placeholder；標題變更 200ms 淡入；renderTitle 客製逃生口 + hidden 捷徑。"
    >
      <div className={styles.legend}>
        <div className={styles.legend__title}>狀態切換</div>
        <div className={styles.buttons}>
          {MODES.map(m => (
            <button
              type="button"
              key={m.mode}
              className={mode === m.mode ? styles.active : undefined}
              onClick={(): void => setMode(m.mode)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className={styles.hint}>
          切「換新」看 200ms 淡入；「客製」用自家列（# + 分享）；「隱藏」整條移除。上方 bot 名稱 header 不受影響。
        </p>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          title="備料查詢助理"
          config={config}
          customChannelId="channel-title-ui-demo"
          initMessages={INIT_MESSAGES}
          channelTitle={channelTitle}
          renderTitle={renderTitle}
          channelTitleHidden={channelTitleHidden}
        />
      </div>
    </DemoWrapper>
  );
}
