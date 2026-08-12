import { describe, it, expect } from 'vitest';
import Conversation from './conversation';
import { EventType } from '../constants/enum';
import type {
  ConversationBotMessage,
  ConversationSubagentMessage,
  ConversationThinkingMessage,
  ConversationToolCallMessage,
  SseResponse,
} from '../types';

// F-011 — message stream assembly robustness. The reducer must survive adversarial frame orders
// (missing prefixes, replay duplicates, out-of-order) without dropping text, sticking in typing,
// blanking a completed message, or crashing. The reducer only reads message.messageId + message.text,
// so fixtures stay minimal and are cast for the SseResponse generic.

type MessageEventType =
  | EventType.MESSAGE_START
  | EventType.MESSAGE_DELTA
  | EventType.MESSAGE_COMPLETE
  | EventType.MESSAGE_THINKING_START
  | EventType.MESSAGE_THINKING_DELTA
  | EventType.MESSAGE_THINKING_COMPLETE;

const FACT_KEY: Record<MessageEventType, string> = {
  [EventType.MESSAGE_START]: 'messageStart',
  [EventType.MESSAGE_DELTA]: 'messageDelta',
  [EventType.MESSAGE_COMPLETE]: 'messageComplete',
  [EventType.MESSAGE_THINKING_START]: 'messageThinkingStart',
  [EventType.MESSAGE_THINKING_DELTA]: 'messageThinkingDelta',
  [EventType.MESSAGE_THINKING_COMPLETE]: 'messageThinkingComplete',
};

function messageEvent(eventType: MessageEventType, messageId: string, text: string): SseResponse<EventType> {
  return {
    eventType,
    requestId: 'req-1',
    traceId: 'trace-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { [FACT_KEY[eventType]]: { message: { messageId, text } } },
  } as unknown as SseResponse<EventType>;
}

function getBot(conv: Conversation, messageId: string): ConversationBotMessage | undefined {
  const message = conv.messages?.get(messageId);

  return message?.type === 'bot' ? message : undefined;
}

describe('Conversation — message assembly robustness (F-011)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  it('UC-017: complete-only materializes the terminal from its own frame (no start/delta)', () => {
    const conv = empty().onMessage(messageEvent(EventType.MESSAGE_COMPLETE, 'm1', 'done'));
    expect(getBot(conv, 'm1')).toMatchObject({ isTyping: false, message: { text: 'done' } });
    expect(conv.messages?.size).toBe(1);
  });

  it('UC-017: delta before start lazy-creates the entry and accumulates (never dropped)', () => {
    const conv = empty()
      .onMessage(messageEvent(EventType.MESSAGE_DELTA, 'm2', 'Hello '))
      .onMessage(messageEvent(EventType.MESSAGE_DELTA, 'm2', 'world'));
    expect(getBot(conv, 'm2')).toMatchObject({ isTyping: true, typingText: 'Hello world' });
  });

  it('UC-018: late start / delta after complete are ignored (no regression to typing)', () => {
    const completed = empty().onMessage(messageEvent(EventType.MESSAGE_COMPLETE, 'm3', 'final'));

    const afterLateStart = completed.onMessage(messageEvent(EventType.MESSAGE_START, 'm3', ''));
    expect(getBot(afterLateStart, 'm3')).toMatchObject({ isTyping: false, message: { text: 'final' } });

    const afterLateDelta = afterLateStart.onMessage(messageEvent(EventType.MESSAGE_DELTA, 'm3', 'late'));
    expect(getBot(afterLateDelta, 'm3')).toMatchObject({ isTyping: false, message: { text: 'final' } });
    expect(afterLateDelta.messages?.size).toBe(1);
  });

  it('UC-018: duplicate complete stays idempotent (terminal, single message)', () => {
    const conv = empty()
      .onMessage(messageEvent(EventType.MESSAGE_COMPLETE, 'm4', 'x'))
      .onMessage(messageEvent(EventType.MESSAGE_COMPLETE, 'm4', 'x'));
    expect(getBot(conv, 'm4')).toMatchObject({ isTyping: false });
    expect(conv.messages?.size).toBe(1);
  });

  it('normal start → delta×N → complete assembles then finalizes', () => {
    const conv = empty()
      .onMessage(messageEvent(EventType.MESSAGE_START, 'm5', ''))
      .onMessage(messageEvent(EventType.MESSAGE_DELTA, 'm5', 'a'))
      .onMessage(messageEvent(EventType.MESSAGE_DELTA, 'm5', 'b'));
    expect(getBot(conv, 'm5')).toMatchObject({ isTyping: true, typingText: 'ab' });

    const done = conv.onMessage(messageEvent(EventType.MESSAGE_COMPLETE, 'm5', 'ab'));
    expect(getBot(done, 'm5')).toMatchObject({ isTyping: false, message: { text: 'ab' } });
  });
});

