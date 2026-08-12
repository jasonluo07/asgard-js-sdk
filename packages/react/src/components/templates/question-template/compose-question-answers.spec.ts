/**
 * F-029 R5 / R6 — `composeQuestionAnswers` is the contract between the user's picks and the model,
 * not display logic: the model matches the answers back to the questions it asked by reading this
 * text, and the very same string is what a human sees in the transcript. So these cases assert the
 * exact bytes, not "looks about right".
 */
import { describe, expect, it } from 'vitest';
import type { Question } from '@asgard-js/core';
import { composeQuestionAnswers } from './compose-question-answers';

const storage: Question = {
  question: '資料要放在哪一種儲存？',
  header: '資料儲存',
  multiSelect: false,
  options: [{ label: 'PostgreSQL' }, { label: 'Redis' }],
};

const capabilities: Question = {
  question: '第一版要先具備哪些能力？',
  header: '首版能力',
  multiSelect: true,
  options: [{ label: '使用者認證' }, { label: '可觀測性' }, { label: '匯出報表' }],
};

describe('composeQuestionAnswers', () => {
  it('R6: folds a single answered question', () => {
    expect(composeQuestionAnswers([storage], { 0: ['PostgreSQL'] })).toBe('1. 資料要放在哪一種儲存？\n\nPostgreSQL');
  });

  it('R5/R6: joins multi-select picks with ", " and never a localized separator', () => {
    expect(composeQuestionAnswers([capabilities], { 0: ['使用者認證', '可觀測性'] })).toBe(
      '1. 第一版要先具備哪些能力？\n\n使用者認證, 可觀測性',
    );
  });

  it('R5: separates blocks with a blank line on each side of the rule', () => {
    // A `---` sitting directly under a line of text is a setext heading in markdown, which would turn
    // the question above it into an <h2>. The blank lines are what keep it a thematic break.
    expect(composeQuestionAnswers([storage, capabilities], { 0: ['Redis'], 1: ['可觀測性'] })).toBe(
      '1. 資料要放在哪一種儲存？\n\nRedis\n\n---\n\n2. 第一版要先具備哪些能力？\n\n可觀測性',
    );
  });

  it('R5/R6: renumbers consecutively when the first question is skipped', () => {
    // The submitted text must read "1." even though the answered question is at index 1 — a message
    // that opens at "2." reads like something went missing. The question text carries the identity;
    // the number is only human-facing layout.
    expect(composeQuestionAnswers([storage, capabilities], { 1: ['匯出報表'] })).toBe(
      '1. 第一版要先具備哪些能力？\n\n匯出報表',
    );
  });

  it('R5: omits a skipped question entirely rather than sending a placeholder', () => {
    const composed = composeQuestionAnswers([storage, capabilities], { 0: ['PostgreSQL'] });

    expect(composed).toBe('1. 資料要放在哪一種儲存？\n\nPostgreSQL');
    expect(composed).not.toContain('---');
    expect(composed).not.toContain(capabilities.question);
  });

  it('R3/R6: carries free-text answers verbatim', () => {
    expect(composeQuestionAnswers([storage], { 0: ['我想先用 SQLite 撐過 POC'] })).toBe(
      '1. 資料要放在哪一種儲存？\n\n我想先用 SQLite 撐過 POC',
    );
  });

  it('R6: returns the empty string when every question is skipped', () => {
    expect(composeQuestionAnswers([storage, capabilities], {})).toBe('');
  });

  it('R4/R6: treats whitespace-only and absent answers as unanswered', () => {
    // Opening the free-text row without typing must not count as an answer — otherwise the submit
    // button would enable on an empty string (UC-049 alternate flow).
    expect(composeQuestionAnswers([storage], { 0: ['   '] })).toBe('');
    expect(composeQuestionAnswers([storage], { 0: [] })).toBe('');
  });

  it('R5: drops blank entries but keeps the surrounding picks of the same question', () => {
    expect(composeQuestionAnswers([capabilities], { 0: ['使用者認證', '  ', '可觀測性'] })).toBe(
      '1. 第一版要先具備哪些能力？\n\n使用者認證, 可觀測性',
    );
  });
});
