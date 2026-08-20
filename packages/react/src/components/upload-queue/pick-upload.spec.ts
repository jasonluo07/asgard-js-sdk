// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { dedupeName, isFileDrag, planFromDataTransfer, planFromFileList, splitRelPath } from './pick-upload';

/**
 * F-031 — the browser-picking layer, which is where batch upload's silent failures live.
 *
 * These are tested rather than clicked because **neither picking path can be driven by automation**:
 * `<input webkitdirectory>` opens a native dialog (in jsdom `input.click()` is a no-op, and CDP cannot
 * fill a native file chooser), and a real desktop folder drag needs `webkitGetAsEntry()` filesystem
 * entries that Playwright cannot synthesize — its file-upload helper sets `input.files`, not a
 * `DataTransfer` entry tree. What that leaves is the part that actually goes wrong: the traversal.
 *
 * The `readEntries` loop especially. It returns one batch at a time and signals the end with an empty
 * array, so reading it once drops everything past the first batch — with no error, no warning, and no
 * way for anyone to notice except by counting the files that arrived. A fake reader that hands out
 * batches of two proves the loop keeps asking.
 */

/** A `File` carrying a `webkitRelativePath`, which the constructor cannot set. */
function fileWithRelativePath(name: string, relativePath: string): File {
  const file = new File(['x'], name);

  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });

  return file;
}

interface FakeEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (onSuccess: (file: File) => void, onError: (error: unknown) => void) => void;
  createReader?: () => FileSystemDirectoryReader;
}

function fakeFile(name: string): FakeEntry {
  return {
    isFile: true,
    isDirectory: false,
    name,
    file: onSuccess => onSuccess(new File(['x'], name)),
  };
}

/**
 * A directory whose reader hands out `batchSize` children per call and then an empty array — the
 * behavior that makes reading once lose files.
 */
function fakeDir(name: string, children: FakeEntry[], batchSize = 2): FakeEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: (): FileSystemDirectoryReader => {
      let offset = 0;

      return {
        readEntries: (onSuccess: FileSystemEntriesCallback): void => {
          const batch = children.slice(offset, offset + batchSize);
          offset += batch.length;
          onSuccess(batch as unknown as FileSystemEntry[]);
        },
      };
    },
  };
}

function fakeDataTransfer(roots: FakeEntry[], files: File[] = []): DataTransfer {
  return {
    types: ['Files'],
    files: files as unknown as FileList,
    items: roots.map(root => ({ kind: 'file', webkitGetAsEntry: () => root })),
  } as unknown as DataTransfer;
}

describe('F-031 R1/R2 — picked files become a plan', () => {
  it('keeps every file from a multi-file pick, not just the first', () => {
    const plan = planFromFileList([new File(['a'], 'a.txt'), new File(['b'], 'b.txt')], 'files');

    expect(plan.items.map(item => item.relPath)).toEqual(['a.txt', 'b.txt']);
    expect(plan.emptyDirs).toEqual([]);
  });

  it('takes the relative path from a folder pick, so the structure survives', () => {
    const plan = planFromFileList(
      [fileWithRelativePath('a.md', 'notes/a.md'), fileWithRelativePath('b.md', 'notes/sub/b.md')],
      'directory',
    );

    expect(plan.items.map(item => item.relPath)).toEqual(['notes/a.md', 'notes/sub/b.md']);
    expect(plan.source).toBe('directory');
  });

  it('falls back to the file name when there is no relative path — the file must not vanish', () => {
    const plan = planFromFileList([new File(['x'], 'loose.txt')], 'directory');

    expect(plan.items.map(item => item.relPath)).toEqual(['loose.txt']);
  });
});

describe('F-031 R3 — a dropped tree is read to the end', () => {
  it('keeps reading past the first batch (25 files through a reader that yields 2 at a time)', async () => {
    const many = Array.from({ length: 25 }, (_, i) => fakeFile(`f${i}.txt`));
    const plan = await planFromDataTransfer(fakeDataTransfer([fakeDir('bulk', many)]));

    // Reading the reader once would have produced 2 — and reported success.
    expect(plan.items).toHaveLength(25);
    expect(plan.items.map(item => item.relPath)).toContain('bulk/f24.txt');
  });

  it('recurses, prefixing each level onto the relative path', async () => {
    const tree = fakeDir('notes', [fakeFile('a.md'), fakeDir('sub', [fakeFile('b.md')])]);
    const plan = await planFromDataTransfer(fakeDataTransfer([tree]));

    expect(plan.items.map(item => item.relPath).sort()).toEqual(['notes/a.md', 'notes/sub/b.md']);
  });

  it('reads every root, not only the one before the first await', async () => {
    const plan = await planFromDataTransfer(
      fakeDataTransfer([fakeDir('one', [fakeFile('a.txt')]), fakeDir('two', [fakeFile('b.txt')])]),
    );

    expect(plan.items.map(item => item.relPath).sort()).toEqual(['one/a.txt', 'two/b.txt']);
  });

  it('falls back to the flat file list when the entry API is unavailable', async () => {
    const plan = await planFromDataTransfer(fakeDataTransfer([], [new File(['x'], 'dropped.txt')]));

    expect(plan.items.map(item => item.relPath)).toEqual(['dropped.txt']);
    expect(plan.source).toBe('drop');
  });
});

describe('F-031 R4 — empty directories', () => {
  it('reports an empty directory so the caller can preserve it', async () => {
    const tree = fakeDir('notes', [fakeFile('a.md'), fakeDir('empty', [])]);
    const plan = await planFromDataTransfer(fakeDataTransfer([tree]));

    expect(plan.emptyDirs).toEqual(['notes/empty']);
    expect(plan.items.map(item => item.relPath)).toEqual(['notes/a.md']);
  });

  it('cannot see one through the folder picker — which is why the UI has to say so', () => {
    // A FileList holds files only; a directory with no files appears in no path at all. This is the
    // asymmetry `fileExplorer.uploadEmptyDirsHint` exists to state, and it is not fixable here.
    const plan = planFromFileList([fileWithRelativePath('a.md', 'notes/a.md')], 'directory');

    expect(plan.emptyDirs).toEqual([]);
  });
});

describe('F-031 — path helpers', () => {
  it('recognizes a file drag', () => {
    expect(isFileDrag(fakeDataTransfer([]))).toBe(true);
    expect(isFileDrag({ types: ['text/plain'] } as unknown as DataTransfer)).toBe(false);
    expect(isFileDrag(null)).toBe(false);
  });

  it('splits a relative path into directory and name', () => {
    expect(splitRelPath('notes/sub/b.md')).toEqual({ dir: 'notes/sub', base: 'b.md' });
    expect(splitRelPath('a.txt')).toEqual({ dir: '', base: 'a.txt' });
  });

  it('renames before the extension, and keeps the directory', () => {
    expect(dedupeName('report.txt', 2)).toBe('report (2).txt');
    expect(dedupeName('notes/report.txt', 3)).toBe('notes/report (3).txt');
    expect(dedupeName('LICENSE', 2)).toBe('LICENSE (2)');
    // A leading dot is the whole name, not an extension.
    expect(dedupeName('.gitignore', 2)).toBe('.gitignore (2)');
  });
});
