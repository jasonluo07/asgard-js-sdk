// @vitest-environment jsdom
import { ReactNode, useContext } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConversationBotMessage, ConversationMessage, MessageTemplateType, Question } from '@asgard-js/core';
import { AsgardServiceContext, AsgardServiceContextValue } from '../../../context/asgard-service-context';
import { AsgardTemplateContextProvider } from '../../../context/asgard-template-context';
import { Locale, t } from '../../../i18n';
import { QuestionTemplate } from './question-template';

/**
 * F-029 — the QUESTION card. What matters is that it never behaves like a handshake: it does not gate
 * anything, submitting goes out through the ordinary send path, and a card the conversation has moved
 * past collapses instead of sitting there as an unfillable form.
 */

const QUESTIONS: Question[] = [
  {
    question: '資料要放在哪一種儲存？',
    header: '資料儲存',
    multiSelect: false,
    options: [{ label: 'PostgreSQL', description: '關聯式，交易與複雜查詢最穩。' }, { label: 'Redis' }],
  },
  {
    question: '第一版要先具備哪些能力？',
    header: '首版能力',
    multiSelect: true,
    options: [{ label: '使用者認證' }, { label: '可觀測性' }],
  },
];

const CARD_ID = 'card-1';

function card(messageId = CARD_ID): ConversationBotMessage {
  return {
    type: 'bot',
    messageId,
    isTyping: false,
    typingText: null,
    message: {
      messageId,
      text: 'plain-text fallback',
      template: { type: MessageTemplateType.QUESTION, questions: QUESTIONS, quickReplies: [] },
    },
  } as unknown as ConversationBotMessage;
}

function userMessage(messageId: string): ConversationMessage {
  return { type: 'user', messageId, text: '我想問別的' } as ConversationMessage;
}

/** The transcript the card is derived against — order is the entire input to the collapse rule. */
function transcript(...entries: ConversationMessage[]): Map<string, ConversationMessage> {
  return new Map(entries.map(entry => [entry.messageId, entry]));
}

function Harness({
  override,
  locale = 'zh-TW',
  message = card(),
}: {
  override?: Partial<AsgardServiceContextValue>;
  locale?: Locale;
  message?: ConversationBotMessage;
}): ReactNode {
  const base = useContext(AsgardServiceContext);

  return (
    <AsgardServiceContext.Provider
      value={{ ...base, messages: transcript(message), sendMessage: vi.fn(), ...override }}
    >
      <AsgardTemplateContextProvider locale={locale}>
        <QuestionTemplate message={message} />
      </AsgardTemplateContextProvider>
    </AsgardServiceContext.Provider>
  );
}

function mount(override?: Partial<AsgardServiceContextValue>, locale?: Locale): void {
  render(<Harness override={override} locale={locale} />);
}

function submitButton(locale: Locale = 'zh-TW'): HTMLButtonElement {
  return screen.getByRole('button', { name: t(locale, 'question.submit') }) as HTMLButtonElement;
}

afterEach(cleanup);

