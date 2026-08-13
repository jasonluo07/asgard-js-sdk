import { ReactNode, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ConversationBotMessage, MessageTemplateType, Question } from '@asgard-js/core';
import { t } from '../../../i18n';
import { useAsgardContext, useAsgardTemplateContext } from '../../../context';
import { composeQuestionAnswers, QuestionAnswers } from './compose-question-answers';
import { isQuestionResolved } from './is-question-resolved';
import styles from './question-template.module.scss';

// F-029 — the QUESTION card: a multiple-choice form the agent sends when it needs a decision rather
// than a guess.
//
// **It is not a handshake.** The backend publishes the questions as an ordinary message and closes
// the tool call immediately — the run that produced the card has already finished by the time it
// renders. So submitting is not "replying to a pending request": the picks are folded into text and
// posted as the next ordinary user message, through the very same entry the composer uses. Two
// consequences the UI must honor: the user may ignore the card and type their own words (that is the
// same path, not an error path), and the card never expires or needs reclaiming.
//
// **Resolved cards collapse rather than going read-only.** The frontend cannot know whether a
// historical card was filled, so a rejoin replays each one looking brand new; rendering them at full
// size would bury the transcript under forms that can never be completed. See `isQuestionResolved`.
//
// Icons inlined byte-identical to lucide-react 0.487.0 (ListChecks / Check / ChevronDown /
// ChevronRight), matching the TaskList / SubagentList convention.

const glyphSvgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function ListChecksIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} width="14" height="14" {...glyphSvgProps}>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </svg>
  );
}

