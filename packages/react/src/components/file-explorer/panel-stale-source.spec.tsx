// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LaunchedSandbox } from '@asgard-js/core';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { t } from '../../i18n';
import { FileExplorerPanel } from './file-explorer-panel';
import { FsListResult } from './types';

/**
 * The panel decides between the tree and the "no sandbox is running" empty state. That decision must
 * agree with how the provider resolves the active source — the provider falls back to the first source
 * when the selected id is unknown, so a non-empty list always has something to browse.
 *
 * They disagreed once, and the failure was silent and convincing: a host holding one controller across
 * conversations arrives at the next one carrying the previous conversation's sandbox name, and the
 * panel reported "no sandbox is running" — with a wake button — while a sandbox was live and listable.
 */

const LIVE = [{ sandboxName: 'sbx-current', workingDirectory: '/work' }] as unknown as LaunchedSandbox[];

const listDir = async (): Promise<FsListResult> => ({ entries: [], truncated: false });

afterEach(() => {
  cleanup();
});

function Panel({ selected }: { selected: string | null }): ReactNode {
  const controller = useFileExplorerController({ activeSourceId: selected });

  return <FileExplorerPanel sandboxes={LIVE} controller={controller} listDir={listDir} onNudge={() => undefined} />;
}

const emptyStateTitle = (): string => t('en-US', 'fileExplorer.noSandboxTitle');

describe('panel source resolution vs the provider', () => {
  it('shows the tree when the selected source is from a previous list but one is live now', () => {
    render(<Panel selected="sbx-from-the-previous-conversation" />);

    expect(screen.queryByText(emptyStateTitle())).toBeNull();
  });

  it('still shows the empty state when there really is no source', () => {
    function NoSources(): ReactNode {
      const controller = useFileExplorerController();

      return <FileExplorerPanel sandboxes={[]} controller={controller} listDir={listDir} onNudge={() => undefined} />;
    }

    render(<NoSources />);

    expect(screen.getByText(emptyStateTitle())).toBeTruthy();
  });
});
