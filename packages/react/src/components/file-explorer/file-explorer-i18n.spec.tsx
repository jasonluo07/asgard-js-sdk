// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Locale, t } from '../../i18n';
import { FileExplorerDialogApi, useFileExplorerDialog } from './file-explorer-dialog';

/**
 * asgard-sdk-pm#49 — `file-explorer/` shipped with every user-visible string hardcoded in
 * Traditional Chinese (its `i18n` import count was 0), so any consumer not on `zh-TW` got a fully
 * Chinese Files panel. The same file drove create / rename / delete through `window.prompt` and
 * `window.confirm`, which cannot be localized, ignore `AsgardThemeScope`, and block the whole tab —
 * the last of which froze CDP-driven e2e outright.
 */

const DIR = join(__dirname);
const I18N = join(__dirname, '..', '..', 'i18n.ts');
const LOCALES: Locale[] = ['en-US', 'ja-JP', 'zh-TW'];

/**
 * CJK ideographs alone are not enough: a reintroduced Japanese string is mostly kana, and fullwidth
 * punctuation (`「」（）：`) carries no ideograph at all. Covers CJK punctuation, kana, ideographs and
 * fullwidth forms.
 */
const CJK = /[\u3000-\u303F\u3040-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/u;

/**
 * Any real call of the blocking dialogs. `confirm(...)` is a global, so the bare form is the most
 * likely way this regresses — matching only `window.confirm(` would miss it.
 */
const NATIVE_DIALOG =
  /(?:^|[^\w.$])(?:(?:window|globalThis|self)\s*(?:\?\.|\.)\s*|(?:window|globalThis|self)\s*\[\s*["'])?(prompt|confirm)(?:["']\s*\])?\s*\(/;

/** Source files of the panel itself — tests and styles excluded. */
function sourceFiles(): string[] {
  return readdirSync(DIR)
    .filter(f => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('.spec.'))
    .map(f => join(DIR, f));
}

/** Key list per locale, parsed straight out of the catalog source. */
function catalogKeys(): Record<Locale, string[]> {
  const src = readFileSync(I18N, 'utf8');
  const out = {} as Record<Locale, string[]>;

  for (const locale of LOCALES) {
    const block = src.match(new RegExp(`'${locale}': \\{([\\s\\S]*?)\\n  \\},`));
    if (!block) throw new Error(`catalog block for ${locale} not found`);

    out[locale] = [...block[1].matchAll(/'([\w.]+)':/g)].map(m => m[1]);
  }

  return out;
}

describe('File Explorer localization', () => {
  it('leaves no hardcoded CJK string in the panel source', () => {
    const offenders = sourceFiles().filter(f => CJK.test(readFileSync(f, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('detects kana and fullwidth punctuation, not just ideographs', () => {
    // Guards the guard: the first version was ideographs-only and let all of these through.
    for (const sample of ['キャンセル', 'ひらがな', '「」', '（空）', '：']) {
      expect(CJK.test(sample), sample).toBe(true);
    }
  });

  it('no longer calls the blocking native dialogs', () => {
    const offenders = sourceFiles().filter(f => NATIVE_DIALOG.test(readFileSync(f, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('would catch the bare and computed forms of those calls', () => {
    for (const sample of [
      `const n = prompt('x');`,
      `globalThis.confirm('x')`,
      `window?.confirm('x')`,
      `window['confirm']('x')`,
      `if (window.confirm(msg)) {}`,
    ]) {
      expect(NATIVE_DIALOG.test(sample), sample).toBe(true);
    }

    // Prose naming them must stay allowed, or this file's own doc comment trips the guard.
    expect(NATIVE_DIALOG.test('// replaces window.prompt / window.confirm')).toBe(false);
  });

  it('scans a non-empty set of real files', () => {
    // Without this the two guards above pass vacuously if the glob ever stops matching.
    expect(sourceFiles().length).toBeGreaterThan(5);
  });

  it('defines the same key set in all three catalogs', () => {
    // Asserting through `t()` cannot detect this: it falls back to en-US, so a key missing from
    // ja/zh returns the English string and any "not the raw key" assertion still passes.
    const keys = catalogKeys();
    const reference = [...keys['en-US']].sort();

    for (const locale of LOCALES) {
      expect([...keys[locale]].sort(), `${locale} key set`).toEqual(reference);
      expect(new Set(keys[locale]).size, `${locale} has duplicate keys`).toBe(keys[locale].length);
    }
  });

  it('carries the same interpolation placeholders in every locale', () => {
    const placeholders = (locale: Locale, key: string): string[] =>
      [...t(locale, key).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

    for (const key of catalogKeys()['en-US']) {
      const reference = placeholders('en-US', key);
      for (const locale of LOCALES) {
        expect(placeholders(locale, key), `${locale} / ${key}`).toEqual(reference);
      }
    }
  });

  it('interpolates the entry name into the delete confirmation', () => {
    expect(t('en-US', 'fileExplorer.confirmDelete', { name: 'notes.txt' })).toContain('notes.txt');
    expect(t('ja-JP', 'fileExplorer.confirmDeleteDir', { name: 'src' })).toContain('src');
  });

  it('returns the key itself when no locale defines it', () => {
    expect(t('ja-JP', 'definitely.missing.key')).toBe('definitely.missing.key');
    expect(t('zh-TW', 'fileExplorer.confirm')).not.toBe('fileExplorer.confirm');
  });

  it('renders the dialog on every panel branch that shows UI', () => {
    // The empty-sandbox branch returns early. Omitting {dialog} there stranded a pending confirm and
    // resurrected it unprompted when a sandbox came back (the sandbox list is repolled every 15s).
    const panel = readFileSync(join(DIR, 'file-explorer-panel.tsx'), 'utf8');

    expect(panel.match(/\{dialog\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

let api: FileExplorerDialogApi;

// Vitest runs without `globals`, so testing-library's auto-cleanup is not wired up; without this the
// previous test's dialog is still mounted and `getByText` finds two matches.
afterEach(() => {
  cleanup();
});

function Harness(): ReactNode {
  api = useFileExplorerDialog('en-US');

  return api.dialog;
}

/** Open a dialog inside act() and hand back its promise, so tests never need a non-null assertion. */
function openInput(options: { title: string; defaultValue?: string }): Promise<string | null> {
  let promise: Promise<string | null> = Promise.resolve(null);
  act(() => {
    promise = api.requestInput(options);
  });

  return promise;
}

function openConfirm(options: { title: string }): Promise<boolean> {
  let promise: Promise<boolean> = Promise.resolve(false);
  act(() => {
    promise = api.requestConfirm(options);
  });

  return promise;
}

describe('File Explorer dialog (replacing window.prompt / window.confirm)', () => {
  it('resolves the trimmed name when confirmed', async () => {
    render(<Harness />);
    const result = openInput({ title: 'New file name', defaultValue: 'untitled.txt' });

    fireEvent.change(screen.getByDisplayValue('untitled.txt'), { target: { value: '  notes.md  ' } });
    fireEvent.click(screen.getByText('OK'));

    await expect(result).resolves.toBe('notes.md');
  });

  it('resolves null when dismissed, so no mutation runs', async () => {
    render(<Harness />);
    const result = openInput({ title: 'Rename', defaultValue: 'a.txt' });

    fireEvent.click(screen.getByText('Cancel'));

    await expect(result).resolves.toBeNull();
  });

  it('disables confirm while the name is empty', () => {
    render(<Harness />);
    void openInput({ title: 'New folder name', defaultValue: '' });

    expect((screen.getByText('OK') as HTMLButtonElement).disabled).toBe(true);
  });

  it('resolves true only on explicit confirmation', async () => {
    render(<Harness />);
    const result = openConfirm({ title: 'Delete “a.txt”?' });

    fireEvent.click(screen.getByText('OK'));

    await expect(result).resolves.toBe(true);
  });

  it('treats a cancelled confirm as a decline', async () => {
    render(<Harness />);
    const result = openConfirm({ title: 'Delete “a.txt”?' });

    fireEvent.click(screen.getByText('Cancel'));

    await expect(result).resolves.toBe(false);
  });

  it('settles a dialog still open at unmount instead of leaving the caller hanging', async () => {
    const view = render(<Harness />);
    const result = openInput({ title: 'Rename', defaultValue: 'a.txt' });

    view.unmount();

    await expect(result).resolves.toBeNull();
  });

  it('settles the previous request when a second one arrives', async () => {
    // The panel stays interactive behind the backdrop (no focus trap), so a second request is
    // reachable — Shift+Tab to the toolbar and press Enter. Replacing state without settling would
    // leave the first caller awaiting forever.
    render(<Harness />);
    const first = openInput({ title: 'Rename', defaultValue: 'a.txt' });
    const second = openInput({ title: 'New folder name', defaultValue: 'new-folder' });

    await expect(first).resolves.toBeNull();

    fireEvent.click(screen.getByText('Cancel'));
    await expect(second).resolves.toBeNull();
  });

  it('does not confirm when Enter is pressed on the Cancel button', async () => {
    // The keydown handler sits on the backdrop and sees the event before the button's click, so
    // without a target check Enter on Cancel resolved the name and performed the rename.
    render(<Harness />);
    const result = openInput({ title: 'Rename', defaultValue: 'a.txt' });

    fireEvent.keyDown(screen.getByText('Cancel'), { key: 'Enter' });
    fireEvent.click(screen.getByText('Cancel'));

    await expect(result).resolves.toBeNull();
  });

  it('confirms on Enter from the text field', async () => {
    render(<Harness />);
    const result = openInput({ title: 'Rename', defaultValue: 'a.txt' });

    fireEvent.keyDown(screen.getByDisplayValue('a.txt'), { key: 'Enter' });

    await expect(result).resolves.toBe('a.txt');
  });

  it('dismisses on Escape', async () => {
    render(<Harness />);
    const result = openConfirm({ title: 'Delete “a.txt”?' });

    fireEvent.keyDown(screen.getByText('OK'), { key: 'Escape' });

    await expect(result).resolves.toBe(false);
  });

  it('dismisses when the backdrop is clicked', async () => {
    // Without this a keyboard user whose focus left the dialog had no way out: the backdrop cannot
    // hold focus, so Escape stopped reaching the handler.
    const view = render(<Harness />);
    const result = openInput({ title: 'Rename', defaultValue: 'a.txt' });

    fireEvent.click(view.container.firstChild as HTMLElement);

    await expect(result).resolves.toBeNull();
  });

  it('gives the text field an accessible name', () => {
    render(<Harness />);
    void openInput({ title: 'New folder name', defaultValue: 'x' });

    expect(screen.getByDisplayValue('x').getAttribute('aria-label')).toBe('New folder name');
  });

  it('labels the dialog by its visible title and does not claim modality', () => {
    // The backdrop is absolutely positioned inside the panel, so the rest of the page stays
    // reachable; aria-modal would be a false claim to a screen reader.
    render(<Harness />);
    void openConfirm({ title: 'Delete “a.txt”?' });

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBeNull();
    expect(document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Delete “a.txt”?');
  });
});
