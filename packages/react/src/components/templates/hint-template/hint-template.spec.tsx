// @vitest-environment jsdom
import {
  EventType,
  MessageTemplateType,
  type ConversationBotMessage,
  type ConversationErrorMessage,
} from '@asgard-js/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AsgardTemplateContext } from '../../../context';
import { t } from '../../../i18n';
import { HintTemplate } from './hint-template';

// #417 §5 — the toggle's accessible name carries its error's summary, so a thread with several error
// bubbles no longer reads as a list of identical "Show more" buttons. These match the leading label and
// ignore whatever summary follows.
const showDetailsName = new RegExp(`^${t('en-US', 'error.showDetails')}:`);
const hideDetailsName = new RegExp(`^${t('en-US', 'error.hideDetails')}:`);

const message: ConversationBotMessage = {
  type: 'bot',
  messageId: 'hint-message',
  eventType: EventType.MESSAGE_COMPLETE,
  isTyping: false,
  typingText: null,
  message: {
    messageId: 'hint-message',
    replyToCustomMessageId: 'user-message',
    text: 'Current location: Taipei',
    payload: null,
    isDebug: false,
    idx: null,
    template: {
      type: MessageTemplateType.HINT,
      text: 'Current location: Taipei',
      quickReplies: [],
    },
  },
  time: new Date('2026-07-31T00:00:00.000Z'),
  raw: '',
};

describe('HintTemplate message chrome', () => {
  it('renders bot hints without a timestamp', () => {
    const html = renderToStaticMarkup(<HintTemplate message={message} />);

    expect(html).toContain('Current location: Taipei');
    expect(html).not.toContain('asgard-time');
    expect(html).not.toMatch(/\d{1,2}:\d{2}/);
  });
});

/**
 * A run that dies on an admission-denied Sandbox (workspace quota / lapsed subscription) reports
 * the reason in `asgard.run.error`'s `message`. The bubble used to render a fixed "Unexpected
 * error" and drop it, leaving the user with nothing actionable and no way to see what happened.
 */
const QUOTA_REASON = 'sandbox provision seconds quota exceeded for workspace ws_42: used 3600 / 3600 this period';

function errorMessage(error?: Partial<ConversationErrorMessage['error']>, traceId?: string): ConversationErrorMessage {
  return {
    type: 'error',
    messageId: 'err-1',
    eventType: EventType.ERROR,
    error: {
      message: QUOTA_REASON,
      code: 'QUOTA_EXCEED',
      inner: '',
      location: { namespace: '', workflowName: '', processorName: '', processorType: '' },
      ...error,
    },
    time: new Date('2026-07-31T00:00:00.000Z'),
    traceId,
  };
}