// F-014 — transcript cold-start replay: the new `message.user` event + dedup vs the optimistic bubble.

function userEvent(
  messageId: string,
  text: string,
  extra?: { customMessageId?: string; identityHint?: string; blobIds?: string[] },
): SseResponse<EventType> {
  return {
    eventType: EventType.MESSAGE_USER,
    requestId: 'req-1',
    traceId: 'trace-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { messageUser: { messageId, text, ...extra } },
  } as unknown as SseResponse<EventType>;
}

function getUser(conv: Conversation, messageId: string): { type: 'user'; text: string } | undefined {
  const message = conv.messages?.get(messageId);

  return message?.type === 'user' ? message : undefined;
}

describe('Conversation — transcript replay: message.user (F-014)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  it('assembles message.user into a user message with all fields', () => {
    const conv = empty().onMessage(
      userEvent('u-backend-1', 'hi', { customMessageId: 'c1', identityHint: 'user-a', blobIds: ['b1'] }),
    );
    expect(getUser(conv, 'u-backend-1')).toMatchObject({
      type: 'user',
      text: 'hi',
      customMessageId: 'c1',
      identityHint: 'user-a',
      blobIds: ['b1'],
    });
  });

  it('cold rejoin: a message.user with no optimistic match is added', () => {
    const conv = empty().onMessage(userEvent('u-1', 'hello'));
    expect(getUser(conv, 'u-1')?.text).toBe('hello');
    expect(conv.messages?.size).toBe(1);
  });

  it('dedup: a replay matching the optimistic bubble (by customMessageId) is skipped', () => {
    // The optimistic bubble is keyed by the customMessageId the client generated (channel.sendMessage).
    const optimistic = empty().pushMessage({ type: 'user', messageId: 'c1', text: 'hi' });
    // The rejoin replays that turn with a backend messageId + the same customMessageId.
    const after = optimistic.onMessage(userEvent('u-backend-1', 'hi', { customMessageId: 'c1' }));
    expect(after.messages?.size).toBe(1);
    expect(getUser(after, 'c1')?.text).toBe('hi');
    expect(getUser(after, 'u-backend-1')).toBeUndefined();
  });

  it('replay of message.user + a self-sufficient message.complete (no start/delta) assembles both', () => {
    const conv = empty()
      .onMessage(userEvent('u-1', '問題'))
      .onMessage(messageEvent(EventType.MESSAGE_COMPLETE, 'a-1', '回答'));
    expect(getUser(conv, 'u-1')?.text).toBe('問題');
    expect(getBot(conv, 'a-1')).toMatchObject({ isTyping: false, message: { text: '回答' } });
    expect(conv.messages?.size).toBe(2);
  });
});

// F-001 — extended-thinking assembly: a separate `thinking` variant, mirroring F-011 robustness.

function getThinking(
  conv: Conversation,
  messageId: string,
): { type: 'thinking'; text: string; isThinking: boolean } | undefined {
  const message = conv.messages?.get(messageId);

  return message?.type === 'thinking' ? message : undefined;
}

