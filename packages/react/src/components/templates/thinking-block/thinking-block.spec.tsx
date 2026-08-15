// @vitest-environment jsdom
import { type ConversationThinkingMessage } from '@asgard-js/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '../../../i18n';
import { ThinkingBlock } from './thinking-block';

/**
 * asgard-js-sdk#417 §5 — both of this component's toggles were invisible to assistive tech: the header
 * carried no `aria-expanded` at all (so a screen reader announced a plain button and never said whether
 * the reasoning was open), and neither button pointed at the region it controls. The error bubble had the
 * same shape and is fixed alongside in `hint-template`.
 *
 * The inner `show more` only exists past the 160-character preview limit, which the react-demo's seeded
 * transcript does not reach — so it is pinned here rather than in the browser.
 */
const LONG_REASONING =
  'The user is asking about flange bolt lead times. I should check the order volume by channel first, ' +
  'then look at the SWRCH35K stock level, and only then work out whether the shortfall can be covered ' +
  'by the alternative grade within the promised window.';

function thinking(text: string, isThinking = false): ConversationThinkingMessage {
  return {
    type: 'thinking',
    messageId: 'thinking-1',
    text,
    isThinking,
    time: new Date('2026-08-15T00:00:00.000Z'),
  };
}

describe('ThinkingBlock accessibility (#417 §5)', () => {
  afterEach(cleanup);

  it('announces the header as a collapsed disclosure and points it at the body once open', () => {
    render(<ThinkingBlock message={thinking('short reasoning')} />);

    const header = screen.getByRole('button', { name: t('en-US', 'thinking.summary') });

    expect(header.getAttribute('aria-expanded')).toBe('false');
    // Collapsed: the body is unmounted, so there must be no dangling IDREF.
    expect(header.getAttribute('aria-controls')).toBeNull();

    fireEvent.click(header);

    expect(header.getAttribute('aria-expanded')).toBe('true');

    const controls = header.getAttribute('aria-controls');

    expect(controls).toBeTruthy();
    expect(document.getElementById(controls as string)).toBeTruthy();
  });

  it('gives the inner show more its own expanded state and target', () => {
    render(<ThinkingBlock message={thinking(LONG_REASONING)} />);

    fireEvent.click(screen.getByRole('button', { name: t('en-US', 'thinking.summary') }));

    const more = screen.getByRole('button', { name: t('en-US', 'thinking.showMore') });

    expect(more.getAttribute('aria-expanded')).toBe('false');
    // This one grows text in place rather than mounting a region, so its target is always present.
    expect(document.getElementById(more.getAttribute('aria-controls') as string)).toBeTruthy();

    fireEvent.click(more);

    expect(screen.getByRole('button', { name: t('en-US', 'thinking.showLess') }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('reports the streaming header as expanded, since streaming is always open', () => {
    render(<ThinkingBlock message={thinking('partial reasoning', true)} />);

    const header = screen.getByRole('button', { name: t('en-US', 'thinking.streaming') });

    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(header.getAttribute('aria-controls') as string)).toBeTruthy();
  });
});
