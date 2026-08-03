// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Locale, t } from '../../../i18n';
import { FileExplorerDialogApi, useFileExplorerDialog } from './file-explorer-dialog';

/**
 * asgard-sdk-pm#49 — `file-explorer/` shipped with every user-visible string hardcoded in
 * Traditional Chinese (its `i18n` import count was 0), so any consumer not on `zh-TW` got a fully
 * Chinese Files panel. The same file drove create / rename / delete through `window.prompt` and
 * `window.confirm`, which cannot be localized, ignore `AsgardThemeScope`, and block the whole tab —
 * the last of which froze CDP-driven e2e outright.
 */

const DIR = join(__dirname);
const LOCALES: Locale[] = ['en-US', 'ja-JP', 'zh-TW'];

/** Source files of the panel itself — tests and styles excluded. */
function sourceFiles(): string[] {
  return readdirSync(DIR)
    .filter(f => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('.spec.'))
    .map(f => join(DIR, f));
}

describe('File Explorer localization', () => {
  it('leaves no hardcoded CJK string in the panel source', () => {
    const offenders = sourceFiles().filter(f => /[一-鿿]/.test(readFileSync(f, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('no longer calls the blocking native dialogs', () => {
    // Comments may still name them; only real call expressions matter.
    const offenders = sourceFiles().filter(f => /(?<!`)\bwindow\.(prompt|confirm)\s*\(/.test(readFileSync(f, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('resolves every sampled fileExplorer key in all three catalogs', () => {
    // `t` falls back to en-US, so a key missing from ja/zh is invisible at runtime. Asserting the
    // result differs from the key itself is what actually catches an untranslated entry.
    const sampled = [
      'fileExplorer.newFolder',
      'fileExplorer.delete',
      'fileExplorer.confirmDelete',
      'fileExplorer.cancel',
      'fileExplorer.loadingEditor',
    ];

    for (const locale of LOCALES) {
      for (const key of sampled) {
        expect(t(locale, key, { name: 'x' })).not.toBe(key);
      }
    }
  });

  it('interpolates the entry name into the delete confirmation', () => {
    expect(t('en-US', 'fileExplorer.confirmDelete', { name: 'notes.txt' })).toContain('notes.txt');
    expect(t('ja-JP', 'fileExplorer.confirmDeleteDir', { name: 'src' })).toContain('src');
  });

  it('falls back to en-US for a key a locale does not define', () => {
    expect(t('ja-JP', 'definitely.missing.key')).toBe('definitely.missing.key');
    expect(t('zh-TW', 'fileExplorer.confirm')).not.toBe('fileExplorer.confirm');
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
});