describe('Conversation — extended-thinking assembly (F-001)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  it('UC-001/002: start → delta×N → complete streams then settles the block', () => {
    const streaming = empty()
      .onMessage(messageEvent(EventType.MESSAGE_THINKING_START, 't1', ''))
      .onMessage(messageEvent(EventType.MESSAGE_THINKING_DELTA, 't1', 'Let me '))
      .onMessage(messageEvent(EventType.MESSAGE_THINKING_DELTA, 't1', 'think.'));
    expect(getThinking(streaming, 't1')).toMatchObject({ isThinking: true, text: 'Let me think.' });

    const done = streaming.onMessage(messageEvent(EventType.MESSAGE_THINKING_COMPLETE, 't1', 'Let me think.'));
    expect(getThinking(done, 't1')).toMatchObject({ isThinking: false, text: 'Let me think.' });
    expect(done.messages?.size).toBe(1);
  });

  it('UC-002: complete-only materializes the block from its own frame (self-sufficient, no start/delta)', () => {
    const conv = empty().onMessage(messageEvent(EventType.MESSAGE_THINKING_COMPLETE, 't2', 'final reasoning'));
    expect(getThinking(conv, 't2')).toMatchObject({ isThinking: false, text: 'final reasoning' });
    expect(conv.messages?.size).toBe(1);
  });

  it('UC-001: delta before start lazy-creates the block and accumulates (never dropped)', () => {
    const conv = empty()
      .onMessage(messageEvent(EventType.MESSAGE_THINKING_DELTA, 't3', 'a'))
      .onMessage(messageEvent(EventType.MESSAGE_THINKING_DELTA, 't3', 'b'));
    expect(getThinking(conv, 't3')).toMatchObject({ isThinking: true, text: 'ab' });
  });

  it('terminal guard: late start / delta after complete are ignored (no regression to streaming)', () => {
    const completed = empty().onMessage(messageEvent(EventType.MESSAGE_THINKING_COMPLETE, 't4', 'done'));

    const afterLateStart = completed.onMessage(messageEvent(EventType.MESSAGE_THINKING_START, 't4', ''));
    expect(getThinking(afterLateStart, 't4')).toMatchObject({ isThinking: false, text: 'done' });

    const afterLateDelta = afterLateStart.onMessage(messageEvent(EventType.MESSAGE_THINKING_DELTA, 't4', 'late'));
    expect(getThinking(afterLateDelta, 't4')).toMatchObject({ isThinking: false, text: 'done' });
    expect(afterLateDelta.messages?.size).toBe(1);
  });

  it('thinking and the bot answer coexist as separate messages', () => {
    const conv = empty()
      .onMessage(messageEvent(EventType.MESSAGE_THINKING_COMPLETE, 't5', 'reasoning'))
      .onMessage(messageEvent(EventType.MESSAGE_COMPLETE, 'a5', 'answer'));
    expect(getThinking(conv, 't5')).toMatchObject({ isThinking: false, text: 'reasoning' });
    expect(getBot(conv, 'a5')).toMatchObject({ isTyping: false, message: { text: 'answer' } });
    expect(conv.messages?.size).toBe(2);
  });
});

// BUG-001 — subagent message / thinking frames carry a non-empty `parentToolUseId` (the toolUseId of the
// Agent call that spawned them). The reducer must NOT materialize these into the main conversation: at this
// stage they are hidden entirely (accumulating them into a subagent sub-conversation is backlog, out of scope).
function subagentMessageEvent(
  eventType: MessageEventType,
  messageId: string,
  text: string,
  parentToolUseId: string,
): SseResponse<EventType> {
  return {
    eventType,
    requestId: 'req-1',
    traceId: 'trace-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { [FACT_KEY[eventType]]: { message: { messageId, text, parentToolUseId } } },
  } as unknown as SseResponse<EventType>;
}

describe('Conversation — subagent message/thinking are hidden (BUG-001)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  it('drops a subagent message-complete frame (non-empty parentToolUseId)', () => {
    const conv = empty().onMessage(
      subagentMessageEvent(EventType.MESSAGE_COMPLETE, 'sub-1', 'internal coordination', 'toolu_parent'),
    );
    expect(getBot(conv, 'sub-1')).toBeUndefined();
    expect(conv.messages?.size).toBe(0);
  });

  it('drops subagent message start / delta frames (never lazy-created)', () => {
    const conv = empty()
      .onMessage(subagentMessageEvent(EventType.MESSAGE_START, 'sub-2', '', 'toolu_parent'))
      .onMessage(subagentMessageEvent(EventType.MESSAGE_DELTA, 'sub-2', 'partial', 'toolu_parent'));
    expect(conv.messages?.size).toBe(0);
  });

  it('drops a subagent thinking-complete frame (non-empty parentToolUseId)', () => {
    const conv = empty().onMessage(
      subagentMessageEvent(EventType.MESSAGE_THINKING_COMPLETE, 'sub-3', 'private reasoning', 'toolu_parent'),
    );
    expect(conv.messages?.size).toBe(0);
  });

  it('keeps main-agent messages while hiding interleaved subagent messages', () => {
    const conv = empty()
      .onMessage(messageEvent(EventType.MESSAGE_COMPLETE, 'main-1', 'visible answer'))
      .onMessage(subagentMessageEvent(EventType.MESSAGE_COMPLETE, 'sub-4', 'hidden', 'toolu_parent'));
    expect(getBot(conv, 'main-1')).toMatchObject({ isTyping: false, message: { text: 'visible answer' } });
    expect(getBot(conv, 'sub-4')).toBeUndefined();
    expect(conv.messages?.size).toBe(1);
  });
});

