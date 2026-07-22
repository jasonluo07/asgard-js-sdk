import {
  ConversationMessage,
  ConversationSubagentMessage,
  ConversationToolCallMessage,
  EventType,
  MessageTemplateType,
} from '@asgard-js/core';
import { nanoid } from 'nanoid';
import {
  createAttachmentTemplateExample,
  createBaseTemplateExample,
  createButtonTemplateExample,
  createCarouselTemplateExample,
  createChartTemplateExample,
  createEmitButtonTemplateExample,
  createErrorToolCallMessages,
  createHintTemplateExample,
  createImageTemplateExample,
  createMathTemplateExample,
  createTableTemplateExample,
  createTextTemplateExample,
  createToolCallMessages,
  createUserMessageExample,
} from './messages';

// One static thread that puts EVERY themeable surface of the chatbot on screen at once, so the /theme
// route can be used to judge a ChatbotTheme rather than guessing from four templates. Everything here is
// injected via `initMessages` (no SSE), which keeps preset switching instant and deterministic.
//
// Deliberately built as its own module instead of extending `mocks/messages.ts`: the shared mocks are
// consumed by ~40 other routes and must not drift for this one.

function section(label: string): ConversationMessage {
  return createBaseTemplateExample({
    messageId: nanoid(),
    replyToCustomMessageId: '',
    text: `### ${label}`,
    payload: null,
    isDebug: false,
    idx: 0,
    template: { type: MessageTemplateType.TEXT, text: '', quickReplies: [] },
  });
}

function markdownShowcase(): ConversationMessage {
  return createBaseTemplateExample({
    messageId: nanoid(),
    replyToCustomMessageId: '',
    text: [
      '一般內文搭配 **粗體**、*斜體*、`inline code`，以及一個 [連結](https://asgard-ai.com)。',
      '',
      '- 項目一',
      '- 項目二',
      '',
      '> 引用區塊 — 檢查 blockquote 的邊框與底色有沒有跟著主題。',
      '',
      '```ts',
      'const theme: ChatbotTheme = {',
      "  chatbot: { backgroundColor: '#141414' },",
      '};',
      '```',
    ].join('\n'),
    payload: null,
    isDebug: false,
    idx: 0,
    template: { type: MessageTemplateType.TEXT, text: '', quickReplies: [] },
  });
}

function thinkingBlock(): ConversationMessage {
  return {
    type: 'thinking',
    messageId: nanoid(),
    text: '使用者想比較各群組的新增數量。先確認語意模型有沒有 cohort 欄位，再決定要不要 join 使用者表。',
    isThinking: false,
    time: new Date(),
  };
}

function errorBubble(): ConversationMessage {
  return {
    type: 'error',
    messageId: nanoid(),
    eventType: EventType.ERROR,
    error: { code: 'INTERNAL_ERROR', message: '後端連線中斷，請稍後再試。' },
    time: new Date(),
  };
}

// --- docked panels ------------------------------------------------------------------------------
// Task Check List (F-010) and Subagent list (F-012) are docked above the composer, so they are part of
// the chrome a theme has to cover. Shapes mirror /task-list and /subagent-list.

function taskEvent(
  seq: number,
  toolName: 'TaskCreate' | 'TaskUpdate',
  parameter: Record<string, unknown>,
  sidecar: Record<string, unknown>,
): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `theme-task-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'theme-task-proc',
    callSeq: seq,
    toolName,
    reason: '',
    toolsetName: '',
    parameter,
    sidecar,
    result: { text: `${toolName} #${seq}` },
    isComplete: true,
    time: new Date(),
  };
}

