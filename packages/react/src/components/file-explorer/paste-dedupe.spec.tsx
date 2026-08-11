// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { FileExplorerProvider, useFileExplorer } from './file-explorer-context';
import { FileExplorerRoot } from './file-explorer-parts';
import { uniqueName } from './paths';
import { FsEntry, FsListResult, FsSource } from './types';

/**
 * Pasting into a folder that already holds the name is the *normal* case — copy → paste into the same
 * folder is how you duplicate a file. Both backends answer that with 409 when no overwrite flag is
 * given, and the explorer swallows failures (the tree just refetches), so the user saw the button do
 * nothing at all. The name gets a suffix instead of being overwritten or dropped.
 */

const SOURCE: FsSource = { id: 'src-1', label: 'Source', rootPath: '/work' };
const FILE: FsEntry = { name: 'a.txt', path: '/work/a.txt', isDir: false, sizeBytes: 1, mtimeUnix: 0, mode: 420 };

const EXISTING = ['a.txt', 'a (1).txt'];

afterEach(() => {
  cleanup();
});

describe('uniqueName', () => {
  it('leaves a free name alone', () => {
    expect(uniqueName(new Set(['b.txt']), 'a.txt')).toBe('a.txt');
  });

  it('suffixes before the extension and skips names already taken', () => {
    expect(uniqueName(new Set(EXISTING), 'a.txt')).toBe('a (2).txt');
  });

  it('treats a leading dot as part of the stem, not an extension', () => {
    expect(uniqueName(new Set(['.gitignore']), '.gitignore')).toBe('.gitignore (1)');
  });

  it('suffixes extensionless names at the end', () => {
    expect(uniqueName(new Set(['notes']), 'notes')).toBe('notes (1)');
  });
});

function PasteHarness({
  op,
  copy,
  move,
  entry = FILE,
}: {
  op: 'copy' | 'cut';
  copy?: (sourceId: string, src: string, dst: string) => Promise<void>;
  move?: (sourceId: string, src: string, dst: string) => Promise<void>;
  entry?: FsEntry;
}): ReactNode {
  const controller = useFileExplorerController();
  const listDir = async (): Promise<FsListResult> => ({
    entries: EXISTING.map(name => ({ name, isDir: false, sizeBytes: 1, mtimeUnix: 0, mode: 420 })),
    truncated: false,
  });

  return (
    <FileExplorerProvider sources={[SOURCE]} controller={controller} providers={{ listDir, copy, move }}>
      <FileExplorerRoot>
        <PasteTrigger op={op} entry={entry} />
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}

// Two buttons, mirroring the real interaction: the clipboard is filled by one click and consumed by a
// later one. Doing both in a single handler would only read a stale `clipboard` from the closure.
function PasteTrigger({ op, entry }: { op: 'copy' | 'cut'; entry: FsEntry }): ReactNode {
  const { setClipboard, actPaste } = useFileExplorer();

  return (
    <>
      <button type="button" onClick={() => setClipboard({ op, entry })}>
        fill-clipboard
      </button>
      <button type="button" onClick={() => void actPaste('/work/dst')}>
        paste
      </button>
    </>
  );
}

describe('paste', () => {
  it('deduplicates the name when the destination already holds it', async () => {
    const copy = vi.fn(async (): Promise<void> => undefined);

    render(<PasteHarness op="copy" copy={copy} />);
    fireEvent.click(screen.getByText('fill-clipboard'));
    fireEvent.click(screen.getByText('paste'));

    await waitFor(() => expect(copy).toHaveBeenCalledWith(SOURCE.id, '/work/a.txt', '/work/dst/a (2).txt'));
  });

  it('does nothing when cutting and pasting into the same folder', async () => {
    // Not a collision — the item is already where it was asked to go. Deduplicating here would rename
    // a file the user only meant to leave alone.
    const move = vi.fn(async (): Promise<void> => undefined);
    const sameDir: FsEntry = { ...FILE, path: '/work/dst/a.txt' };

    render(<PasteHarness op="cut" move={move} entry={sameDir} />);
    fireEvent.click(screen.getByText('fill-clipboard'));
    fireEvent.click(screen.getByText('paste'));

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(move).not.toHaveBeenCalled();
  });
});