describe('QuestionTemplate', () => {
  it('R1: renders every question with its header chip and full text', () => {
    mount();

    QUESTIONS.forEach(question => {
      expect(screen.getByText(question.question)).toBeTruthy();
      expect(screen.getByText(question.header)).toBeTruthy();
    });
    expect(screen.getByText('關聯式，交易與複雜查詢最穩。')).toBeTruthy();
  });

  it('R2: a single-select question exposes radios, a multi-select one checkboxes', () => {
    mount();

    // 2 options + the free-text row on the single-select question; likewise for the multi-select one.
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('R2: picking a second option on a single-select question clears the first', () => {
    mount();

    const [postgres, redis] = screen.getAllByRole('radio');

    fireEvent.click(postgres);
    expect(postgres.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(redis);
    expect(postgres.getAttribute('aria-checked')).toBe('false');
    expect(redis.getAttribute('aria-checked')).toBe('true');
  });

  it('R2: a multi-select question keeps several options at once', () => {
    mount();

    const [auth, observability] = screen.getAllByRole('checkbox');

    fireEvent.click(auth);
    fireEvent.click(observability);

    expect(auth.getAttribute('aria-checked')).toBe('true');
    expect(observability.getAttribute('aria-checked')).toBe('true');
  });

  it('R4: submit is disabled until something is answered and again once cleared', () => {
    mount();

    expect(submitButton().disabled).toBe(true);

    const [postgres] = screen.getAllByRole('radio');

    fireEvent.click(postgres);
    expect(submitButton().disabled).toBe(false);

    fireEvent.click(postgres);
    expect(submitButton().disabled).toBe(true);
  });

  it('R3/R4: an opened but empty free-text row does not count as an answer', () => {
    mount();

    const radios = screen.getAllByRole('radio');
    const otherRow = radios[radios.length - 1];

    fireEvent.click(otherRow);
    expect(submitButton().disabled).toBe(true);

    fireEvent.change(screen.getAllByPlaceholderText(t('zh-TW', 'question.otherPlaceholder'))[0], {
      target: { value: '  ' },
    });
    expect(submitButton().disabled).toBe(true);
  });

  it('R3/R7: submitting carries the user’s own words, never the "other" label', () => {
    const sendMessage = vi.fn();

    mount({ sendMessage });

    const radios = screen.getAllByRole('radio');

    fireEvent.click(radios[radios.length - 1]);
    fireEvent.change(screen.getAllByPlaceholderText(t('zh-TW', 'question.otherPlaceholder'))[0], {
      target: { value: '我想先用 SQLite 撐過 POC' },
    });
    fireEvent.click(submitButton());

    expect(sendMessage).toHaveBeenCalledWith({
      text: '1. 資料要放在哪一種儲存？\n\n我想先用 SQLite 撐過 POC',
    });
    expect(sendMessage.mock.calls[0][0].text).not.toContain(t('zh-TW', 'question.other'));
  });

  it('R2: choosing a listed option closes the free-text row on a single-select question', () => {
    mount();

    const radios = screen.getAllByRole('radio');

    fireEvent.click(radios[radios.length - 1]);
    expect(screen.queryAllByPlaceholderText(t('zh-TW', 'question.otherPlaceholder'))).toHaveLength(1);

    fireEvent.click(radios[0]);
    expect(screen.queryAllByPlaceholderText(t('zh-TW', 'question.otherPlaceholder'))).toHaveLength(0);
  });

  it('R12: the card collapses on submit without waiting for the echoed message', () => {
    mount();

    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(submitButton());

    expect(screen.queryByText(QUESTIONS[0].question)).toBeNull();
    expect(screen.getByText(t('zh-TW', 'question.closed'))).toBeTruthy();
  });

  it('R12: a second submit on the same card does nothing', () => {
    const sendMessage = vi.fn();

    mount({ sendMessage });

    fireEvent.click(screen.getAllByRole('radio')[0]);
    const button = submitButton();

    fireEvent.click(button);
    fireEvent.click(button);

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('R9: a card followed by a user message collapses, with its questions absent from the DOM', () => {
    const message = card();

    mount({ messages: transcript(message, userMessage('u1')) });

    expect(screen.getByText(t('zh-TW', 'question.closed'))).toBeTruthy();
    // Absent, not merely hidden — nothing to find at all.
    QUESTIONS.forEach(question => expect(screen.queryByText(question.question)).toBeNull());
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    // The summary is built from the short header labels.
    expect(screen.getByText(`${QUESTIONS[0].header} · ${QUESTIONS[1].header}`)).toBeTruthy();
  });

  it('R10: expanding a resolved card shows it read-only with no submit button', () => {
    const message = card();

    mount({ messages: transcript(message, userMessage('u1')) });

    fireEvent.click(screen.getByText(`${QUESTIONS[0].header} · ${QUESTIONS[1].header}`));

    expect(screen.getByText(QUESTIONS[0].question)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('zh-TW', 'question.submit') })).toBeNull();
    screen.getAllByRole('radio').forEach(option => {
      expect((option as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('R11: the card stays open when it is the last message in the transcript', () => {
    const message = card();

    mount({ messages: transcript(userMessage('u0'), message) });

    expect(screen.queryByText(t('zh-TW', 'question.closed'))).toBeNull();
    expect(screen.getByText(QUESTIONS[0].question)).toBeTruthy();
  });

  it('R15: chrome follows the locale while the questions stay untranslated', () => {
    mount(undefined, 'en-US');

    expect(screen.getByRole('button', { name: t('en-US', 'question.submit') })).toBeTruthy();
    expect(screen.getByText(t('en-US', 'question.skipHint'))).toBeTruthy();
    // The backend already wrote these in the conversation's language — the SDK must not touch them.
    expect(screen.getByText(QUESTIONS[0].question)).toBeTruthy();
  });
});
