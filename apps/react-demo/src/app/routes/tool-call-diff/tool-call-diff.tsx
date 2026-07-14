import { ReactNode } from 'react';
import { ConversationMessage, ConversationToolCallMessage, EventType } from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './tool-call-diff.module.scss';

// F-007 — Write/Edit `+/-` diff (right side) + the §3.5 status visuals (completed = no mark,
// running = amber spinner, error = red alert). Six tool-calls exercising every case.
function toolCall(
  seq: number,
  toolName: string,
  parameter: Record<string, unknown>,
  state: 'completed' | 'running' | 'error',
): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `diff-${seq}`,
    eventType: state === 'running' ? EventType.TOOL_CALL_START : EventType.TOOL_CALL_COMPLETE,
    processId: 'diff-proc',
    callSeq: seq,
    toolName,
    reason: '',
    toolsetName: '',
    parameter,
    result: state === 'error' ? { error: { message: 'boom' } } : { output: 'ok' },
    isComplete: state !== 'running',
    time: new Date(),
  };
}

const WRITE_CONTENT =
  'export const a = 1;\nexport const b = 2;\nexport const c = 3;\nexport const d = 4;\nexport const e = 5;';
const EDIT_OLD = 'const a = 1;\nconst b = 2;\nconsole.log(a);';
const EDIT_NEW = 'const a = 1;\nconst b = 2;\nconst c = 3;\nconsole.log(a + c);';

const CALLS: ConversationMessage[] = [
  // Write → +5 (content has 5 lines), completed (no status icon)
  toolCall(1, 'Write', { file_path: '/app/report.html', content: WRITE_CONTENT }, 'completed'),
  // Edit → LCS estimate +2 / -1, completed
  toolCall(2, 'Edit', { file_path: '/app/plan.md', old_string: EDIT_OLD, new_string: EDIT_NEW }, 'completed'),
  // Read → no diff, completed (no status icon)
  toolCall(3, 'Read', { file_path: '/app/info.md' }, 'completed'),
  // Bash running → no diff, amber spinner
  toolCall(4, 'Bash', { command: 'npm test', description: '執行測試' }, 'running'),
  // WebSearch error → no diff, red alert
  toolCall(5, 'WebSearch', { query: 'flaky test' }, 'error'),
];

const config = { botProviderEndpoint: 'skip' };

const EXPECTED = [
  '寫入 report.html → 右側 +5（綠，只有加行）· completed 無狀態標記',
  '編輯 plan.md → 右側 +2 −1（綠/紅，LCS 概算）· completed 無標記',
  '讀取 info.md → 無 diff · completed 無標記',
  'Bash 執行測試 → 無 diff · running 琥珀 spinner',
  'WebSearch flaky test → 無 diff · error 紅 alert',
];

export function ToolCallDiff(): ReactNode {
  return (
    <DemoWrapper
      title="Write/Edit Diff + Status (F-007)"
      description="Write 右側顯示 +行數（綠）、Edit 顯示 old↔new 的行級 LCS 概算 +/−（綠/紅）；其餘工具無 diff。狀態：completed 不加標記（乾淨）、running 琥珀 spinner、error 紅 alert；左側 variant icon 只表身分。"
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
        <Chatbot
          title="Diff / Status Demo"
          config={config}
          customChannelId="tool-call-diff-demo"
          initMessages={CALLS}
        />
      </div>
    </DemoWrapper>
  );
}