// F-009 — tool-call failure detection: `onToolCallComplete` carries the backend `isError` flag onto the
// tool-call message (omitempty → absent means not-failed). The react layer reads it for the error status.

function toolCallStartEvent(processId: string, callSeq: number): SseResponse<EventType> {
  return {
    eventType: EventType.TOOL_CALL_START,
    requestId: 'req-1',
    traceId: 'trace-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: {
      toolCallStart: {
        processId,
        callSeq,
        toolCall: { toolsetName: '', toolName: 'Read', parameter: { file_path: '/a.ts' } },
      },
    },
  } as unknown as SseResponse<EventType>;
}

function toolCallCompleteEvent(
  processId: string,
  callSeq: number,
  toolCallResult: Record<string, unknown>,
  isError?: boolean,
  toolUseResultSidecar?: Record<string, unknown>,
  ids?: { toolUseId?: string; parentToolUseId?: string },
): SseResponse<EventType> {
  return {
    eventType: EventType.TOOL_CALL_COMPLETE,
    requestId: 'req-1',
    traceId: 'trace-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: {
      toolCallComplete: {
        processId,
        callSeq,
        ...(ids?.toolUseId === undefined ? {} : { toolUseId: ids.toolUseId }),
        ...(ids?.parentToolUseId === undefined ? {} : { parentToolUseId: ids.parentToolUseId }),
        toolCall: { toolsetName: '', toolName: 'Read', parameter: { file_path: '/a.ts' } },
        toolCallResult,
        ...(isError === undefined ? {} : { isError }),
        ...(toolUseResultSidecar === undefined ? {} : { toolUseResultSidecar }),
      },
    },
  } as unknown as SseResponse<EventType>;
}

function getToolCall(conv: Conversation, key: string): ConversationToolCallMessage | undefined {
  const message = conv.messages?.get(key);

  return message?.type === 'tool-call' ? message : undefined;
}

describe('Conversation — tool-call failure detection (F-009)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  it('R1: complete with isError:true carries the flag onto the completed tool-call message', () => {
    const conv = empty()
      .onMessage(toolCallStartEvent('p', 0))
      .onMessage(toolCallCompleteEvent('p', 0, { text: 'permission denied' }, true));
    expect(getToolCall(conv, 'p-0')).toMatchObject({ isComplete: true, isError: true });
  });

  it('R4: an omitted isError (omitempty) leaves the flag falsy → not-failed', () => {
    const conv = empty()
      .onMessage(toolCallStartEvent('p', 1))
      .onMessage(toolCallCompleteEvent('p', 1, { text: 'ok' }));
    const toolCall = getToolCall(conv, 'p-1');
    expect(toolCall?.isComplete).toBe(true);
    expect(toolCall?.isError).toBeFalsy();
  });

  it('R3: the result.error fallback is preserved on the message (isError absent, result carries error)', () => {
    const conv = empty()
      .onMessage(toolCallStartEvent('p', 2))
      .onMessage(toolCallCompleteEvent('p', 2, { error: 'boom' }));
    const toolCall = getToolCall(conv, 'p-2');
    expect(toolCall?.isError).toBeFalsy();
    expect(toolCall?.result).toMatchObject({ error: 'boom' });
  });
});

// F-010 — `onToolCallComplete` carries the structured `toolUseResultSidecar` onto the message, so the
// task reducer can read the authoritative id / statusChange without parsing the result string.

