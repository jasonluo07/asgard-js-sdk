// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AsgardThemeContextProvider,
  AsgardThemeContextValue,
  DEFAULT_CONTENT_MAX_WIDTH,
  useAsgardThemeContext,
} from './asgard-theme-context';

/**
 * asgard-sdk-pm#54 — the chat column's default cap moved from 1200px to 800px so a line of bot text stays
 * inside the 45–90 English-character band. The number is a PM-tuned value that will be revisited, and it is
 * mirrored by `$chat-content-max-width` in `styles/layout/_variables.scss`, so pin both halves of the
 * contract here: the default the three chat-column regions fall back to, and the consumer override that has
 * to keep winning over it (Mimir / Sindri / Odin all set their own).
 */
function resolve(theme?: Partial<AsgardThemeContextValue>): AsgardThemeContextValue {
  let seen!: AsgardThemeContextValue;

  function Probe(): ReactNode {
    seen = useAsgardThemeContext();

    return null;
  }

  render(
    <AsgardThemeContextProvider theme={theme}>
      <Probe />
    </AsgardThemeContextProvider>,
  );

  return seen;
}

describe('asgard-sdk-pm#54 content column width', () => {
  afterEach(cleanup);

  it('caps the chat column at 800px when the consumer sets no contentMaxWidth', () => {
    expect(DEFAULT_CONTENT_MAX_WIDTH).toBe('800px');
    expect(resolve().chatbot?.contentMaxWidth).toBe(DEFAULT_CONTENT_MAX_WIDTH);
  });

  it('still lets a consumer-supplied contentMaxWidth win over the default', () => {
    const resolved = resolve({ chatbot: { contentMaxWidth: '1440px' } });

    expect(resolved.chatbot?.contentMaxWidth).toBe('1440px');
  });
});
