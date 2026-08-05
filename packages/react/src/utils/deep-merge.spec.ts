import { describe, expect, it } from 'vitest';
import { deepMerge } from './deep-merge';

/**
 * asgard-sdk-pm#52 — the theme system documents a three-layer priority (props > annotations > default),
 * but the default layer was unreachable for six colour fields. `Object.entries` yields keys whose value
 * is `undefined`, and this merge assigned them unconditionally, so the annotations pass — which builds
 * `{ botMessage: { color: annotations?.embedConfig?.theme?.botMessage?.color } }` whether or not the bot
 * provider ships annotations — overwrote every default with `undefined` before the props theme merged in.
 *
 * The fix is a semantic one: `undefined` means "this layer has no opinion".
 */
describe('deepMerge', () => {
  it('keeps the target value when the source says undefined', () => {
    // `{ color: undefined }` widens to `{ color: undefined }`, whose intersection with the target is
    // `never` — annotate the source so the assertion reads the merged value, not a narrowed type.
    const source: { color: string | undefined } = { color: undefined };
    const merged = deepMerge({ color: 'var(--asg-color-text-primary)' }, source);

    expect(merged.color).toBe('var(--asg-color-text-primary)');
  });

  it('keeps nested defaults when a partial source only opts into a sibling', () => {
    // The real shape: annotations set the bubble background but not its text colour.
    const merged = deepMerge(
      { botMessage: { color: 'var(--asg-color-text-primary)', backgroundColor: 'var(--asg-color-secondary)' } },
      { botMessage: { color: undefined, backgroundColor: '#123456' } },
    );

    expect(merged.botMessage).toEqual({
      color: 'var(--asg-color-text-primary)',
      backgroundColor: '#123456',
    });
  });

  it('still lets an explicit value win, including falsy ones', () => {
    const merged = deepMerge({ a: 'default', b: 'default', c: 'default' }, { a: '', b: 0, c: null });

    expect(merged).toEqual({ a: '', b: 0, c: null });
  });

  it('adds keys the target does not have', () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('merges nested objects rather than replacing them', () => {
    const merged = deepMerge({ outer: { keep: 1, override: 1 } }, { outer: { override: 2 } });

    expect(merged.outer).toEqual({ keep: 1, override: 2 });
  });

  it('replaces arrays wholesale rather than merging them element-wise', () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [9] }).list).toEqual([9]);
  });

  it('tolerates a missing source', () => {
    expect(deepMerge({ a: 1 }, undefined as unknown as Record<string, unknown>)).toEqual({ a: 1 });
  });
});