function agentTool(seq: number, toolUseId: string, description: string): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `theme-agent-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'theme-sa-proc',
    callSeq: seq,
    toolName: 'Agent',
    reason: '',
    toolsetName: '',
    parameter: { description },
    toolUseId,
    result: { status: 'async_launched' },
    isComplete: true,
    time: new Date(),
  };
}

function subStart(seq: number, parentToolUseId: string, description: string): ConversationSubagentMessage {
  return {
    type: 'subagent',
    messageId: `theme-sub-start-${seq}`,
    kind: 'start',
    parentToolUseId,
    agentId: `theme-agent-${parentToolUseId}`,
    subagentType: 'general-purpose',
    description,
    time: new Date(),
  };
}

function childTool(
  seq: number,
  parentToolUseId: string,
  toolName: string,
  reason: string,
  complete: boolean,
): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `theme-child-${seq}`,
    eventType: complete ? EventType.TOOL_CALL_COMPLETE : EventType.TOOL_CALL_START,
    processId: 'theme-sa-proc',
    callSeq: seq,
    toolName,
    reason,
    toolsetName: 'db',
    parameter: {},
    toolUseId: `theme-${parentToolUseId}-t${seq}`,
    parentToolUseId,
    result: complete ? { text: 'ok' } : undefined,
    isComplete: complete,
    time: new Date(),
  };
}

function subComplete(seq: number, parentToolUseId: string): ConversationSubagentMessage {
  return {
    type: 'subagent',
    messageId: `theme-sub-complete-${seq}`,
    kind: 'complete',
    parentToolUseId,
    agentId: `theme-agent-${parentToolUseId}`,
    status: 'completed',
    summary: 'done',
    time: new Date(),
  };
}

// One subagent still running and one completed → the panel stays expanded (its running state is the
// interesting one for a theme: spinner, accent text, muted check).
const DOCKED_PANELS: ConversationMessage[] = [
  taskEvent(
    101,
    'TaskCreate',
    { subject: '查詢 Bolzen 法蘭螺栓急單用料需求', description: '比對 BOM 與現有庫存，算出淨需求。' },
    { task: { id: '1' } },
  ),
  taskEvent(102, 'TaskUpdate', { taskId: '1' }, { statusChange: { from: 'pending', to: 'completed' } }),
  taskEvent(
    103,
    'TaskCreate',
    { subject: '查詢 SWRCH35K φ7.0 庫存狀態', activeForm: '查詢 SWRCH35K φ7.0 庫存狀態中' },
    { task: { id: '2' } },
  ),
  taskEvent(104, 'TaskUpdate', { taskId: '2' }, { statusChange: { from: 'pending', to: 'in_progress' } }),
  taskEvent(105, 'TaskCreate', { subject: '計算短缺量與補貨時效風險' }, { task: { id: '3' } }),

  agentTool(201, 'TA', '查詢 Bolzen 法蘭螺栓急單用料需求'),
  subStart(202, 'TA', '查詢 Bolzen 訂單用料需求'),
  childTool(203, 'TA', 'execute_database_query', '查詢 Bolzen 訂單用料明細', true),
  subComplete(204, 'TA'),
  agentTool(205, 'TB', '查詢 SWRCH35K φ7.0 庫存狀態'),
  subStart(206, 'TB', '查詢 SWRCH35K φ7.0 庫存狀態'),
  childTool(207, 'TB', 'execute_database_query', '查詢 SWRCH35K φ7.0 可用庫存', false),
];

/**
 * Every themeable surface in one thread: all message templates, markdown/code rendering, the user
 * bubble, thinking block, tool-call groups (complete / running / errored), the error bubble, plus the
 * docked Task Check List and Subagent panels.
 *
 * The docked panels are opt-out because they claim ~300px above the composer, which leaves the thread
 * itself too short to scan on a laptop.
 */
export function createThemeGalleryMessages(includeDockedPanels: boolean): ConversationMessage[] {
  return [
    section('Text / Hint / Quick replies'),
    createTextTemplateExample(),
    createHintTemplateExample(),

    section('Markdown 與程式碼'),
    markdownShowcase(),

    section('Button / Emit'),
    createButtonTemplateExample(),
    createEmitButtonTemplateExample(),

    section('Carousel'),
    createCarouselTemplateExample(),

    section('Image / Attachment'),
    createImageTemplateExample(320, 320),
    createAttachmentTemplateExample(),

    section('Table'),
    createTableTemplateExample(),

    section('Chart（Vega）'),
    createChartTemplateExample(),

    section('Math'),
    createMathTemplateExample(),

    section('使用者訊息 / Thinking / Tool call'),
    createUserMessageExample('幫我比較各群組的新增數量，順便查一下庫存。'),
    thinkingBlock(),
    ...createToolCallMessages(),
    ...createErrorToolCallMessages(),

    section('錯誤訊息'),
    errorBubble(),

    ...(includeDockedPanels ? DOCKED_PANELS : []),
  ];
}
