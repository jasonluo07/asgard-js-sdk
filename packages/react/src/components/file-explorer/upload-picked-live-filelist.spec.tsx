// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { t } from '../../i18n';
import { FileExplorerProvider } from './file-explorer-context';
import { FileExplorerRoot, FileExplorerToolbar } from './file-explorer-parts';
import { FsListResult, FsSource, FsUploadMany } from './types';

/**
 * F-031 — `input.files` is **live**, and the batch never started because of it.
 *
 * Clearing `input.value` is required: without it, picking the same file twice in a row fires no
 * `change` event at all. But clearing it also empties the `FileList` the handler is holding, so
 * reading that list afterwards finds nothing and the upload silently does not happen — no error, no
 * console warning, just a batch that never appears.
 *
 * This shipped briefly and was caught only by driving a real browser: the usual
 * `fireEvent.change(input, { target: { files: [...] } })` assigns a plain array, which has none of
 * the live semantics and passes either way. The fixture below restores them — `files` returns one
 * object, and setting `value` empties **that** object — so the order of the two operations is what
 * the test actually measures.
 */

const SOURCE: FsSource = { id: 'src-1', label: 'Source', rootPath: '/work' };

afterEach(() => {
  cleanup();
});

type UploadManyMock = Mock<Parameters<FsUploadMany>, ReturnType<FsUploadMany>>;

function Harness({ uploadMany }: { uploadMany: UploadManyMock }): ReactNode {
  const controller = useFileExplorerController();
  const listDir = async (): Promise<FsListResult> => ({ entries: [], truncated: false });

  return (
    <FileExplorerProvider sources={[SOURCE]} controller={controller} providers={{ listDir, uploadMany }}>
      <FileExplorerRoot>
        <FileExplorerToolbar />
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}

/** Give an input the browser's own live-`FileList` behavior. */
function makeLive(input: HTMLInputElement, files: File[]): void {
  const live = [...files];

  Object.defineProperty(input, 'files', { configurable: true, get: () => live as unknown as FileList });
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => '',
    // The browser empties the list itself; emptying in place (rather than rebinding) is what makes a
    // handler that kept a reference see zero files.
    set: () => {
      live.length = 0;
    },
  });
}

describe('F-031 R1 — a picked FileList is copied before the input is cleared', () => {
  it('uploads every picked file even though clearing the input empties the live list', async () => {
    const uploadMany: UploadManyMock = vi.fn<Parameters<FsUploadMany>, ReturnType<FsUploadMany>>(
      (): Promise<void> => Promise.resolve(),
    );
    const { container } = render(<Harness uploadMany={uploadMany} />);

    // Opening the upload menu is what records the destination.
    fireEvent.click(screen.getByLabelText(t('en-US', 'fileExplorer.upload')));

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('the hidden upload input is missing');

    makeLive(input, [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')]);
    fireEvent.change(input);

    await waitFor(() => expect(uploadMany).toHaveBeenCalledTimes(2));
    expect(uploadMany.mock.calls.map(call => call[2])).toEqual(['a.txt', 'b.txt']);
    // Cleared, so picking the same files again still fires `change`.
    expect(input.files).toHaveLength(0);
  });
});