describe('HintTemplate error bubble', () => {
  afterEach(cleanup);

  it("shows the backend's error message instead of a fixed string", () => {
    render(<HintTemplate message={errorMessage()} />);

    expect(screen.getByText(QUOTA_REASON)).toBeTruthy();
    expect(screen.queryByText(t('en-US', 'error.unexpected'))).toBeNull();
  });

  it('falls back to "Unexpected error" when the event carries no message', () => {
    render(<HintTemplate message={errorMessage({ message: '   ' })} />);

    expect(screen.getByText(t('en-US', 'error.unexpected'))).toBeTruthy();
  });

  it('keeps diagnostics collapsed until the user asks for them', () => {
    render(<HintTemplate message={errorMessage({ inner: 'admission webhook denied the request' }, 'trace-abc')} />);

    // Assert on the dump element, not on the strings inside it: testing-library matches a node's
    // whole text, and the dump is one text node holding the entire JSON — so `queryByText('QUOTA_EXCEED')`
    // returns null whether it is collapsed or not, and would pin nothing.
    expect(screen.queryByText(text => text.trimStart().startsWith('{'))).toBeNull();
    expect(screen.getByRole('button', { name: showDetailsName })).toBeTruthy();
  });

  // The expanded region dumps the whole payload as JSON rather than picking fields out, so that a
  // field the backend adds later shows up without a UI change. Assert on the blob's contents.
  it('reveals the whole error payload as JSON on expand, and hides it again', () => {
    render(<HintTemplate message={errorMessage({ inner: 'admission webhook denied the request' }, 'trace-abc')} />);

    fireEvent.click(screen.getByRole('button', { name: showDetailsName }));

    const dump = screen.getByText(text => text.trimStart().startsWith('{'));
    const parsed = JSON.parse(dump.textContent ?? '');

    expect(parsed.code).toBe('QUOTA_EXCEED');
    expect(parsed.traceId).toBe('trace-abc');
    expect(parsed.inner).toBe('admission webhook denied the request');
    // Whatever the backend adds next rides along without a UI change — `location` is here today.
    expect(parsed).toHaveProperty('location');

    fireEvent.click(screen.getByRole('button', { name: hideDetailsName }));

    expect(screen.queryByText(text => text.trimStart().startsWith('{'))).toBeNull();
  });

  // The summary already shows `message`, so an event carrying nothing else must not offer a toggle
  // that reveals only what is on screen. `location` arrives fully blank here, which also does not count.
  it('omits the toggle when there is nothing to reveal beyond the summary', () => {
    render(<HintTemplate message={errorMessage({ code: '', inner: '' })} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers the toggle as soon as one diagnostic field is present', () => {
    render(<HintTemplate message={errorMessage({ code: '', inner: '' }, 'trace-only')} />);

    expect(screen.getByRole('button', { name: showDetailsName })).toBeTruthy();
  });

  // The whole point of dumping the payload instead of picking fields: a field this UI has never heard
  // of still has to open the toggle. `location` stands in for "whatever the backend adds next" — none
  // of `code` / `inner` / `traceId` is set here, so a hand-picked check would call this empty and hide
  // the only diagnostic the event carries.
  it('offers the toggle for a field outside the known three', () => {
    const location = { namespace: 'ns-42', workflowName: '', processorName: '', processorType: '' };

    render(<HintTemplate message={errorMessage({ code: '', inner: '', location })} />);

    fireEvent.click(screen.getByRole('button', { name: showDetailsName }));

    const parsed = JSON.parse(screen.getByText(text => text.trimStart().startsWith('{')).textContent ?? '');

    expect(parsed.location.namespace).toBe('ns-42');
  });

  // The mirror of the above: a `location` present but entirely blank is not a diagnostic, so it must
  // not open a toggle on its own.
  it('does not count an all-blank nested object as a detail', () => {
    const location = { namespace: '', workflowName: '   ', processorName: '', processorType: '' };

    render(<HintTemplate message={errorMessage({ code: '', inner: '', location })} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  // #417 §5 — two error bubbles in one thread used to expose two buttons whose accessible name was the
  // identical string "Show more", with nothing saying which error each belonged to or what it opened.
  it('gives each toggle a name of its own and points it at the region it opens', () => {
    render(
      <>
        <HintTemplate message={errorMessage({ message: 'first failure', inner: 'a' }, 'trace-1')} />
        <HintTemplate message={errorMessage({ message: 'second failure', inner: 'b' }, 'trace-2')} />
      </>,
    );

    const [first, second] = screen.getAllByRole('button', { name: showDetailsName });

    expect(first.getAttribute('aria-label')).toContain('first failure');
    expect(second.getAttribute('aria-label')).toContain('second failure');
    expect(first.getAttribute('aria-label')).not.toBe(second.getAttribute('aria-label'));

    // Collapsed: the region is unmounted, so there must be no dangling IDREF.
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(first.getAttribute('aria-controls')).toBeNull();

    fireEvent.click(first);

    expect(first.getAttribute('aria-expanded')).toBe('true');

    const controls = first.getAttribute('aria-controls');

    expect(controls).toBeTruthy();
    expect(document.getElementById(controls as string)).toBeTruthy();
  });

  // #417 §4 — #412 §3 asks for the two-line clamp *while collapsed*; it used to be unconditional, so a
  // long message stayed truncated on screen even after the user expanded the details.
  it('drops the summary clamp once the details are expanded', () => {
    render(<HintTemplate message={errorMessage({ inner: 'admission webhook denied the request' })} />);

    const summary = screen.getByTitle(QUOTA_REASON);
    const clampedClasses = summary.className;

    expect(clampedClasses).toMatch(/clamped/);

    fireEvent.click(screen.getByRole('button', { name: showDetailsName }));

    expect(summary.className).not.toMatch(/clamped/);
  });

  // Preserves the previous `errorMessageRenderer?.(message) ?? <default/>` contract: a renderer
  // that opts out for a given message must not blank the bubble.
  it('falls through to the default UI when errorMessageRenderer returns null', () => {
    render(
      <AsgardTemplateContext.Provider value={{ locale: 'en-US', errorMessageRenderer: () => null }}>
        <HintTemplate message={errorMessage()} />
      </AsgardTemplateContext.Provider>,
    );

    expect(screen.getByText(QUOTA_REASON)).toBeTruthy();
  });

  it('defers to errorMessageRenderer when it returns content', () => {
    render(
      <AsgardTemplateContext.Provider
        value={{ locale: 'en-US', errorMessageRenderer: () => <span>custom error UI</span> }}
      >
        <HintTemplate message={errorMessage()} />
      </AsgardTemplateContext.Provider>,
    );

    expect(screen.getByText('custom error UI')).toBeTruthy();
    expect(screen.queryByText(QUOTA_REASON)).toBeNull();
  });
});
