import { describe, it, expect } from 'vitest';
import { resolveSandboxUri } from './resolve-sandbox-uri';

// F-020 / UC-036 — resolveSandboxUri parses a sandbox://<name>/<action>?<query> custom URI into a typed
// intent. It is a client-side command, never a URL: an unresolvable URI returns null so the host ignores
// it (treats it as a plain card) and never window.open()s the raw scheme.

describe('resolveSandboxUri (F-020 / UC-036)', () => {
  it('parses open-browser → { kind, sandboxName }', () => {
    expect(resolveSandboxUri('sandbox://sbx-1/open-browser')).toEqual({
      kind: 'open-browser',
      sandboxName: 'sbx-1',
    });
  });

  it('parses open-file with absolute_path → { kind, sandboxName, absolutePath }', () => {
    expect(resolveSandboxUri('sandbox://sbx-1/open-file?absolute_path=/home/user/report.md')).toEqual({
      kind: 'open-file',
      sandboxName: 'sbx-1',
      absolutePath: '/home/user/report.md',
    });
  });

  it('url-decodes the sandbox name and the absolute_path query', () => {
    expect(resolveSandboxUri('sandbox://sbx%20a/open-file?absolute_path=%2Ftmp%2Fa%20b.txt')).toEqual({
      kind: 'open-file',
      sandboxName: 'sbx a',
      absolutePath: '/tmp/a b.txt',
    });
  });

  it('returns null for open-file without absolute_path', () => {
    expect(resolveSandboxUri('sandbox://sbx-1/open-file')).toBeNull();
  });

  it('returns null for an unknown action', () => {
    expect(resolveSandboxUri('sandbox://sbx-1/frobnicate')).toBeNull();
  });

  it('returns null for a non-sandbox scheme', () => {
    expect(resolveSandboxUri('https://example.com/open-browser')).toBeNull();
    expect(resolveSandboxUri('channel-home://foo/bar')).toBeNull();
  });

  it('returns null for a malformed / empty URI', () => {
    expect(resolveSandboxUri('sandbox://')).toBeNull();
    expect(resolveSandboxUri('')).toBeNull();
  });
});
