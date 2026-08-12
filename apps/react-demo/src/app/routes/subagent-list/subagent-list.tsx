import { ReactNode, useState } from 'react';
import {
  ConversationMessage,
  ConversationSubagentMessage,
  ConversationToolCallMessage,
  EventType,
  SubagentTerminalStatus,
} from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './subagent-list.module.scss';

// F-012 — Subagent list. An `Agent` tool-call spawns a subagent; the Agent tool + its child tool-calls
// are routed OUT of the main group and folded into the docked panel (above the Task List). The panel
// auto-collapses once all subagents are terminal; while any runs it expands and shows the current tool.

function agentTool(seq: number, toolUseId: string, description: string): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `agent-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'sa-proc',
    callSeq: seq,
    toolName: 'Agent',
    reason: '',
    toolsetName: '',
    parameter: { description },
    toolUseId,
    result: { status: 'async_launched' }, // Agent tool completes early — must NOT mark the subagent done
    isComplete: true,
  };
}

function subStart(
  seq: number,
  parentToolUseId: string,
  agentId: string,
  subagentType: string,
  description: string,
): ConversationSubagentMessage {
  return {
    type: 'subagent',
    messageId: `sub-start-${seq}`,
    kind: 'start',
    parentToolUseId,
    agentId,
    subagentType,
    description,
  };
}

function childTool(
  seq: number,
  parentToolUseId: string,
  toolUseId: string,
  toolName: string,
  // Natural-language label the agent wrote for this call — shown as-is by `synthesizeToolCallLabel`
  // (priority: reason → synthesized native label → toolName), never i18n'd.
  reason: string,
  complete: boolean,
): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `child-${seq}`,
    eventType: complete ? EventType.TOOL_CALL_COMPLETE : EventType.TOOL_CALL_START,
    processId: 'sa-proc',
    callSeq: seq,
    toolName,
    reason,
    toolsetName: 'db',
    parameter: {},
    toolUseId,
    parentToolUseId,
    result: complete ? { text: 'ok' } : undefined,
    isComplete: complete,
  };
}

function subComplete(
  seq: number,
  parentToolUseId: string,
  status: SubagentTerminalStatus,
): ConversationSubagentMessage {
  return {
    type: 'subagent',
    messageId: `sub-complete-${seq}`,
    kind: 'complete',
    parentToolUseId,
    agentId: `agent-${parentToolUseId}`,
    status,
    summary: 'done',
  };
}

function readCall(seq: number): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `read-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'read-proc',
    callSeq: seq,
    toolName: 'Read',
    reason: '',
    toolsetName: '',
    parameter: { file_path: '/app/inventory.md' },
    result: { text: 'file contents…' },
    isComplete: true,
  };
}

// Subagent A: 查詢 Bolzen 訂單用料需求 (completed, 3 child tools). Subagent B: 查詢 SWRCH35K φ7.0 庫存狀態
// (running, current tool). Child labels are the natural-language `reason` the agent wrote (shown as-is).
const RUNNING_CALLS: ConversationMessage[] = [
  agentTool(1, 'A', '查詢 Bolzen 法蘭螺栓急單用料需求'),
  subStart(2, 'A', 'agent-a', 'general-purpose', '查詢 Bolzen 訂單用料需求'),
  childTool(3, 'A', 'a-t1', 'list_database_semantic_models', '列出可用語意模型', true),
  childTool(4, 'A', 'a-t2', 'dry_run_database_query', '驗證用料查詢 SQL', true),
  childTool(5, 'A', 'a-t3', 'execute_database_query', '查詢 Bolzen 訂單用料明細', true),
  subComplete(6, 'A', 'completed'),
  agentTool(7, 'B', '查詢 SWRCH35K φ7.0 庫存狀態'),
  subStart(8, 'B', 'agent-b', 'general-purpose', '查詢 SWRCH35K φ7.0 庫存狀態'),
  childTool(9, 'B', 'b-t1', 'list_database_semantic_models', '列出庫存語意模型', true),
  childTool(10, 'B', 'b-t2', 'execute_database_query', '查詢 SWRCH35K φ7.0 可用庫存', false), // running → current tool
  readCall(11), // normal tool-call — proves route-out (stays in the thread group)
];

