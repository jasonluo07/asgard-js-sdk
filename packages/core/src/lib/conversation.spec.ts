import { describe, it, expect } from 'vitest';
import Conversation from './conversation';
import { EventType } from '../constants/enum';
import type { ConversationBotMessage, SseResponse } from '../types';

// F-011 — message stream assembly robustness. The reducer must survive adversarial frame orders
// (missing prefixes, replay duplicates, out-of-order) without dropping text, sticking in typing,
// blanking a completed message, or crashing. The reducer only reads message.messageId + message.text,
// so fixtures stay minimal and are cast for the SseResponse generic.

type MessageEventType = EventType.MESSAGE_START | EventType.MESSAGE_DELTA | EventType.MESSAGE_COMPLETE;

const FACT_KEY: Record<MessageEventType, 'messageStart' | 'messageDelta' | 'messageComplete'> = {
  [EventType.MESSAGE_START]: 'messageStart',
  [EventType.MESSAGE_DELTA]: 'messageDelta',
  [EventType.MESSAGE_COMPLETE]: 'messageComplete',
};

function messageEvent(eventType: MessageEventType, messageId: string, text: string): SseResponse<MessageEventType> {
  return {
    eventType,
    requestId: 'req-1',
    traceId: 'trace-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'ch',
    fact: { [FACT_KEY[eventType]]: { message: { messageId, text } } },
  } as unknown as SseResponse<MessageEventType>;
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
