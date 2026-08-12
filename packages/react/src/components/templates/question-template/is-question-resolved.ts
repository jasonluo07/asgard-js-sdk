import type { ConversationMessage } from '@asgard-js/core';

/**
 * Whether a question card's moment has passed (F-029 R9 / R11, UC-050).
 *
 * The frontend has no way of knowing whether a historical card was actually filled: the answer left
 * as an ordinary user message, the card carries no state, and the server records nothing. So a
 * rejoin replays every old card looking brand new, and rendering them all at full size would bury
 * the transcript under forms that can never be completed.
 *
 * The criterion is therefore purely derived: **if any user message follows the card, its moment has
 * passed** — whether the user filled the form or simply typed something else. Because it reads only
 * message order, refresh, rejoin, and a second device all reach the same answer.
 *
 * An unknown `messageId` counts as unresolved: a card that is not in the transcript cannot have been
 * overtaken by anything.
 */
export function isQuestionResolved(messages: ConversationMessage[], messageId: string): boolean {
  const index = messages.findIndex(message => message.messageId === messageId);

  if (index === -1) return false;

  return messages.slice(index + 1).some(message => message.type === 'user');
}