describe('Conversation — tool-call sidecar plumbing (F-010)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  it('carries toolUseResultSidecar onto the completed tool-call message', () => {
    const sidecar = { task: { id: '1', subject: 'a' } };
    const conv = empty()
      .onMessage(toolCallStartEvent('p', 0))
      .onMessage(toolCallCompleteEvent('p', 0, { text: 'ok' }, undefined, sidecar));
    expect(getToolCall(conv, 'p-0')?.sidecar).toMatchObject(sidecar);
  });

  it('leaves sidecar undefined when the complete event omits it', () => {
    const conv = empty()
      .onMessage(toolCallStartEvent('p', 1))
      .onMessage(toolCallCompleteEvent('p', 1, { text: 'ok' }));
    expect(getToolCall(conv, 'p-1')?.sidecar).toBeUndefined();
  });
});

// F-012 — subagent lifecycle + tool-call id plumbing. `onToolCallStart` carries toolUseId /
// parentToolUseId; `onSubagentStart/Complete` store a `subagent` message keyed by parentToolUseId.

function agentToolStartEvent(processId: string, callSeq: number, toolUseId: string): SseResponse<EventType> {
  return {
    eventType: EventType.TOOL_CALL_START,
    requestId: 'req-1',
    traceId: 'trace-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: {
      toolCallStart: {
        processId,
        callSeq,
        toolUseId,
        toolCall: { toolsetName: '', toolName: 'Agent', parameter: { description: 'sub' } },
      },
    },
  } as unknown as SseResponse<EventType>;
}

function subagentStartEvent(parentToolUseId: string, agentId: string): SseResponse<EventType> {
  return {
    eventType: EventType.SUBAGENT_START,
    requestId: 'req-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { subagentStart: { agentId, parentToolUseId, subagentType: 'general-purpose', description: 'd' } },
  } as unknown as SseResponse<EventType>;
}

function subagentCompleteEvent(parentToolUseId: string, status: string): SseResponse<EventType> {
  return {
    eventType: EventType.SUBAGENT_COMPLETE,
    requestId: 'req-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { subagentComplete: { agentId: 'Y', parentToolUseId, status, summary: 'done' } },
  } as unknown as SseResponse<EventType>;
}

function getSubagent(conv: Conversation, key: string): ConversationSubagentMessage | undefined {
  const message = conv.messages?.get(key);

  return message?.type === 'subagent' ? message : undefined;
}

describe('Conversation — subagent events + id plumbing (F-012)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  it('onToolCallStart carries toolUseId / parentToolUseId onto the message', () => {
    const conv = empty().onMessage(agentToolStartEvent('p', 0, 'X'));
    expect(getToolCall(conv, 'p-0')).toMatchObject({ toolName: 'Agent', toolUseId: 'X' });
  });

  it('onSubagentStart stores a subagent start message keyed by parentToolUseId', () => {
    const conv = empty().onMessage(subagentStartEvent('X', 'Y'));
    expect(getSubagent(conv, 'subagent:X:start')).toMatchObject({
      kind: 'start',
      parentToolUseId: 'X',
      agentId: 'Y',
      subagentType: 'general-purpose',
    });
  });

  it('onSubagentComplete stores a subagent complete message with the terminal status', () => {
    const conv = empty().onMessage(subagentCompleteEvent('X', 'completed'));
    expect(getSubagent(conv, 'subagent:X:complete')).toMatchObject({
      kind: 'complete',
      parentToolUseId: 'X',
      status: 'completed',
      summary: 'done',
    });
  });

  it('start and complete coexist as separate keyed entries', () => {
    const conv = empty().onMessage(subagentStartEvent('X', 'Y')).onMessage(subagentCompleteEvent('X', 'failed'));
    expect(getSubagent(conv, 'subagent:X:start')?.kind).toBe('start');
    expect(getSubagent(conv, 'subagent:X:complete')?.status).toBe('failed');
  });

  // Issue #382 — a resumed subagent re-emits `start` / `complete` under the SAME key. `Map.set` keeps an
  // existing key at its original position, so a plain overwrite would leave the resume folded back at the
  // first run's slot; `deriveSubagents` reads insertion order as arrival order, so the second `complete`
  // would land *before* the resumed run's child tool-calls and the card would never settle again.
  it('a re-emitted subagent start moves to the tail, preserving arrival order (issue #382)', () => {
    const conv = empty()
      .onMessage(subagentStartEvent('X', 'Y'))
      .onMessage(subagentCompleteEvent('X', 'completed'))
      .onMessage(subagentStartEvent('X', 'Y'));

    expect(Array.from(conv.messages?.keys() ?? [])).toEqual(['subagent:X:complete', 'subagent:X:start']);
  });

  it('a re-emitted subagent complete moves to the tail, preserving arrival order (issue #382)', () => {
    const conv = empty()
      .onMessage(subagentStartEvent('X', 'Y'))
      .onMessage(subagentCompleteEvent('X', 'completed'))
      .onMessage(subagentStartEvent('X', 'Y'))
      .onMessage(subagentCompleteEvent('X', 'failed'));

    expect(Array.from(conv.messages?.keys() ?? [])).toEqual(['subagent:X:start', 'subagent:X:complete']);
    expect(getSubagent(conv, 'subagent:X:complete')?.status).toBe('failed');
  });
});

