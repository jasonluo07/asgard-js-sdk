// @vitest-environment jsdom
import { ReactNode, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileExplorerController, useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { FileExplorerProvider } from './file-explorer-context';
import { FileExplorerRoot } from './file-explorer-parts';
import { FsSource } from './types';

/**
 * BUILD-057 / issue #427. `requestFile()` used to spin forever: the provider's open-file effect depends
 * on `updateView`, `updateView` depended on the whole `controller`, and the controller was a fresh object
 * literal on every render. Its own `updateSourceView` call therefore produced a new controller, a new
 * `updateView`, and re-entered the effect — for as long as `requestedFile` stayed non-null.
 *
 * The built-in aside walks the same path (`fileExplorer: 'builtin'` calls `requestFile` when an
 * open-file card arrives), so this was not limited to consumers assembling their own panel.
 */

const SOURCE: FsSource = { id: 'src-1', label: 'Sandbox A', rootPath: '/work' };
const FILE_PATH = '/work/nested/a.txt';

const PROVIDERS = {
  listDir: async (): Promise<{ entries: []; truncated: boolean }> => ({ entries: [], truncated: false }),
  remove: async (): Promise<void> => undefined,
};

let renderCount = 0;

beforeEach(() => {
  renderCount = 0;
});

afterEach(() => {
  cleanup();
});

// Without this guard the regression does not fail the test — it hangs it. The loop is synchronous, so
// it blocks the event loop and vitest's own timeout never gets a turn to fire.
const RENDER_BUDGET = 50;

function Harness(): ReactNode {
  renderCount += 1;

  if (renderCount > RENDER_BUDGET) {
    throw new Error(`render loop detected: Harness rendered more than ${RENDER_BUDGET} times`);
  }

  const controller = useFileExplorerController();

  return (
    <FileExplorerProvider sources={[SOURCE]} controller={controller} providers={PROVIDERS}>
      <FileExplorerRoot>
        <button type="button" onClick={() => controller.requestFile(SOURCE.id, FILE_PATH)}>
          trigger-request
        </button>
      </FileExplorerRoot>
    </FileExplorerProvider>
  );
}

describe('requestFile settles', () => {
  it('consumes a file request without re-entering its own effect', async () => {
    render(<Harness />);

    const beforeRequest = renderCount;

    // An unbounded loop throws "Maximum update depth exceeded" out of this click, so the assertion
    // below is a second line of defense rather than the only one.
    fireEvent.click(screen.getByText('trigger-request'));

    await waitFor(() => {
      expect(renderCount).toBeGreaterThan(beforeRequest);
    });

    expect(renderCount - beforeRequest).toBeLessThan(10);
  });
});

function IdentityHarness({ onRender }: { onRender: (controller: FileExplorerController) => void }): ReactNode {
  const [tick, setTick] = useState(0);
  const controller = useFileExplorerController();

  onRender(controller);

  return (
    <button type="button" onClick={() => setTick(t => t + 1)}>
      bump-{tick}
    </button>
  );
}

describe('controller identity', () => {
  it('survives re-renders that changed nothing on the controller', () => {
    const seen: FileExplorerController[] = [];

    render(<IdentityHarness onRender={c => seen.push(c)} />);

    fireEvent.click(screen.getByText('bump-0'));
    fireEvent.click(screen.getByText('bump-1'));

    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(new Set(seen).size).toBe(1);
  });
});
