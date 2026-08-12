import type { Question } from '@asgard-js/core';

/**
 * Separator between the picks of one multi-select question. Deliberately not localized — the reader
 * of this text is the model, and swapping in an ideographic comma only adds a variable to matching
 * the answer back to the question.
 */
const ANSWER_SEPARATOR = ', ';

/**
 * Horizontal rule between question blocks. The blank line on each side is load-bearing: a `---` on
 * the line directly below text is a setext heading in markdown, which would silently promote the
 * question above it to an `<h2>`.
 */
const BLOCK_SEPARATOR = '\n\n---\n\n';

/** Picks per question, keyed by the question's index in the card. Free text is stored as a pick. */
export type QuestionAnswers = Record<number, string[]>;

/**
 * Folds the user's picks into the text that gets sent as their next message (F-029 R5).
 *
 * **This is a contract with the agent, not display logic.** It has two readers at once: the model,
 * which matches each answer back to the question it asked, and the human, who sees this exact string
 * in the transcript. Hence markdown layout that reads well both ways:
 *
 * ```
 * 1. Which storage should this use?
 *
 * PostgreSQL
 *
 * ---
 *
 * 2. What should ship in v1?
 *
 * Authentication, Observability
 * ```
 *
 * - The question text is copied **verbatim** — it is the model's own string, so matching is
 *   unambiguous. `header` is capped at ~12 characters and may repeat, so it is never used here.
 * - Numbering runs consecutively over the **submitted** questions, not their original indices: a
 *   message that opens at "2." reads as though something went missing. The question text already
 *   carries identity; the number is purely human-facing layout.
 * - A skipped question is omitted whole — no "not answered" placeholder.
 * - Blank and whitespace-only picks do not count, so opening the free-text row without typing
 *   leaves the question unanswered.
 *
 * @returns The composed message, or the empty string when every question was skipped — callers
 *   treat that as "nothing to send" and keep the submit button disabled.
 */
export function composeQuestionAnswers(questions: Question[], answers: QuestionAnswers): string {
  return questions
    .map((question, index) => {
      const picked = (answers[index] ?? []).filter(answer => answer.trim() !== '');

      if (picked.length === 0) return null;

      return `${question.question}\n\n${picked.join(ANSWER_SEPARATOR)}`;
    })
    .filter((block): block is string => block !== null)
    .map((block, position) => `${position + 1}. ${block}`)
    .join(BLOCK_SEPARATOR);
}
