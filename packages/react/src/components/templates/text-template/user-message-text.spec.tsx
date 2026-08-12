import { type ConversationUserMessage } from '@asgard-js/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TextTemplate } from './text-template';
import { UserMessageText } from './user-message-text';

const userMessage: ConversationUserMessage = {
  type: 'user',
  messageId: 'user-message',
  text: 'User message',
};

describe('UserMessageText', () => {
  it('renders the same bubble as the default user row, so a composed row cannot drift from it', () => {
    const bubble = renderToStaticMarkup(<UserMessageText>User message</UserMessageText>);
    const defaultRow = renderToStaticMarkup(<TextTemplate message={userMessage} />);

    // Guard against a vacuous `toContain`: the bubble must be a classed, themed div, not an empty string.
    expect(bubble).toMatch(/^<div class="[^"]+" style="[^"]+">User message<\/div>$/);
    expect(defaultRow).toContain(bubble);
  });

  it('renders JSX children — the reason a consumer customizes a user message', () => {
    const html = renderToStaticMarkup(
      <UserMessageText>
        <span className="mention">@agent</span> hi
      </UserMessageText>,
    );

    expect(html).toContain('<span class="mention">@agent</span>');
  });

  it('leaves the timestamp to the consumer', () => {
    const html = renderToStaticMarkup(<UserMessageText>User message</UserMessageText>);

    expect(html).not.toContain('asgard-time');
  });
});
