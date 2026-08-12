import { describe, expect, it } from 'vitest';
import { ConversationMessage } from '@asgard-js/core';
import { exportConversationToMarkdown } from './export-conversation';

function user(messageId: string, text: string): ConversationMessage {
  return { type: 'user', messageId, text };
}

function conversation(...messages: ConversationMessage[]): Map<string, ConversationMessage> {
  return new Map(messages.map(message => [message.messageId, message]));
}

describe('exportConversationToMarkdown', () => {
  it('keeps the conversation in Map insertion order', () => {
    const markdown = exportConversationToMarkdown(conversation(user('m1', '第一句'), user('m2', '第二句')));

    expect(markdown.indexOf('第一句')).toBeLessThan(markdown.indexOf('第二句'));
  });

  it('carries no per-message timestamp', () => {
    const markdown = exportConversationToMarkdown(conversation(user('m1', '只有內容')));

    // The speaker line is the whole header — a trailing `| <time>` would mean a timestamp came back.
    expect(markdown).toContain('**使用者**\n');
    expect(markdown).not.toMatch(/\*\*使用者\*\*\s*\|/);
  });

  it('still carries the trace id when present', () => {
    const markdown = exportConversationToMarkdown(conversation({ ...user('m1', 'hi'), traceId: 'trace-1' }));

    expect(markdown).toContain('X-Trace-Id: `trace-1`');
  });
});