// F-020 AC10 — stop-generation converges any still-running tool-call to `cancelled` so it never lingers
// as `running` after the run is aborted.
describe('Conversation — cancel in-flight tool-calls on stop (F-020 AC10)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  function toolCall(messageId: string, isComplete: boolean): ConversationToolCallMessage {
    return {
      type: 'tool-call',
      messageId,
      eventType: isComplete ? EventType.TOOL_CALL_COMPLETE : EventType.TOOL_CALL_START,
      processId: 'p1',
      callSeq: 0,
      toolName: 'Bash',
      toolsetName: '',
      parameter: {},
      isComplete,
    };
  }

  it('converges a running tool-call to isComplete + isCancelled, leaving settled ones untouched', () => {
    const conv = empty()
      .pushMessage(toolCall('running', false))
      .pushMessage(toolCall('done', true))
      .pushMessage({ type: 'user', messageId: 'u1', text: 'hi' });

    const settled = conv.settleInFlightMessages();

    const running = settled.messages?.get('running') as ConversationToolCallMessage;
    expect(running.isComplete).toBe(true);
    expect(running.isCancelled).toBe(true);

    const done = settled.messages?.get('done') as ConversationToolCallMessage;
    expect(done.isCancelled).toBeUndefined(); // already settled — untouched

    expect(settled.messages?.get('u1')?.type).toBe('user'); // non-tool-call untouched
  });

  it('is a no-op (same instance) when nothing is in flight', () => {
    const conv = empty().pushMessage(toolCall('done', true));
    expect(conv.settleInFlightMessages()).toBe(conv);
  });

  // F-023 — regression: stopping a real run *mid-thinking* left the block highlighted as "Thinking…"
  // forever, because `message.thinking.complete` never arrives for a suspended turn. Every earlier
  // test and the demo mock happened to interrupt after thinking had finished, so this path was blind.
  it('settles a streaming thinking block, keeping its text', () => {
    const conv = empty()
      .pushMessage({ type: 'thinking', messageId: 't1', text: '想到一半', isThinking: true })
      .pushMessage({ type: 'thinking', messageId: 't2', text: '早就想完了', isThinking: false });

    const settled = conv.settleInFlightMessages();

    const streaming = settled.messages?.get('t1') as ConversationThinkingMessage;
    expect(streaming.isThinking).toBe(false);
    expect(streaming.text).toBe('想到一半'); // content preserved, never rolled back

    expect((settled.messages?.get('t2') as ConversationThinkingMessage).isThinking).toBe(false);
  });

  it('settles a thinking block and a running tool-call in the same pass', () => {
    const conv = empty()
      .pushMessage(toolCall('running', false))
      .pushMessage({ type: 'thinking', messageId: 't1', text: '…', isThinking: true });

    const settled = conv.settleInFlightMessages();

    expect((settled.messages?.get('running') as ConversationToolCallMessage).isCancelled).toBe(true);
    expect((settled.messages?.get('t1') as ConversationThinkingMessage).isThinking).toBe(false);
  });

  it('keeps the deprecated cancelInFlightToolCalls alias behaving identically', () => {
    const conv = empty().pushMessage({
      type: 'thinking',
      messageId: 't1',
      text: '…',
      isThinking: true,
    });

    expect((conv.cancelInFlightToolCalls().messages?.get('t1') as ConversationThinkingMessage).isThinking).toBe(false);
  });
});

