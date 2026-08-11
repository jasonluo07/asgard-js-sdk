// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { t } from '../../i18n';
import { FileExplorerProvider, useFileExplorer } from './file-explorer-context';
import { FileExplorerPanel } from './file-explorer-panel';
import { FileExplorerCwd, FileExplorerRoot, FileExplorerToolbar } from './file-explorer-parts';
import { FileExplorerTree } from './file-explorer-tree';
import { FsEntry, FsListResult, FsSource } from './types';

/**
 * The File Explorer is assembled from parts so a host with a different header (Sindri's directory tab,
 * which browses a directory volume and has nothing to pick between) can reuse every behavior below the
 * header. These cover the invariants that make that safe.
 */

const SOURCE: FsSource = { id: 'src-1', label: 'Sandbox A', rootPath: '/work' };
const ENTRY: FsEntry = { name: 'a.txt', path: '/work/a.txt', isDir: false, sizeBytes: 1, mtimeUnix: 0, mode: 420 };

const PROVIDERS = {
  listDir: async (): Promise<{ entries: []; truncated: boolean }> => ({ entries: [], truncated: false }),
  remove: async (): Promise<void> => undefined,
};

afterEach(() => {
  cleanup();
});

function DeleteTrigger(): ReactNode {
  const { actDelete } = useFileExplorer();

  return (
    <button type="button" onClick={() => void actDelete(ENTRY)}>
      trigger-delete
    </button>
  );
}

function Harness({ sources }: { sources: FsSource[] }): ReactNode {
  const controller = useFileExplorerController();

  return (
    <FileExplorerProvider sources={sources} controller={controller} providers={PROVIDERS}>
      <FileExplorerRoot>
        <DeleteTrigger />
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}

describe('File Explorer composition', () => {
  it('keeps a pending confirm on screen when the source list empties', () => {
    // The sandbox list is repolled every 15s and drops idle-recycled entries, so this happens
    // mid-flight. When the dialog was rendered per-branch, the "no sandbox" branch dropped it: the
    // awaiting action never settled and the dialog reappeared unprompted once a sandbox came back.
    const { rerender } = render(<Harness sources={[SOURCE]} />);

    fireEvent.click(screen.getByText('trigger-delete'));
    const title = t('en-US', 'fileExplorer.confirmDelete', { name: ENTRY.name });
    expect(screen.getByText(title)).toBeTruthy();

    rerender(<Harness sources={[]} />);

    expect(screen.queryByText(title)).toBeTruthy();
  });

  it('fails loudly when a part is rendered outside the provider', () => {
    // Silently falling back to defaults is how Sindri once shipped a light-on-dark panel and an
    // English-only panel inside an otherwise translated app — cosmetic symptoms, far from the cause.
    const onError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<FileExplorerToolbar />)).toThrow(/FileExplorer\.Provider/);

    onError.mockRestore();
  });

  it('roots the tree at basePath while the cwd keeps showing the source root', async () => {
    // Heimdall drives the built-in aside with `<Chatbot fileExplorerBasePath>` to pin the tree to one
    // article workspace, and F-021 AC2 requires the cwd line to keep reporting the real working
    // directory. The two therefore have to disagree — an override that also moved the cwd would read
    // as "the sandbox lives here", which is not true.
    const listDir = vi.fn(async (): Promise<FsListResult> => ({ entries: [], truncated: false }));

    render(<BasePathHarness listDir={listDir} />);

    await waitFor(() => expect(listDir).toHaveBeenCalledWith(SOURCE.id, '/work/articles/42'));
    expect(screen.getByText(SOURCE.rootPath)).toBeTruthy();
  });

  it('does not sit on a spinner when a basePath is set but no source exists', async () => {
    // `basePath` supplies a tree root independently of the source list, so a hand-assembled explorer can
    // reach "there is a root but nothing to list". The tree used to bail out of its fetch effect while
    // leaving its initial loading state alone — a spinner that never resolves.
    const listDir = vi.fn(async (): Promise<FsListResult> => ({ entries: [], truncated: false }));

    render(<BasePathHarness listDir={listDir} sources={[]} />);

    await waitFor(() => expect(screen.queryByText(t('en-US', 'fileExplorer.loading'))).toBeNull());
    expect(listDir).not.toHaveBeenCalled();
  });

  it('still renders the panel frame when there is no sandbox to browse', () => {
    const { container } = render(<PanelHarness />);

    // The frame — and with it the dialog host and the upload input — survives the empty branch.
    expect(container.querySelector('input[type="file"]')).toBeTruthy();
    expect(screen.getByText(t('en-US', 'fileExplorer.noSandboxTitle'))).toBeTruthy();
  });
});

function PanelHarness(): ReactNode {
  const controller = useFileExplorerController();

  return <FileExplorerPanel sandboxes={[]} controller={controller} listDir={PROVIDERS.listDir} />;
}

function BasePathHarness({
  listDir,
  sources = [SOURCE],
}: {
  listDir: () => Promise<FsListResult>;
  sources?: FsSource[];
}): ReactNode {
  const controller = useFileExplorerController();

  return (
    <FileExplorerProvider
      sources={sources}
      controller={controller}
      providers={{ listDir }}
      basePath="/work/articles/42"
    >
      <FileExplorerRoot>
        <FileExplorerCwd />
        <FileExplorerTree />
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}
