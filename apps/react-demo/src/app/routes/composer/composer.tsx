import { ReactNode, useState } from 'react';
import { ConversationMessage, EventType } from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './composer.module.scss';

// BUILD-028 — the chat-kit composer. One pill holds 📎 / textarea / 🎤 / send, with pending attachments
// inside it and two consumer slots (`renderComposerAbove` outside the pill, `renderComposerInline` in it).
// Runs against the local `/mock-asgard` stream (same as /all-features) rather than 'skip', because 'skip'
// leaves the composer in preview mode — the send-enable, stop-generation and attachment states all need
// a real client to be exercised.

type Mode =
  | 'default'
  | 'slots'
  | 'above'
  | 'inline'
  | 'imageOnly'
  | 'documentOnly'
  | 'noUpload'
  | 'export'
  | 'renderFooter';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'default', label: 'Baseline：pill + 📎 + 語音 + 送出 (R1/R2/R4)' },
  { mode: 'slots', label: '兩個 slot 都填 (R6)' },
  { mode: 'above', label: '只有 renderComposerAbove (R6)' },
  { mode: 'inline', label: '只有 renderComposerInline (R6)' },
  { mode: 'imageOnly', label: '只開圖片上傳 (R2)' },
  { mode: 'documentOnly', label: '只開文件上傳 (R2)' },
  { mode: 'noUpload', label: '兩者皆關 → 無 📎 (R2)' },
  { mode: 'export', label: 'enableExport → Export 在 header (R7)' },
  { mode: 'renderFooter', label: 'renderFooter 整個接管 (R9)' },
];

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
    message: { messageId: 'b1', text: '您好，我是備料查詢助理，請問要查哪張急單？' } as never,
    raw: '',
  },
];

// Stand-in for a consumer control row (Sindri mounts its Model picker + @mention chips here).
function ControlRow(): ReactNode {
  return (
    <div className={styles.controlRow}>
      <button type="button" className={styles.control}>
        Builtin (Balanced) ⌄
      </button>
      <button type="button" className={styles.controlDashed}>
        @ 點名 ⌄
      </button>
    </div>
  );
}

function InlineRow(): ReactNode {
  return (
    <div className={styles.inlineRow}>
      <span className={styles.inlineChip}>思考模式：標準</span>
      <span className={styles.inlineChip}>工具：全部</span>
    </div>
  );
}

function CustomFooter(): ReactNode {
  return <div className={styles.customFooter}>消費端自訂 footer（renderFooter 完全接管，兩個 slot 都不渲染）</div>;
}

export function ComposerRoute(): ReactNode {
  const [mode, setMode] = useState<Mode>('default');

  const enableUpload = mode !== 'noUpload' && mode !== 'documentOnly';
  const enableDocumentUpload = mode !== 'noUpload' && mode !== 'imageOnly';
  const showAbove = mode === 'slots' || mode === 'above';
  const showInline = mode === 'slots' || mode === 'inline';

  return (
    <DemoWrapper
      title="Composer (BUILD-028)"
      description="chat-kit 的輸入框：一顆 pill 包住 📎 / textarea / 語音 / 送出，附件預覽在框內上方（圖片縮圖、文件 chips），並開放 renderComposerAbove（框外上方）與 renderComposerInline（框內下緣）兩個 slot。"
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
          送出鈕在沒有內容時是 disabled（不再被語音鈕取代）；打字後才亮起，串流中變成停止鈕。📎 一次可選圖片＋
          文件，兩者會同時 pending（互斥已解除）。跑的是本地 /mock-asgard 串流，mock 沒有 blob 端點，所以附件會
          走到錯誤態 —— 預覽版面（縮圖 / chips）與同時 pending 仍可驗證。
        </p>
      </div>

      <div className={styles.stage}>
        <div className={styles.chatbotContainer}>
          <Chatbot
            title="客服助理"
            config={config}
            customChannelId="composer-demo"
            initMessages={INIT_MESSAGES}
            channelTitle="Bolzen 法蘭螺栓急單備料查詢"
            enableUpload={enableUpload}
            enableDocumentUpload={enableDocumentUpload}
            enableExport={mode === 'export'}
            renderComposerAbove={showAbove ? (): ReactNode => <ControlRow /> : undefined}
            renderComposerInline={showInline ? (): ReactNode => <InlineRow /> : undefined}
            renderFooter={mode === 'renderFooter' ? (): ReactNode => <CustomFooter /> : undefined}
          />
        </div>

        <div className={styles.narrow}>
          <span className={styles.narrow__label}>窄版 360px</span>
          <div className={styles.narrowContainer}>
            <Chatbot
              title="客服助理"
              config={config}
              customChannelId="composer-demo-narrow"
              initMessages={INIT_MESSAGES}
              channelTitle="Bolzen 法蘭螺栓急單備料查詢"
              enableUpload={enableUpload}
              enableDocumentUpload={enableDocumentUpload}
              enableExport={mode === 'export'}
              renderComposerAbove={showAbove ? (): ReactNode => <ControlRow /> : undefined}
              renderComposerInline={showInline ? (): ReactNode => <InlineRow /> : undefined}
              renderFooter={mode === 'renderFooter' ? (): ReactNode => <CustomFooter /> : undefined}
            />
          </div>
        </div>
      </div>
    </DemoWrapper>
  );
}
