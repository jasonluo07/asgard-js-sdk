// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { t } from '../../i18n';
import { FileExplorerProvider } from './file-explorer-context';
import { FileExplorerRoot, FileExplorerWorkspace } from './file-explorer-parts';
import { FsListResult, FsProviders, FsSource } from './types';

/**
 * The toolbar and the right-click menu must offer the *same* set of actions — the consumer spec
 * (`asgard-sindri-pm` `docs/spec/asgard-sindri/panels.md` §檔案樹, restated in its F-004 AC3) says so, and
 * Sindri's 2026-08-12 acceptance run failed on exactly that: the toolbar had grown neither new-file nor
 * rename, and the viewer had no download at all.
 *
 * These lock the entry points together. Asserting the toolbar's *order* rather than just its membership is
 * deliberate: AC3 lists the ten actions in order, and order is the part a later edit silently disturbs.
 */

const SOURCE: FsSource = { id: 'src-1', label: 'Source', rootPath: '/work' };

const IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

const CONTENT: Record<string, string> = {
  '/work/a.txt': 'hello',
  '/work/pic.png': IMAGE_DATA_URL,
};

/** The ten actions Sindri F-004 AC3 lists, in the order it lists them. */
const AC3_ORDER = [
  'fileExplorer.newFile',
  'fileExplorer.newFolder',
  'fileExplorer.upload',
  'fileExplorer.download',
  'fileExplorer.copy',
  'fileExplorer.cut',
  'fileExplorer.paste',
  'fileExplorer.rename',
  'fileExplorer.delete',
  'fileExplorer.refresh',
] as const;

afterEach(() => {
  cleanup();
});

const listDir = async (): Promise<FsListResult> => ({
  entries: [
    { name: 'a.txt', isDir: false, sizeBytes: 5, mtimeUnix: 0, mode: 420 },
    { name: 'pic.png', isDir: false, sizeBytes: 9, mtimeUnix: 0, mode: 420 },
  ],
  truncated: false,
});

const readFile = async (_sourceId: string, path: string): Promise<string> => CONTENT[path] ?? '';

function Harness({ providers }: { providers: FsProviders }): ReactNode {
  const controller = useFileExplorerController();

  return (
    <FileExplorerProvider sources={[SOURCE]} controller={controller} providers={providers}>
      <FileExplorerRoot>
        <FileExplorerWorkspace />
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}

/** The toolbar button carrying `key`'s label. */
function toolButton(key: string): HTMLButtonElement {
  const toolbar = screen.getByRole('toolbar');
  const found = Array.from(toolbar.querySelectorAll('button')).find(
    b => b.getAttribute('aria-label') === t('en-US', key),
  );
  if (!found) throw new Error(`no toolbar button labelled ${key}`);

  return found;
}

/** Answer the prompt dialog with `name`. */
function confirmPrompt(name?: string): void {
  if (name !== undefined) {
    fireEvent.change(screen.getByRole('dialog').querySelector('input') as HTMLInputElement, {
      target: { value: name },
    });
  }

  fireEvent.click(screen.getByText(t('en-US', 'fileExplorer.confirm')));
}

describe('F-004 AC3 — the toolbar offers the same actions as the right-click menu', () => {
  it('lays the ten actions out in the order the spec lists them', async () => {
    render(<Harness providers={{ listDir, readFile, saveFile: vi.fn(), move: vi.fn() }} />);
    await screen.findByText('a.txt');

    const labels = Array.from(screen.getByRole('toolbar').querySelectorAll('button')).map(b =>
      b.getAttribute('aria-label'),
    );

    expect(labels).toEqual(AC3_ORDER.map(key => t('en-US', key)));
  });

  it('creates a file into the same target directory the other directory actions use', async () => {
    // Nothing selected → the tree root, the rule new-folder and paste already follow.
    const saveFile = vi.fn(async (): Promise<void> => undefined);
    render(<Harness providers={{ listDir, readFile, saveFile }} />);
    await screen.findByText('a.txt');

    fireEvent.click(toolButton('fileExplorer.newFile'));
    confirmPrompt();

    await waitFor(() => expect(saveFile).toHaveBeenCalledWith(SOURCE.id, '/work/untitled.txt', ''));
  });

  it('renames the selected entry through the same move the context menu calls', async () => {
    const move = vi.fn(async (): Promise<void> => undefined);
    render(<Harness providers={{ listDir, readFile, move }} />);

    fireEvent.click(await screen.findByText('a.txt'));
    fireEvent.click(toolButton('fileExplorer.rename'));
    confirmPrompt('b.txt');

    await waitFor(() => expect(move).toHaveBeenCalledWith(SOURCE.id, '/work/a.txt', '/work/b.txt'));
  });

  it('disables rename until something is selected', async () => {
    render(<Harness providers={{ listDir, readFile, move: vi.fn() }} />);
    await screen.findByText('a.txt');

    expect(toolButton('fileExplorer.rename').disabled).toBe(true);

    fireEvent.click(screen.getByText('a.txt'));

    expect(toolButton('fileExplorer.rename').disabled).toBe(false);
  });

  it('disables new-file and rename when the host cannot write or move', async () => {
    // Gating on the provider rather than hiding the button keeps the toolbar's shape stable across hosts.
    render(<Harness providers={{ listDir, readFile }} />);
    fireEvent.click(await screen.findByText('a.txt'));

    expect(toolButton('fileExplorer.newFile').disabled).toBe(true);
    expect(toolButton('fileExplorer.rename').disabled).toBe(true);
  });
});

describe('F-004 AC5 — the viewer can download the file it has open', () => {
  it('downloads through the same provider call the tree makes for that entry', async () => {
    const download = vi.fn(async (): Promise<void> => undefined);
    render(<Harness providers={{ listDir, readFile, download }} />);

    fireEvent.doubleClick(await screen.findByText('a.txt'));
    fireEvent.click(await screen.findByLabelText(t('en-US', 'fileExplorer.download')));

    expect(download).toHaveBeenCalledWith(SOURCE.id, '/work/a.txt', 'a.txt');
  });

  it('offers it for an image, which has no preview/source toggle to sit behind', async () => {
    render(<Harness providers={{ listDir, readFile, download: vi.fn() }} />);

    fireEvent.doubleClick(await screen.findByText('pic.png'));

    expect(await screen.findByLabelText(t('en-US', 'fileExplorer.download'))).toBeTruthy();
    expect(screen.queryByLabelText(t('en-US', 'fileExplorer.switchToEdit'))).toBeNull();
  });

  it('shows the button disabled when the host serves no downloads', async () => {
    render(<Harness providers={{ listDir, readFile }} />);

    fireEvent.doubleClick(await screen.findByText('a.txt'));

    const button = await screen.findByLabelText(t('en-US', 'fileExplorer.download'));
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
