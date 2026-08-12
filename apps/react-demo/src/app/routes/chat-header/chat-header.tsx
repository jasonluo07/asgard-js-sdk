import { ReactNode, useState } from 'react';
import { ConversationMessage, EventType } from '@asgard-js/core';
import { Chatbot, ChatHeaderAction, ChatHeaderTitleRendererArgs } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './chat-header.module.scss';

// F-022 — the unified ChatHeader on a live <Chatbot>. One heading bar carries the bot main line, the
// channel title (subtitle / single line), and a first-class right-side actions API — replacing the two
// former bars (BUG-002). Driven here in preview mode (`botProviderEndpoint: 'skip'`) so the states cycle;
// in production the channel title comes from F-016 (`channelTitle$` seed + `title.update`).

type Mode =
  | 'bot'
  | 'nobot'
  | 'untitled'
  | 'updated'
  | 'actions'
  | 'fileExplorer'
  | 'renderTitle'
  | 'renderHeader'
  | 'hidden';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'bot', label: 'Bot 主字 + channel 副標 (R1)' },
  { mode: 'nobot', label: '無 Bot → channel 當主字 (R1)' },
  { mode: 'untitled', label: '未命名 placeholder (R1)' },
  { mode: 'updated', label: 'title.update 淡入 (R2)' },
  { mode: 'actions', label: 'actions：active / busy / render (R3)' },
  { mode: 'fileExplorer', label: '內建 File Explorer toggle (R5)' },
  { mode: 'renderTitle', label: 'renderTitle 客製標題區 L2 (R6)' },
  { mode: 'renderHeader', label: 'renderHeader 整條接管 L3 (R6)' },
  { mode: 'hidden', label: 'channelTitleHidden 隱藏副標 (R6)' },
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
    raw: '',
  },
];

function StarIcon(): ReactNode {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M11.5 2.8 14 8l5.7.8-4.1 4 1 5.7-5.1-2.7L7.3 18.5l1-5.7-4.1-4L10 8Z" />
    </svg>
  );
}

// L2 escape hatch (renderTitle): own the title text area only; avatar + actions stay default.
function customRenderTitle({ title }: ChatHeaderTitleRendererArgs): ReactNode {
  return (
    <div className={styles.customTitle}>
      <span className={styles.customTitle__hash}>#</span>
      <span className={styles.customTitle__text}>{title ?? '新對話'}</span>
    </div>
  );
}

// L3 escape hatch (renderHeader): take over the whole bar. Return null to hide entirely.
function customRenderHeader(): ReactNode {
  return (
    <div className={styles.customHeader}>
      <span className={styles.customHeader__brand}>ACME 支援中心</span>
      <button type="button" className={styles.customHeader__cta}>
        升級方案
      </button>
    </div>
  );
}

export function ChatHeaderRoute(): ReactNode {
  const [mode, setMode] = useState<Mode>('bot');
  const [starActive, setStarActive] = useState(false);

  const botName = mode === 'nobot' ? '' : '客服助理';
  const channelTitle = mode === 'untitled' ? null : mode === 'updated' ? UPDATED_TITLE : SEED_TITLE;

  const headerActions: ChatHeaderAction[] | undefined =
    mode === 'actions'
      ? [
          {
            id: 'star',
            icon: <StarIcon />,
            label: '加星號',
            active: starActive,
            onClick: (): void => setStarActive(v => !v),
          },
          { id: 'sync', icon: <StarIcon />, label: '同步中', busy: true },
          {
            id: 'badge',
            icon: null,
            label: '',
            render: (): ReactNode => <span className={styles.badge}>3</span>,
          },
        ]
      : undefined;

  return (
    <DemoWrapper
      title="Chat Header (F-022)"
      description="統一的 heading bar：一條承載 bot 主字 + channel 副標 + 右側 actions（reset / close / 內建 File Explorer toggle / 自訂格），修掉舊的雙 title bar（BUG-002）。客製三層：actions → renderTitle → renderHeader → hidden。"
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
          reset（有 busy spinner）與 close 一律在最右側（R4）。切「actions」看 active toggle / busy / render
          badge；「內建 File Explorer」看資料夾鈕。下方窄版（360px）用來驗主字 / 副標 truncate（R8）。
        </p>
      </div>

      <div className={styles.stage}>
        <div className={styles.chatbotContainer}>
          <Chatbot
            title={botName}
            config={config}
            customChannelId="chat-header-demo"
            initMessages={INIT_MESSAGES}
            channelTitle={channelTitle}
            headerActions={headerActions}
            fileExplorer={mode === 'fileExplorer' ? 'builtin' : 'off'}
            renderTitle={mode === 'renderTitle' ? customRenderTitle : undefined}
            renderHeader={mode === 'renderHeader' ? customRenderHeader : undefined}
            channelTitleHidden={mode === 'hidden'}
          />
        </div>

        <div className={styles.narrow}>
          <div className={styles.narrow__label}>窄版 360px（truncate 驗收）</div>
          <div className={styles.narrowContainer}>
            <Chatbot
              title="客服助理"
              config={config}
              customChannelId="chat-header-demo-narrow"
              initMessages={INIT_MESSAGES}
              channelTitle={SEED_TITLE}
            />
          </div>
        </div>
      </div>
    </DemoWrapper>
  );
}