// All terminal → panel auto-collapses. B ends `failed` to show the red alert glyph when expanded.
const ALL_DONE_CALLS: ConversationMessage[] = [
  agentTool(1, 'A', '查詢 Bolzen 法蘭螺栓急單用料需求'),
  subStart(2, 'A', 'agent-a', 'general-purpose', '查詢 Bolzen 訂單用料需求'),
  childTool(3, 'A', 'a-t1', 'list_database_semantic_models', '列出可用語意模型', true),
  childTool(4, 'A', 'a-t2', 'dry_run_database_query', '驗證用料查詢 SQL', true),
  childTool(5, 'A', 'a-t3', 'execute_database_query', '查詢 Bolzen 訂單用料明細', true),
  subComplete(6, 'A', 'completed'),
  agentTool(7, 'B', '查詢 SWRCH35K φ7.0 庫存狀態'),
  subStart(8, 'B', 'agent-b', 'general-purpose', '查詢 SWRCH35K φ7.0 庫存狀態'),
  childTool(9, 'B', 'b-t1', 'execute_database_query', '查詢 SWRCH35K φ7.0 可用庫存', true),
  subComplete(10, 'B', 'failed'),
  readCall(11),
];

const config = { botProviderEndpoint: 'skip' };

const EXPECTED = [
  'docked Subagent 面板疊在 Task List 之上（input 上方）',
  '#1「查詢 Bolzen 訂單用料需求」= completed muted check，點列展開看 3 個 child 工具',
  '#2「查詢 SWRCH35K φ7.0 庫存狀態」= running 琥珀 spinner + 子行「執行中:查詢 SWRCH35K φ7.0 可用庫存」',
  'child 工具 label 顯示自然語言 reason（列出可用語意模型 / 驗證用料查詢 SQL…），非原始 toolName',
  'Read tool-call 仍在對話群組（Agent + child 工具已攔出）',
  'Agent tool result=async_launched 早退，但 subagent 仍 running（不被誤判完成）',
  '切到「全完成」→ 面板自動收合；語系切換影響 header／執行中／工具數（child label 不翻）',
];

type DemoLocale = 'zh-TW' | 'en-US' | 'ja-JP';

export function SubagentListRoute(): ReactNode {
  const [running, setRunning] = useState(true);
  const [locale, setLocale] = useState<DemoLocale>('zh-TW');

  return (
    <DemoWrapper
      title="Subagent List (F-012)"
      description="Agent tool call + subagent.* 累積成當前 subagent 清單，docked 疊在 Task List 之上。狀態只由 subagent.complete 驅動（Agent tool 的 async_launched 早退不算完成）。有 running 展開、全 terminal 自動收合。"
    >
      <div className={styles.legend}>
        <div className={styles.legend__title}>預期</div>
        <ol className={styles.legend__list}>
          {EXPECTED.map(e => (
            <li key={e}>{e}</li>
          ))}
        </ol>
        <div className={styles.controls}>
          <label className={styles.localeLabel}>
            語系
            <select
              className={styles.select}
              value={locale}
              onChange={(e): void => setLocale(e.target.value as DemoLocale)}
            >
              <option value="zh-TW">繁體中文 (zh-TW)</option>
              <option value="en-US">English (en-US)</option>
              <option value="ja-JP">日本語 (ja-JP)</option>
            </select>
          </label>
          <button type="button" className={styles.toggle} onClick={(): void => setRunning(v => !v)}>
            {running ? '切到「全完成」（面板應自動收合）' : '切回「有 running」'}
          </button>
        </div>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          key={running ? 'running' : 'all-done'}
          title="Subagent List Demo"
          config={config}
          locale={locale}
          customChannelId="subagent-list-demo"
          initMessages={running ? RUNNING_CALLS : ALL_DONE_CALLS}
        />
      </div>
    </DemoWrapper>
  );
}
