import { memo, ReactNode, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { Channel, Conversation, ConversationMessage, createDerivedStores, EventType } from '@asgard-js/core';
import { useSubagents, useTaskList } from '@asgard-js/react';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './derived-state.module.scss';

// F-013 — render the Task / Subagent lists OUTSIDE the Chatbot via the framework-agnostic store.
// A stepper pushes cumulative conversation snapshots into a `conversation$`; the panels consume the
// real `useTaskList` / `useSubagents` hooks (fed a store-shaped channel stub) and are `React.memo`'d,
// so their render-count badges only bump when THAT slice changes — a plain bot-message step does not
// re-render the list panels.

function taskCreate(seq: number, id: string, subject: string): ConversationMessage {
  return {
    type: 'tool-call',
    messageId: `task-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'p',
    callSeq: seq,
    toolName: 'TaskCreate',
    reason: '',
    toolsetName: '',
    parameter: { subject },
    sidecar: { task: { id } },
    isComplete: true,
  };
}

function taskUpdate(seq: number, id: string, to: string): ConversationMessage {
  return {
    type: 'tool-call',
    messageId: `taskupd-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'p',
    callSeq: seq,
    toolName: 'TaskUpdate',
    reason: '',
    toolsetName: '',
    parameter: { taskId: id },
    sidecar: { statusChange: { to } },
    isComplete: true,
  };
}

function botMessage(seq: number, text: string): ConversationMessage {
  return {
    type: 'bot',
    messageId: `bot-${seq}`,
    eventType: EventType.MESSAGE_COMPLETE,
    isTyping: false,
    typingText: null,
    message: { messageId: `bot-${seq}`, text } as never,
    raw: '',
  };
}

function agentTool(seq: number, toolUseId: string, description: string): ConversationMessage {
  return {
    type: 'tool-call',
    messageId: `agent-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'p',
    callSeq: seq,
    toolName: 'Agent',
    reason: '',
    toolsetName: '',
    parameter: { description },
    toolUseId,
    result: { status: 'async_launched' },
    isComplete: true,
  };
}

function subagentStart(parentToolUseId: string): ConversationMessage {
  return {
    type: 'subagent',
    messageId: `sub-start-${parentToolUseId}`,
    kind: 'start',
    parentToolUseId,
    agentId: `agent-${parentToolUseId}`,
    subagentType: 'general-purpose',
    description: '查詢資料',
  };
}

// Each step is the cumulative message list at that point. The label says what it changes.
const STEPS: { label: string; messages: ConversationMessage[] }[] = [
  { label: '（起始）空清單', messages: [] },
  { label: 'TaskCreate #1 → Task 清單變（+1）', messages: [taskCreate(1, '1', '查詢 Bolzen 用料需求')] },
  {
    label: 'Bot 訊息（無關 delta）→ 兩個清單都不變',
    messages: [taskCreate(1, '1', '查詢 Bolzen 用料需求'), botMessage(2, '好的，我開始查。')],
  },
  {
    label: 'TaskUpdate #1 → in_progress → Task 清單變',
    messages: [
      taskCreate(1, '1', '查詢 Bolzen 用料需求'),
      botMessage(2, '好的，我開始查。'),
      taskUpdate(3, '1', 'in_progress'),
    ],
  },
  {
    label: 'Agent + subagent.start → Subagent 清單變（Task 不變）',
    messages: [
      taskCreate(1, '1', '查詢 Bolzen 用料需求'),
      botMessage(2, '好的，我開始查。'),
      taskUpdate(3, '1', 'in_progress'),
      agentTool(4, 'X', '查詢庫存'),
      subagentStart('X'),
    ],
  },
];

function convOf(messages: ConversationMessage[]): Conversation {
  return new Conversation({ messages: new Map(messages.map(m => [m.messageId, m])) });
}

// A panel that renders the Task list outside any Chatbot. Memoized + given a stable channel, so it
// re-renders ONLY when `useTaskList`'s snapshot changes — the render badge proves the slice isolation.
const TaskPanel = memo(function TaskPanel({ channel }: { channel: Channel }): ReactNode {
  const renders = useRef(0);
  renders.current += 1;
  const tasks = useTaskList(channel);

  return (
    <div className={styles.panel}>
      <div className={styles.panel__head}>
        <span>Task 清單（框外）</span>
        <span className={styles.badge}>render × {renders.current}</span>
      </div>
      {tasks.length === 0 ? (
        <div className={styles.empty}>（空）</div>
      ) : (
        <ul className={styles.list}>
          {tasks.map(t => (
            <li key={t.id}>
              <code>{t.status}</code> {t.subject}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

const SubagentPanel = memo(function SubagentPanel({ channel }: { channel: Channel }): ReactNode {
  const renders = useRef(0);
  renders.current += 1;
  const subagents = useSubagents(channel);

  return (
    <div className={styles.panel}>
      <div className={styles.panel__head}>
        <span>Subagent 清單（框外）</span>
        <span className={styles.badge}>render × {renders.current}</span>
      </div>
      {subagents.length === 0 ? (
        <div className={styles.empty}>（空）</div>
      ) : (
        <ul className={styles.list}>
          {subagents.map(s => (
            <li key={s.parentToolUseId}>
              <code>{s.status}</code> {s.subagentType} · {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export function DerivedStateRoute(): ReactNode {
  const [step, setStep] = useState(0);

  // A stable conversation$ + derived stores, wrapped as a store-shaped `Channel` stub so the panels
  // can use the real exported hooks without a live SSE connection.
  const { channelStub, conversation$ } = useMemo(() => {
    const conversation$ = new BehaviorSubject<Conversation>(convOf(STEPS[0].messages));
    const stores = createDerivedStores(conversation$);
    const channelStub = {
      tasks$: stores.tasks$,
      subagents$: stores.subagents$,
      getTasks: stores.getTasks,
      getSubagents: stores.getSubagents,
    } as unknown as Channel;

    return { channelStub, conversation$ };
  }, []);

  const applyStep = (next: number): void => {
    setStep(next);
    conversation$.next(convOf(STEPS[next].messages));
  };

  return (
    <DemoWrapper
      title="Derived-State Stores (F-013)"
      description="把 Task / Subagent 衍生狀態以 framework-agnostic store 對外暴露，於 Chatbot 之外渲染。逐切片 store（BehaviorSubject + distinctUntilChanged）只在該切片真變時才發：按到「Bot 訊息」步驟時，兩個清單的 render 徽章都不會增加。"
    >
      <div className={styles.controls}>
        <div className={styles.stepLabel}>
          步驟 {step} / {STEPS.length - 1}：{STEPS[step].label}
        </div>
        <div className={styles.buttons}>
          <button type="button" disabled={step === 0} onClick={(): void => applyStep(step - 1)}>
            上一步
          </button>
          <button type="button" disabled={step === STEPS.length - 1} onClick={(): void => applyStep(step + 1)}>
            下一步
          </button>
          <button type="button" onClick={(): void => applyStep(0)}>
            重置
          </button>
        </div>
        <p className={styles.hint}>
          觀察兩個 <code>render ×</code> 徽章：只有對應清單真的變的步驟才會 +1；「Bot 訊息（無關
          delta）」步驟兩者都不動。
        </p>
      </div>

      <div className={styles.panels}>
        <TaskPanel channel={channelStub} />
        <SubagentPanel channel={channelStub} />
      </div>
    </DemoWrapper>
  );
}
