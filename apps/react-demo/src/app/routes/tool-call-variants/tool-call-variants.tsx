import { ReactNode } from 'react';
import { ConversationMessage, ConversationToolCallMessage, EventType } from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './tool-call-variants.module.scss';

// F-004 — a scoped, static scenario (via initMessages, no SSE mock) exercising the label priority and
// the native variant icons. Nine completed tool-calls in one group:
//  - seven Claude-native built-ins (toolsetName === "", reason === "") → synthesized label + variant icon
//  - one general tool (toolsetName !== "", reason !== "") → reason + generic icon
//  - one Asgard-platform tool (toolsetName === "" BUT reason !== "") → reason + generic icon (NOT native)
function toolCall(
  callSeq: number,
  toolsetName: string,
  toolName: string,
  reason: string,
  parameter: Record<string, unknown>,
  result: Record<string, unknown>,
): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `demo-proc-${callSeq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'demo-proc',
    callSeq,
    toolName,
    reason,
    toolsetName,
    parameter,
    result,
    isComplete: true,
    time: new Date(),
  };
}

const CALLS: ConversationMessage[] = [
  toolCall(1, '', 'Bash', '', { command: 'npm run build', description: '建置整個專案' }, { output: 'build ok' }),
  toolCall(2, '', 'Read', '', { file_path: '/Users/dev/app/src/index.ts' }, { output: '…file contents…' }),
  toolCall(
    3,
    '',
    'Write',
    '',
    { file_path: '/Users/dev/app/src/new-file.ts', content: 'export const x = 1;\n' },
    { output: 'File created' },
  ),
  toolCall(
    4,
    '',
    'Edit',
    '',
    { file_path: '/Users/dev/app/src/app.tsx', old_string: 'a', new_string: 'b' },
    { output: 'updated' },
  ),
  toolCall(5, '', 'Skill', '', { skill: 'local-plugin:shortage-calc', args: '' }, { output: 'Launching skill' }),
  toolCall(
    6,
    '',
    'WebFetch',
    '',
    { url: 'https://docs.asgard-ai.com/guide/sse', prompt: 'summarize' },
    { output: '…summary…' },
  ),
  toolCall(7, '', 'WebSearch', '', { query: 'RxJS retry backoff' }, { output: 'Web search results…' }),
  toolCall(8, 'crm-toolset', 'lookup_customer', '查詢使用者資料', { userId: 42 }, { name: 'Ada' }),
  toolCall(
    9,
    '',
    'execute_database_query',
    '執行資料庫查詢',
    { model_name: 'orders', sql: 'SELECT 1' },
    { is_success: true },
  ),
];

const EXPECTED: { label: string; icon: string }[] = [
  { label: '建置整個專案（Bash description）', icon: 'Terminal' },
  { label: 'Read index.ts', icon: 'FileText' },
  { label: 'Wrote new-file.ts', icon: 'FilePlus' },
  { label: 'Edited app.tsx', icon: 'FilePen' },
  { label: 'Ran skill local-plugin:shortage-calc', icon: 'Sparkles' },
  { label: 'Fetched docs.asgard-ai.com', icon: 'Globe' },
  { label: 'Searched “RxJS retry backoff”', icon: 'Search' },
  { label: '查詢使用者資料（general → reason）', icon: 'Wrench (generic)' },
  { label: '執行資料庫查詢（platform, toolsetName="" 但用 reason，不誤判 native）', icon: 'Wrench (generic)' },
];

// A non-connecting endpoint: this demo renders `initMessages` statically and never sends, so it must
// not open a live channel (which would append the generic mock reply and hide the tool-calls).
const config = {
  botProviderEndpoint: 'skip',
};

export function ToolCallVariants(): ReactNode {
  return (
    <DemoWrapper
      title="Built-in Tool-Call Variants (F-004)"
      description="一組 9 筆 tool-call（經 initMessages 靜態注入）：七個 Claude-native 內建工具（reason 空）→ 合成 label + 專屬 variant icon；一個 general 工具與一個 Asgard-platform 工具（reason 非空）→ 用 reason + 通用 icon。重點：DB 工具的 toolsetName 也是空字串，但因 reason 非空、且不在 native 七個內，不會被誤判成 native。"
    >
      <div className={styles.legend}>
        <div className={styles.legend__title}>預期呈現（左 icon · label）</div>
        <ol className={styles.legend__list}>
          {EXPECTED.map(e => (
            <li key={e.label}>
              <span className={styles.legend__icon}>{e.icon}</span>
              <span>{e.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          title="Tool-Call Variants Demo"
          config={config}
          customChannelId="tool-call-variants-demo"
          initMessages={CALLS}
        />
      </div>
    </DemoWrapper>
  );
}
