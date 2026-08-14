import { describe, expect, it } from 'vitest';
import { assertVolumePath, SOURCE_SET_VOLUME_ROOT } from './source-set-path';

// F-024 R2 — SourceSet volume paths are volume-relative and the root is the empty string, not `/`.
// The backend answers 400 for every form rejected here; catching them before the request turns a
// round trip and an opaque 400 into an immediate, readable error.

describe('assertVolumePath (F-024 R2)', () => {
  it('accepts a plain volume-relative path and returns it unchanged', () => {
    expect(assertVolumePath('notes/todo.md')).toBe('notes/todo.md');
    expect(assertVolumePath('a')).toBe('a');
  });

  it('accepts the root only when the caller allows it — `list` does, mutations do not', () => {
    expect(assertVolumePath(SOURCE_SET_VOLUME_ROOT, { allowRoot: true })).toBe('');
    expect(() => assertVolumePath(SOURCE_SET_VOLUME_ROOT)).toThrow(/root/i);
  });

  it.each([
    ['a leading slash (the sandbox-style absolute path)', '/notes/todo.md'],
    ['the bare root as a slash', '/'],
    ['a trailing slash', 'notes/'],
    ['a doubled slash', 'notes//todo.md'],
    ['a `.` segment', 'notes/./todo.md'],
    ['a `..` segment', 'notes/../secrets'],
    ['a leading `..` segment', '../secrets'],
    ['a trailing `..` segment', 'notes/..'],
  ])('rejects %s', (_label, path) => {
    expect(() => assertVolumePath(path)).toThrow();
    expect(() => assertVolumePath(path, { allowRoot: true })).toThrow();
  });

  it('names the offending path in the message so the caller can surface it', () => {
    expect(() => assertVolumePath('/notes')).toThrow(/\/notes/);
  });
});
