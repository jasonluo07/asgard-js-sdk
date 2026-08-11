// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { t } from '../../i18n';
import { FileExplorerProvider, useFileExplorer } from './file-explorer-context';
import { FileExplorerPanel } from './file-explorer-panel';
import { FileExplorerRoot, FileExplorerToolbar } from './file-explorer-parts';
import { FsEntry, FsSource } from './types';

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