// BUG-009 / sdk-pm#48 — GET rejoin 只回放終局事件：`tool_call.complete` 到達時**沒有**先前的
// `tool_call.start`。reducer 原本只在既有訊息存在時才更新，於是整筆被靜默丟棄，重進對話後所有工具
// 呼叫區塊消失。complete 事件本身帶著 `toolCall.*` 與關聯 id（`ToolCallCompleteEventData extends
// ToolCallBaseEventData`），足以獨立成一筆完整訊息。
describe('Conversation — tool-call replay without a preceding start (BUG-009)', () => {
  const empty = (): Conversation => new Conversation({ messages: new Map() });

  it('creates a completed tool-call when only the complete frame arrives', () => {
    const conv = empty().onMessage(toolCallCompleteEvent('p', 0, { text: 'file contents' }));
    const toolCall = getToolCall(conv, 'p-0');

    expect(toolCall).toBeDefined();
    expect(toolCall?.isComplete).toBe(true);
    expect(toolCall?.eventType).toBe(EventType.TOOL_CALL_COMPLETE);
    expect(toolCall?.toolName).toBe('Read');
    expect(toolCall?.parameter).toEqual({ file_path: '/a.ts' });
    expect(toolCall?.result).toEqual({ text: 'file contents' });
  });

  it('carries the failure flag through on a replayed complete', () => {
    const conv = empty().onMessage(toolCallCompleteEvent('p', 1, { text: 'permission denied' }, true));

    expect(getToolCall(conv, 'p-1')?.isError).toBe(true);
  });

  it('keeps the structured sidecar on a replayed complete', () => {
    const sidecar = { task: { id: 't-1', subject: 'do it' } };
    const conv = empty().onMessage(toolCallCompleteEvent('p', 2, { text: 'ok' }, undefined, sidecar));

    expect(getToolCall(conv, 'p-2')?.sidecar).toEqual(sidecar);
  });

  // 子代理的工具呼叫靠 `parentToolUseId` 掛回 Agent（F-012）；補建時丟掉它，重播後的 subagent 樹會散掉。
  it('preserves the correlation ids so replayed subagent tool-calls still group', () => {
    const conv = empty().onMessage(
      toolCallCompleteEvent('p', 3, { text: 'ok' }, undefined, undefined, {
        toolUseId: 'tu-9',
        parentToolUseId: 'tu-parent',
      }),
    );
    const toolCall = getToolCall(conv, 'p-3');

    expect(toolCall?.toolUseId).toBe('tu-9');
    expect(toolCall?.parentToolUseId).toBe('tu-parent');
  });

  // 反例守衛：complete 先補建出完成態之後，一個遲到／亂序的 start 不得把它打回執行中——那會同時丟掉
  // result/isError/sidecar，而且 `isComplete` 正是 Task 清單（derived-stores）的折疊條件，倒退會讓
  // 那筆任務從清單消失，且不會再有 complete 來修復。
  it('ignores a late start frame after the tool-call already completed', () => {
    const conv = empty()
      .onMessage(toolCallCompleteEvent('p', 5, { text: 'done' }))
      .onMessage(toolCallStartEvent('p', 5));
    const toolCall = getToolCall(conv, 'p-5');

    expect(conv.messages?.size).toBe(1);
    expect(toolCall?.isComplete).toBe(true);
    expect(toolCall?.result).toEqual({ text: 'done' });
    expect(toolCall?.eventType).toBe(EventType.TOOL_CALL_COMPLETE);
  });

  it('still updates in place when the start frame did arrive (live run unchanged)', () => {
    const conv = empty()
      .onMessage(toolCallStartEvent('p', 4))
      .onMessage(toolCallCompleteEvent('p', 4, { text: 'ok' }));

    expect(conv.messages?.size).toBe(1);
    expect(getToolCall(conv, 'p-4')?.isComplete).toBe(true);
  });
});
