/**
 * F-029 R9 / R11 (UC-050) — whether a question card is still answerable is derived purely from
 * message order. Nothing local or server-side records it: the answer left as an ordinary message and
 * a rejoin replays every old card as "brand new". Deriving it means refresh, rejoin, and a second
 * device all agree.
 */
import { describe, expect, it } from 'vitest';
import type { ConversationMessage } from '@asgard-js/core';
import { isQuestionResolved } from './is-question-resolved';

function user(messageId: string): ConversationMessage {
  return { type: 'user', messageId, text: 'hi', time: new Date(0) } as ConversationMessage;
}

function bot(messageId: string): ConversationMessage {
  return { type: 'bot', messageId, isTyping: false, typingText: null } as unknown as ConversationMessage;
}

describe('isQuestionResolved', () => {
  it('R9: a card followed by a user message is resolved', () => {
    const messages = [bot('card'), user('u1')];

    expect(isQuestionResolved(messages, 'card')).toBe(true);
  });

  it('UC-050: the last message in the transcript is still answerable', () => {
    const messages = [user('u1'), bot('card')];

    expect(isQuestionResolved(messages, 'card')).toBe(false);
  });

  it('R9: user messages *before* the card do not resolve it', () => {
    // The user message that triggered the card obviously precedes it — only what comes after counts.
    const messages = [user('u1'), bot('card'), bot('answer')];

    expect(isQuestionResolved(messages, 'card')).toBe(false);
  });

  it('UC-050: bot / tool-call traffic after the card does not resolve it', () => {
    const messages = [
      bot('card'),
      { type: 'tool-call', messageId: 't1' } as unknown as ConversationMessage,
      bot('answer'),
    ];

    expect(isQuestionResolved(messages, 'card')).toBe(false);
  });

  it('R9: several historical cards all resolve when a later user message exists', () => {
    const messages = [bot('card1'), user('u1'), bot('card2'), user('u2'), bot('card3')];

    expect(isQuestionResolved(messages, 'card1')).toBe(true);
    expect(isQuestionResolved(messages, 'card2')).toBe(true);
    expect(isQuestionResolved(messages, 'card3')).toBe(false);
  });

  it('R11: an unknown id is treated as unresolved rather than throwing', () => {
    expect(isQuestionResolved([user('u1')], 'missing')).toBe(false);
  });
});
