import { describe, it, expect } from 'vitest';
import Conversation from './conversation';
import { EventType } from '../constants/enum';
import type { ConversationBotMessage, ConversationToolCallMessage, SseResponse } from '../types';

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
    const optimistic = empty().pushMessage({ type: 'user', messageId: 'c1', text: 'hi', time: new Date() });
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
        toolCall: { toolsetName: '', toolName: 'Read', parameter: { file_path: '/a.ts' } },
        toolCallResult,
        ...(isError === undefined ? {} : { isError }),
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
