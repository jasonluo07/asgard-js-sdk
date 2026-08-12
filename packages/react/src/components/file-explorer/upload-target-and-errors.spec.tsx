// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { t } from '../../i18n';
import { FileExplorerProvider, useFileExplorer } from './file-explorer-context';
import { FileExplorerBody, FileExplorerRoot, FileExplorerToolbar } from './file-explorer-parts';
import { FileExplorerTree } from './file-explorer-tree';
import { FsEntry, FsListResult, FsSource } from './types';

/**
 * UC-005（上傳與檔案樹整理）的兩條分支，用測試而非人工操作驗：
 *
 * - 上傳的落點：未選取或選取檔案時進樹根，選取資料夾時進該資料夾。
 * - 某一層讀取失敗時就地顯示錯誤，且不影響樹的其他部分。
 *
 * 上傳這條在瀏覽器裡驅動不了——任何 UI 路徑都會開啟原生檔案選擇對話框。jsdom 沒有那個對話框
 * （`input.click()` 是 no-op），所以這裡反而能直接斷言「傳給 provider 的目標目錄是哪一個」，
 * 比人工點一次還精確。
 */

const SOURCE: FsSource = { id: 'src-1', label: 'Source', rootPath: '/work' };
const FOLDER: FsEntry = { name: 'docs', path: '/work/docs', isDir: true, sizeBytes: 0, mtimeUnix: 0, mode: 493 };
const FILE: FsEntry = { name: 'a.txt', path: '/work/a.txt', isDir: false, sizeBytes: 1, mtimeUnix: 0, mode: 420 };

afterEach(() => {
  cleanup();
});

/**
 * Selects `entry` on click, mirroring a user single-click before hitting the toolbar.
 *
 * Deliberately not a mount effect: the provider clears the selection whenever the active source changes,
 * and that effect also runs on mount — after this child's effects would have — so a selection made during
 * mount is wiped before the toolbar ever sees it.
 */
function SelectButton({ entry }: { entry: FsEntry | null }): ReactNode {
  const { onSelect } = useFileExplorer();

  return (
    <button type="button" onClick={() => entry && onSelect(entry)}>
      select
    </button>
  );
}

function UploadHarness({
  selected,
  upload,
}: {
  selected: FsEntry | null;
  upload: (sourceId: string, dirPath: string, file: File) => Promise<void>;
}): ReactNode {
  const controller = useFileExplorerController();
  const listDir = async (): Promise<FsListResult> => ({ entries: [], truncated: false });

  return (
    <FileExplorerProvider sources={[SOURCE]} controller={controller} providers={{ listDir, upload }}>
      <FileExplorerRoot>
        <SelectButton entry={selected} />
        <FileExplorerToolbar />
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}

async function pickFile(container: HTMLElement, locale = 'en-US'): Promise<void> {
  fireEvent.click(screen.getByText('select'));
  fireEvent.click(screen.getByLabelText(t(locale, 'fileExplorer.upload')));

  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error('the hidden upload input is missing');

  fireEvent.change(input, { target: { files: [new File(['x'], 'picked.txt', { type: 'text/plain' })] } });
}

describe('UC-005 — where an upload lands', () => {
  it('drops into the selected folder', async () => {
    const upload = vi.fn(async (): Promise<void> => undefined);
    const { container } = render(<UploadHarness selected={FOLDER} upload={upload} />);

    await pickFile(container);

    await waitFor(() => expect(upload).toHaveBeenCalledWith(SOURCE.id, FOLDER.path, expect.any(File)));
  });

  it('drops into the tree root when a file is selected — a file is not a destination', async () => {
    const upload = vi.fn(async (): Promise<void> => undefined);
    const { container } = render(<UploadHarness selected={FILE} upload={upload} />);

    await pickFile(container);

    await waitFor(() => expect(upload).toHaveBeenCalledWith(SOURCE.id, SOURCE.rootPath, expect.any(File)));
  });

  it('drops into the tree root when nothing is selected', async () => {
    const upload = vi.fn(async (): Promise<void> => undefined);
    const { container } = render(<UploadHarness selected={null} upload={upload} />);

    await pickFile(container);

    await waitFor(() => expect(upload).toHaveBeenCalledWith(SOURCE.id, SOURCE.rootPath, expect.any(File)));
  });
});

function ErrorTreeHarness(): ReactNode {
  const controller = useFileExplorerController();
  // The root lists fine and holds one folder; that folder's own listing fails.
  const listDir = async (_sourceId: string, path: string): Promise<FsListResult> => {
    if (path === FOLDER.path) throw new Error('boom');

    return {
      entries: [
        { name: FOLDER.name, isDir: true, sizeBytes: 0, mtimeUnix: 0, mode: 493 },
        { name: FILE.name, isDir: false, sizeBytes: 1, mtimeUnix: 0, mode: 420 },
      ],
      truncated: false,
    };
  };

  return (
    <FileExplorerProvider sources={[SOURCE]} controller={controller} providers={{ listDir }}>
      <FileExplorerRoot>
        <FileExplorerBody>
          <FileExplorerTree />
        </FileExplorerBody>
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}

describe('UC-005 — a level that fails to list', () => {
  it('shows the error on that level only, leaving the rest of the tree intact', async () => {
    render(<ErrorTreeHarness />);

    // Root listed fine.
    const folderRow = await screen.findByText(FOLDER.name);
    expect(screen.getByText(FILE.name)).toBeTruthy();

    fireEvent.click(folderRow);

    // The failing level reports in place…
    expect(await screen.findByText(t('en-US', 'fileExplorer.loadError', { error: 'boom' }))).toBeTruthy();
    // …and its siblings are still on screen.
    expect(screen.getByText(FILE.name)).toBeTruthy();
    expect(screen.getByText(FOLDER.name)).toBeTruthy();
  });
});
