import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChatHeader } from './chat-header';

/**
 * A blank `avatar` string ("") is still `typeof "string"`, so a naive check rendered
 * `<img src="">` — the browser resolves that to the current document URL and the image
 * fails to load. The header must fall back the same way it does for `avatar={undefined}`.
 */
describe('ChatHeader avatar', () => {
  it('does not render an <img> when avatar is a blank string', () => {
    const html = renderToStaticMarkup(<ChatHeader botName="Bot" title="Chat" avatar="" />);
    expect(html).not.toContain('<img');
  });

  it('renders an <img> when avatar is a non-blank string', () => {
    const html = renderToStaticMarkup(<ChatHeader botName="Bot" title="Chat" avatar="https://example.com/a.png" />);
    expect(html).toContain('<img');
  });
});
