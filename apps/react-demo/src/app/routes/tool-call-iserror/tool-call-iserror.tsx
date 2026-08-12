import { ReactNode } from 'react';
import { ConversationMessage, ConversationToolCallMessage, EventType } from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './tool-call-iserror.module.scss';

// F-009 — the error status (red alert) is driven by the backend `isError` flag, not the `result.error`
// heuristic. The crux is a *native* tool: its `result` is a plain-text payload with no `.error`, so the
// old heuristic would render it as `completed`; `isError:true` correctly flags it as an error.
function toolCall(
  seq: number,
  toolName: string,
  parameter: Record<string, unknown>,
  result: Record<string, unknown>,
  isError?: boolean,
): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `iserror-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'iserror-proc',
    callSeq: seq,
    toolName,
    reason: '',
    toolsetName: '',
    parameter,
    result,
    isError,
    isComplete: true,
  };
}

const CALLS: ConversationMessage[] = [
  // Native Bash, plain-text result, isError:true → red alert (heuristic would miss this — no `.error`).
  toolCall(1, 'Bash', { command: 'npm test', description: '執行測試' }, { text: 'exit code 1: 2 failing' }, true),
  // Native Read, plain-text result, isError absent (omitempty) → completed, no status mark.
  toolCall(2, 'Read', { file_path: '/app/info.md' }, { text: 'file contents…' }),
  // General tool, no isError but result.error present → error via the retained fallback (R3).
  toolCall(3, 'WebSearch', { query: 'flaky test' }, { error: { message: 'quota exceeded' } }),
];

const config = { botProviderEndpoint: 'skip' };

const EXPECTED = [
  'Bash 執行測試（native，純文字 result、isError:true）→ error 紅 alert（舊 result.error 啟發式偵測不到）',
  '讀取 info.md（native，純文字 result、isError 省略）→ completed 無狀態標記',
  'WebSearch flaky test（無 isError，但 result.error 有值）→ error 紅 alert（保留的 fallback）',
];

export function ToolCallIsError(): ReactNode {
  return (
    <DemoWrapper
      title="Tool-Call isError (F-009)"
      description="失敗判定改用後端 isError（涵蓋 native／platform／general）。native 工具 result 是純文字、沒有 .error，唯有 isError 能標出其失敗；result.error 舊啟發式保留作 fallback。"
    >
      <div className={styles.legend}>
        <div className={styles.legend__title}>預期</div>
        <ol className={styles.legend__list}>
          {EXPECTED.map(e => (
            <li key={e}>{e}</li>
          ))}
        </ol>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot title="isError Demo" config={config} customChannelId="tool-call-iserror-demo" initMessages={CALLS} />
      </div>
    </DemoWrapper>
  );
}
