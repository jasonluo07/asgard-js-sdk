import { ReactNode, useState } from 'react';
import { ConversationMessage, ConversationToolCallMessage, EventType } from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './task-list.module.scss';

// F-010 — Task Check List. TaskCreate / TaskUpdate are native tool-calls but are routed OUT of the
// tool-call group and folded into the docked list (above the seam). This route replays a mid-run
// prefix of the new-example8 sequence → #1 completed, #2 in_progress, #3 pending (all three states),
// plus one normal Read tool-call to prove it still shows in the thread group (route-out).

function taskEvent(
  seq: number,
  toolName: 'TaskCreate' | 'TaskUpdate',
  parameter: Record<string, unknown>,
  sidecar: Record<string, unknown>,
): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `task-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'task-proc',
    callSeq: seq,
    toolName,
    reason: '',
    toolsetName: '',
    parameter,
    sidecar,
    result: { text: `${toolName} #${seq}` },
    isComplete: true,
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

// new-example8 附錄 A, prefix through event 6 → #1 completed · #2 in_progress · #3 pending.
const TASK_CALLS: ConversationMessage[] = [
  taskEvent(
    1,
    'TaskCreate',
    { subject: '查詢 Bolzen 法蘭螺栓急單用料需求', description: '比對 BOM 與現有庫存，算出淨需求。' },
    { task: { id: '1' } },
  ),
  taskEvent(2, 'TaskUpdate', { taskId: '1' }, { statusChange: { from: 'pending', to: 'in_progress' } }),
  taskEvent(
    3,
    'TaskCreate',
    { subject: '查詢 SWRCH35K φ7.0 庫存狀態', activeForm: '查詢 SWRCH35K φ7.0 庫存狀態中' },
    { task: { id: '2' } },
  ),
  taskEvent(4, 'TaskUpdate', { taskId: '1' }, { statusChange: { from: 'in_progress', to: 'completed' } }),
  taskEvent(5, 'TaskUpdate', { taskId: '2' }, { statusChange: { from: 'pending', to: 'in_progress' } }),
  taskEvent(6, 'TaskCreate', { subject: '計算短缺量與補貨時效風險' }, { task: { id: '3' } }),
  // One normal tool-call — proves task tools route out while this stays in the thread group.
  readCall(7),
];

const NO_TASK_CALLS: ConversationMessage[] = [readCall(1)];

const config = { botProviderEndpoint: 'skip' };

const EXPECTED = [
  'docked 任務清單面板在 thread↔輸入交界上方（RunningIndicator seam 之上）',
  '#1「查詢 Bolzen…」= completed muted check（有 description、可展開）',
  '#2 = in_progress 琥珀 spinner + activeForm 亮粗字（唯一 accent）',
  '#3「計算短缺量…」= pending 空心暗字',
  'header 顯示 1/3、可收合；Read tool-call 仍出現在對話群組（task 工具已攔出）',
  '切到「無任務」→ 面板整個消失（讓出空間）',
];

export function TaskListRoute(): ReactNode {
  const [hasTasks, setHasTasks] = useState(true);

  return (
    <DemoWrapper
      title="Task Check List (F-010)"
      description="TaskCreate/TaskUpdate 累積成一份當前任務清單，docked 在輸入交界上方；三態（pending/in_progress/completed）、in_progress 顯示 activeForm。task 工具不進 tool-call 群組。空清單則面板隱藏。"
    >
      <div className={styles.legend}>
        <div className={styles.legend__title}>預期</div>
        <ol className={styles.legend__list}>
          {EXPECTED.map(e => (
            <li key={e}>{e}</li>
          ))}
        </ol>
        <button type="button" className={styles.toggle} onClick={(): void => setHasTasks(v => !v)}>
          {hasTasks ? '切到「無任務」（面板應隱藏）' : '切回「有任務」'}
        </button>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          key={hasTasks ? 'with-tasks' : 'no-tasks'}
          title="Task List Demo"
          config={config}
          customChannelId="task-list-demo"
          initMessages={hasTasks ? TASK_CALLS : NO_TASK_CALLS}
        />
      </div>
    </DemoWrapper>
  );
}