function CheckIcon(): ReactNode {
  return (
    <svg width="12" height="12" {...glyphSvgProps} strokeWidth="3">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ChevronDownIcon(): ReactNode {
  return (
    <svg width="13" height="13" {...glyphSvgProps}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(): ReactNode {
  return (
    <svg width="13" height="13" {...glyphSvgProps}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

interface OptionRowProps {
  label: string;
  description?: string;
  multi: boolean;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function OptionRow(props: OptionRowProps): ReactNode {
  const { label, description, multi, checked, disabled, onToggle } = props;

  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={clsx(styles.option, checked && styles['option--checked'])}
    >
      <span
        aria-hidden
        className={clsx(
          styles.option__marker,
          multi && styles['option__marker--multi'],
          checked && styles['option__marker--checked'],
        )}
      >
        {checked && <CheckIcon />}
      </span>
      <span className={styles.option__body}>
        <span className={styles.option__label}>{label}</span>
        {description && <span className={styles.option__description}>{description}</span>}
      </span>
    </button>
  );
}

interface QuestionTemplateProps {
  message: ConversationBotMessage;
}

export function QuestionTemplate(props: QuestionTemplateProps): ReactNode {
  const { message } = props;
  const { locale = 'en-US' } = useAsgardTemplateContext();
  const { messages, sendMessage } = useAsgardContext();

  // Picked labels per question index; a free-text answer is stored as the text the user typed.
  const [answers, setAnswers] = useState<QuestionAnswers>({});
  const [otherOpen, setOtherOpen] = useState<Record<number, boolean>>({});
  const [otherText, setOtherText] = useState<Record<number, string>>({});
  // Collapse the moment the user submits, without waiting for the echoed message to arrive (R12).
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const template = message.message.template;
  // Memoized because the non-QUESTION fallback is a fresh `[]` every render, which would otherwise
  // invalidate the `composed` memo below on every pass.
  const questions = useMemo<Question[]>(
    () => (template?.type === MessageTemplateType.QUESTION ? template.questions : []),
    [template],
  );

  const resolved = submitted || isQuestionResolved(Array.from(messages?.values() ?? []), message.messageId);

  // Free text lives outside `answers` until it has content, so an opened-but-empty row never counts
  // as an answer (UC-049 alternate flow).
  const composed = useMemo(() => {
    const merged: QuestionAnswers = {};

    questions.forEach((_, index) => {
      const picked = [...(answers[index] ?? [])];
      const free = otherOpen[index] ? (otherText[index] ?? '').trim() : '';

      if (free) picked.push(free);

      merged[index] = picked;
    });

    return composeQuestionAnswers(questions, merged);
  }, [questions, answers, otherOpen, otherText]);

  const toggleOption = useCallback((questionIndex: number, label: string, multi: boolean): void => {
    setAnswers(prev => {
      const current = prev[questionIndex] ?? [];

      if (!multi) {
        return { ...prev, [questionIndex]: current[0] === label ? [] : [label] };
      }

      return current.includes(label)
        ? { ...prev, [questionIndex]: current.filter(picked => picked !== label) }
        : { ...prev, [questionIndex]: [...current, label] };
    });

    // On a single-select question the free-text row and a listed option are mutually exclusive;
    // multi-select keeps both.
    if (!multi) setOtherOpen(prev => ({ ...prev, [questionIndex]: false }));
  }, []);

  const toggleOther = useCallback((questionIndex: number, multi: boolean): void => {
    setOtherOpen(prev => ({ ...prev, [questionIndex]: !prev[questionIndex] }));

    if (!multi) setAnswers(prev => ({ ...prev, [questionIndex]: [] }));
  }, []);

  const submit = useCallback((): void => {
    if (resolved || composed === '' || !sendMessage) return;

    setSubmitted(true);
    // Same entry the composer uses, so the result is indistinguishable from a typed message (R7).
    // Fire-and-forget: the provider already reports transport failures through `onSseError`.
    void sendMessage({ text: composed });
  }, [resolved, composed, sendMessage]);

  if (questions.length === 0) return null;

  // The summary uses the `header` labels — short chips the model wrote for exactly this purpose.
  const summary = questions.map(question => question.header || question.question).join(' · ');

  return (
    <div className={styles.card}>
      {resolved && (
        <button
          type="button"
          onClick={() => setExpanded(open => !open)}
          aria-expanded={expanded}
          className={styles.summary}
        >
          <ListChecksIcon className={styles.summary__icon} />
          <span className={styles.summary__labels}>{summary}</span>
          <span className={styles.summary__state}>
            <span>{t(locale, 'question.closed')}</span>
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </span>
        </button>
      )}

      {/* Collapsed content is absent from the DOM, not merely hidden (R9). */}
      {(!resolved || expanded) && (
        <>
          <div className={styles.questions}>
            {questions.map((question, questionIndex) => {
              const picked = answers[questionIndex] ?? [];
              const otherIsOpen = Boolean(otherOpen[questionIndex]);

              return (
                <fieldset key={questionIndex} className={styles.question}>
                  <legend className={styles.question__legend}>
                    {question.header && <span className={styles.question__header}>{question.header}</span>}
                    <span className={styles.question__text}>{question.question}</span>
                    {question.multiSelect && (
                      <span className={styles.question__multi_hint}>{t(locale, 'question.multiHint')}</span>
                    )}
                  </legend>

                  <div
                    role={question.multiSelect ? 'group' : 'radiogroup'}
                    aria-label={question.question}
                    className={styles.options}
                  >
                    {question.options.map((option, optionIndex) => (
                      <OptionRow
                        key={optionIndex}
                        label={option.label}
                        description={option.description}
                        multi={question.multiSelect}
                        checked={picked.includes(option.label)}
                        disabled={resolved}
                        onToggle={() => toggleOption(questionIndex, option.label, question.multiSelect)}
                      />
                    ))}

                    {/* Options are a shortcut, not a closed set — every question gets an escape hatch. */}
                    <OptionRow
                      label={t(locale, 'question.other')}
                      multi={question.multiSelect}
                      checked={otherIsOpen}
                      disabled={resolved}
                      onToggle={() => toggleOther(questionIndex, question.multiSelect)}
                    />
                    {otherIsOpen && !resolved && (
                      <input
                        value={otherText[questionIndex] ?? ''}
                        onChange={event => setOtherText(prev => ({ ...prev, [questionIndex]: event.target.value }))}
                        placeholder={t(locale, 'question.otherPlaceholder')}
                        aria-label={t(locale, 'question.otherPlaceholder')}
                        className={styles.other_input}
                      />
                    )}
                  </div>
                </fieldset>
              );
            })}
          </div>

          {/* A resolved card expands only for review — the summary row already says why it is closed. */}
          {!resolved && (
            <div className={styles.actions}>
              <span className={styles.actions__hint}>{t(locale, 'question.skipHint')}</span>
              <button
                type="button"
                onClick={submit}
                disabled={composed === ''}
                title={t(locale, 'question.submitTitle')}
                className={styles.actions__submit}
              >
                {t(locale, 'question.submit')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
