import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F-025 R1 / R3, enforced mechanically.
 *
 * R1 is "`components/file-explorer/` diff is empty", and the way that AC gets broken is never a decision
 * — it is one import that needs one more prop, and the frozen module grows a parameter. So this spec
 * pins the seam from this side: the SourceSet explorer may reach into the shared module for exactly the
 * two things F-025's reuse table names, and nothing else.
 *
 * R3 is the other half: this component mounts on pages that have no Chatbot, so anything that reads chat
 * context would work in the demo and throw in Odin's Files tab.
 *
 * A failure here is not a style complaint. If a new import is genuinely needed, the honest fix is to copy
 * what it needs into this module (F-025's "先在本票內複製一份") or to raise the AC with PM — not to widen
 * the frozen module and quietly break R1.
 */

const DIR = fileURLToPath(new URL('.', import.meta.url));

/** What F-025's reuse table sanctions: the generic menu shell and the path-based entry type. */
const ALLOWED_SHARED_IMPORTS = ['../file-explorer/context-menu', '../file-explorer/types'];

/**
 * Chat plumbing. Importing any of these would tie the explorer to a Chatbot it is meant to work without.
 *
 * Checked against import specifiers rather than raw text: a context can only reach this module through
 * an import, and scanning the whole file would fail on a comment that merely names one.
 */
const CHAT_CONTEXT_MODULES = [
  'asgard-service-context',
  'asgard-template-context',
  'asgard-app-initialization-context',
  'asgard-theme-context',
];

function moduleSources(): { file: string; text: string }[] {
  return readdirSync(DIR)
    .filter(name => (name.endsWith('.ts') || name.endsWith('.tsx')) && !name.includes('.spec.'))
    .map(file => ({ file, text: readFileSync(join(DIR, file), 'utf8') }));
}

/** Every module specifier this file imports from. */
function importsOf(text: string): string[] {
  return [...text.matchAll(/from\s+'([^']+)'/g)].map(match => match[1]);
}

describe('F-025 R1 — the shared file-explorer module stays frozen', () => {
  it('imports only the two things F-025 sanctions from it', () => {
    const offenders = moduleSources().flatMap(({ file, text }) =>
      importsOf(text)
        .filter(spec => spec.startsWith('../file-explorer/') && !ALLOWED_SHARED_IMPORTS.includes(spec))
        .map(spec => `${file} → ${spec}`),
    );

    expect(offenders).toEqual([]);
  });

  it('keeps its own copy of the leaf UI rather than importing the shared one', () => {
    const names = readdirSync(DIR);

    expect(names).toContain('icons.tsx');
    expect(names).toContain('code-editor.tsx');
    expect(names).toContain('dialog.tsx');
    // The copied file view is what makes `readOnly` expressible without touching the frozen module.
    expect(names).toContain('file-view.tsx');
  });
});

describe('F-025 R3 — the explorer mounts without a Chatbot', () => {
  it('reads no chat context anywhere in the module', () => {
    const offenders = moduleSources().flatMap(({ file, text }) =>
      importsOf(text)
        .filter(spec => CHAT_CONTEXT_MODULES.some(marker => spec.includes(marker)))
        .map(spec => `${file} → ${spec}`),
    );

    expect(offenders).toEqual([]);
  });
});
