// @vitest-environment jsdom
import { ReactNode, useCallback, useRef, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { t } from '../../i18n';
import { FileExplorerProvider } from './file-explorer-context';
import { FileExplorerBody, FileExplorerRoot, FileExplorerToolbar } from './file-explorer-parts';
import { FsListResult, FsProviders, FsSource } from './types';

/**
 * issue #446 — one drop, two outcomes.
 *
 * The panel is mounted inside `<Chatbot>`'s shell, which is itself a drop target that turns dropped
 * files into composer attachments. The panel used to call only `preventDefault()`, which suppresses
 * the browser default and nothing else: the same `drop` then reached the shell, so an upload to the
 * sandbox *also* produced one attachment chip per file. The shell's own `stopPropagation()` cannot
 * help — it is the handler being reached, not the one being shadowed.
 *
 * The `Shell` below mirrors the four handlers in `components/chatbot/chatbot.tsx` (`handleDragEnter`
 * / `handleDragOver` / `handleDragLeave` / `handleDrop`), counter and all, rather than mounting a
 * real `<Chatbot>` — that would need a service context and an SSE connection, and what is under test
 * is propagation across the boundary, which this reproduces exactly. The real composition is walked
 * in the browser; the fix itself touches only the explorer side, so the shell's code is unchanged.
 */

const SOURCE: FsSource = { id: 'src-1', label: 'Sandbox A', rootPath: '/work' };

const listDir = async (): Promise<FsListResult> => ({ entries: [], truncated: false });

function fileDrag(files: File[]): DataTransfer {
  // No `items`, so `planFromDataTransfer` falls back to the flat `files` list — the shape a drag that
  // did not come from a filesystem gives, and all this needs.
  return { types: ['Files'], items: [], files: files as unknown as FileList } as unknown as DataTransfer;
}

function textDrag(): DataTransfer {
  return { types: ['text/plain'], items: [], files: [] as unknown as FileList } as unknown as DataTransfer;
}

interface ShellSpies {
  /** Files the shell turned into composer attachments — the second, unwanted outcome. */
  attached: string[][];
  /** `true` while the shell's global "drop to attach" overlay would be on screen. */
  overlay: () => boolean;
}

function Shell({ spies, children }: { spies: ShellSpies; children: ReactNode }): ReactNode {
  const dragCounterRef = useRef(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  spies.overlay = (): boolean => isDraggingOver;

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes('Files')) return;

    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDraggingOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) spies.attached.push(files.map(file => file.name));
    },
    [spies],
  );

  return (
    <div
      data-testid="shell"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div data-testid="chat-column">chat</div>
      {children}
    </div>
  );
}

function Harness({ spies, providers }: { spies: ShellSpies; providers: FsProviders }): ReactNode {
  const controller = useFileExplorerController();

  return (
    <Shell spies={spies}>
      <FileExplorerProvider sources={[SOURCE]} controller={controller} providers={providers}>
        <FileExplorerRoot>
          <FileExplorerToolbar />
          <FileExplorerBody>
            <div data-testid="tree-area">tree</div>
          </FileExplorerBody>
        </FileExplorerRoot>
      </FileExplorerProvider>
    </Shell>
  );
}

function mount(providers: FsProviders): ShellSpies {
  const spies: ShellSpies = { attached: [], overlay: () => false };

  render(<Harness spies={spies} providers={providers} />);

  return spies;
}

afterEach(() => {
  cleanup();
});

describe('issue #446 — a file drop the panel serves stays in the panel', () => {
  it('uploads the batch without also attaching it to the composer', async () => {
    const upload = vi.fn(async (): Promise<void> => undefined);
    const spies = mount({ listDir, upload });

    fireEvent.drop(screen.getByTestId('tree-area'), { dataTransfer: fileDrag([new File(['a'], 'a.txt')]) });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(upload.mock.calls[0]).toEqual(['src-1', '/work', expect.any(File)]);
    expect(spies.attached).toEqual([]);
  });

  it('keeps the shell overlay dark while its own highlight is up', () => {
    const spies = mount({ listDir, upload: async (): Promise<void> => undefined });
    const dataTransfer = fileDrag([new File(['a'], 'a.txt')]);
    const tree = screen.getByTestId('tree-area');

    fireEvent.dragEnter(tree, { dataTransfer });
    fireEvent.dragOver(tree, { dataTransfer });

    expect(spies.overlay()).toBe(false);
    expect(screen.getByText(t('en-US', 'fileExplorer.dropToUpload', { dir: '/work' }))).toBeTruthy();
  });

  it('serves a drop anywhere on the panel, not only over the tree', async () => {
    // The zone used to be spread on the body element alone, so the header row, the cwd line, the
    // toolbar and the upload progress panel all leaked to the composer.
    const upload = vi.fn(async (): Promise<void> => undefined);
    const spies = mount({ listDir, upload });

    fireEvent.drop(screen.getByLabelText(t('en-US', 'fileExplorer.upload')), {
      dataTransfer: fileDrag([new File(['a'], 'a.txt')]),
    });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(spies.attached).toEqual([]);
  });

  it('leaves the shell counter telling the truth when a drag crosses the boundary', () => {
    const spies = mount({ listDir, upload: async (): Promise<void> => undefined });
    const dataTransfer = fileDrag([new File(['a'], 'a.txt')]);
    const chat = screen.getByTestId('chat-column');
    const tree = screen.getByTestId('tree-area');

    // Into the chat column: the shell owns this drag.
    fireEvent.dragEnter(chat, { dataTransfer });
    expect(spies.overlay()).toBe(true);

    // Onto the panel. `dragenter` on the new target fires before `dragleave` on the old one.
    fireEvent.dragEnter(tree, { dataTransfer });
    fireEvent.dragLeave(chat, { dataTransfer, relatedTarget: tree });
    expect(spies.overlay()).toBe(false);

    // Back out to the chat column: the shell must take it again, so a counter left stuck at 1 by the
    // panel's claim would be as wrong as one left at 0.
    fireEvent.dragEnter(chat, { dataTransfer });
    fireEvent.dragLeave(tree, { dataTransfer, relatedTarget: chat });
    expect(spies.overlay()).toBe(true);

    fireEvent.drop(chat, { dataTransfer });
    expect(spies.overlay()).toBe(false);
    expect(spies.attached).toEqual([['a.txt']]);
  });
});

describe('issue #446 — a drag the panel cannot serve passes straight through', () => {
  it('lets the composer take the drop when the source has no upload provider', () => {
    const spies = mount({ listDir });

    fireEvent.drop(screen.getByTestId('tree-area'), { dataTransfer: fileDrag([new File(['a'], 'a.txt')]) });

    expect(spies.attached).toEqual([['a.txt']]);
  });

  it('ignores a drag that carries no files', () => {
    const upload = vi.fn(async (): Promise<void> => undefined);
    const spies = mount({ listDir, upload });
    const dataTransfer = textDrag();
    const tree = screen.getByTestId('tree-area');

    fireEvent.dragEnter(tree, { dataTransfer });
    fireEvent.dragOver(tree, { dataTransfer });
    fireEvent.drop(tree, { dataTransfer });

    expect(upload).not.toHaveBeenCalled();
    expect(spies.attached).toEqual([]);
    expect(spies.overlay()).toBe(false);
  });
});
