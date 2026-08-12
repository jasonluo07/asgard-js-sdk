// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useFileExplorerController, type FileExplorerController } from '../../hooks/use-file-explorer-controller';
import { FileExplorerProvider, useFileExplorer } from './file-explorer-context';
import { FileExplorerRoot } from './file-explorer-parts';
import { FsEntry, FsListResult, FsSource } from './types';

/**
 * F-027 AC8 — "leaving a source must not leave its open file behind; coming back must restore it."
 *
 * The explorer used to hold one copy of that state and wipe it whenever the active source changed, so
 * the first half held only because everything was thrown away — and the second half could not hold at
 * all. These pin both halves, plus the remount case that is the whole reason the state sits on the
 * consumer-owned controller rather than inside the provider.
 */

const A: FsSource = { id: 'src-a', label: 'A', rootPath: '/work' };
const B: FsSource = { id: 'src-b', label: 'B', rootPath: '/work' };

const FILE_A: FsEntry = { name: 'a.txt', path: '/work/a.txt', isDir: false, sizeBytes: 1, mtimeUnix: 0, mode: 420 };
const FILE_B: FsEntry = { name: 'b.txt', path: '/work/b.txt', isDir: false, sizeBytes: 1, mtimeUnix: 0, mode: 420 };

const PROVIDERS = {
  listDir: async (): Promise<FsListResult> => ({ entries: [], truncated: false }),
};

afterEach(() => {
  cleanup();
});

/** Reports what the explorer currently considers open / expanded, and lets a test drive both. */
function ViewProbe(): ReactNode {
  const { openFile, expanded, setOpenFile, toggleExpand } = useFileExplorer();

  return (
    <>
      <div data-testid="open">{openFile?.path ?? 'none'}</div>
      <div data-testid="expanded">{[...expanded].sort().join(',') || 'none'}</div>
      <button type="button" onClick={() => setOpenFile(FILE_A)}>
        open-a
      </button>
      <button type="button" onClick={() => setOpenFile(FILE_B)}>
        open-b
      </button>
      <button type="button" onClick={() => toggleExpand('/work/sub')}>
        expand-sub
      </button>
    </>
  );
}

/** The explorer subtree. Separated from the controller so a test can unmount just this part. */
function Explorer({ controller }: { controller: FileExplorerController }): ReactNode {
  return (
    <FileExplorerProvider sources={[A, B]} controller={controller} providers={PROVIDERS}>
      <FileExplorerRoot>
        <ViewProbe />
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}

/**
 * Controller and explorer in one component — the ordinary arrangement, where both live or die
 * together.
 */
function Harness(): ReactNode {
  const controller = useFileExplorerController();

  return (
    <>
      <button type="button" onClick={() => controller.selectSource(A.id)}>
        to-a
      </button>
      <button type="button" onClick={() => controller.selectSource(B.id)}>
        to-b
      </button>
      <Explorer controller={controller} />
    </>
  );
}

/**
 * Controller held ABOVE the part that gets unmounted — Sindri's arrangement once the controller moves
 * out of the conversation subtree, which React rebuilds wholesale on every conversation switch.
 */
function RemountHarness({ mounted }: { mounted: boolean }): ReactNode {
  const controller = useFileExplorerController();

  return <>{mounted ? <Explorer controller={controller} /> : <div>unmounted</div>}</>;
}

const open = (): string => screen.getByTestId('open').textContent ?? '';
const expanded = (): string => screen.getByTestId('expanded').textContent ?? '';

describe('per-source view state (F-027 AC8)', () => {
  it('does not carry the open file over to a different source', () => {
    render(<Harness />);

    fireEvent.click(screen.getByText('open-a'));
    expect(open()).toBe(FILE_A.path);

    fireEvent.click(screen.getByText('to-b'));

    expect(open()).toBe('none');
  });

  it('restores the open file and expanded dirs when the same source comes back', () => {
    // The half that could not hold before: switching away used to wipe the state outright, so there
    // was nothing left to come back to.
    render(<Harness />);

    fireEvent.click(screen.getByText('open-a'));
    fireEvent.click(screen.getByText('expand-sub'));
    fireEvent.click(screen.getByText('to-b'));
    expect(open()).toBe('none');

    fireEvent.click(screen.getByText('to-a'));

    expect(open()).toBe(FILE_A.path);
    expect(expanded()).toBe('/work/sub');
  });

  it('keeps each source to its own file, rather than one most-recent slot', () => {
    // A single "last opened file" slot would pass the two tests above and still fail here: returning
    // to A would show B's file, or nothing at all.
    render(<Harness />);

    fireEvent.click(screen.getByText('open-a'));
    fireEvent.click(screen.getByText('to-b'));
    fireEvent.click(screen.getByText('open-b'));
    fireEvent.click(screen.getByText('to-a'));

    expect(open()).toBe(FILE_A.path);

    fireEvent.click(screen.getByText('to-b'));

    expect(open()).toBe(FILE_B.path);
  });

  it('survives the explorer being unmounted while the controller outlives it', () => {
    // This is what AC8 asks for across a conversation switch, and it is the reason the state lives on
    // the controller: anything held inside the provider dies with the subtree, by construction.
    const { rerender } = render(<RemountHarness mounted />);

    fireEvent.click(screen.getByText('open-a'));
    expect(open()).toBe(FILE_A.path);

    rerender(<RemountHarness mounted={false} />);
    expect(screen.getByText('unmounted')).toBeTruthy();

    rerender(<RemountHarness mounted />);

    expect(open()).toBe(FILE_A.path);
  });
});
