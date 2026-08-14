// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '../../i18n';
import { SourceSetFileExplorer } from './source-set-file-explorer';

/**
 * Behavior of the standalone SourceSet explorer, driven through a fake volume at the `fetch` boundary
 * rather than a mocked client — so the real `AsgardSourceSetClient` runs and the volume-relative path
 * rules, the paging walk and the 409 semantics are exercised exactly as they ship.
 */

const ENDPOINT = 'https://volume.test/v1/source-set/abc/volume';

interface VolumeEntry {
  name: string;
  isDir: boolean;
}

interface FakeVolume {
  /** Directory path (the root is `''`) → its entries. */
  dirs: Record<string, VolumeEntry[]>;
  files?: Record<string, string>;
  /** Force a status for one op, e.g. `{ list: 403 }`. */
  fail?: Record<string, number>;
  /** What the listing claims the directory holds; larger than what is served means a shortfall. */
  claimedTotal?: Record<string, number>;
  /** Answer without a `paging` block at all. */
  noPaging?: boolean;
}

interface VolumeProbe {
  /** Every request the component made, in order. */
  calls: { op: string; method: string; url: URL }[];
  listedPaths: () => string[];
}

const file = (name: string): VolumeEntry => ({ name, isDir: false });
const dir = (name: string): VolumeEntry => ({ name, isDir: true });

const wireEntry = (entry: VolumeEntry): Record<string, unknown> => ({
  name: entry.name,
  isDir: entry.isDir,
  sizeBytes: entry.isDir ? 0 : 3,
  mtimeUnix: 0,
  mode: 420,
});

function installVolume(volume: FakeVolume): VolumeProbe {
  const calls: { op: string; method: string; url: URL }[] = [];

  const fetchMock = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    const op = url.pathname.split('/').pop() ?? '';
    const method = init?.method ?? 'GET';
    const path = url.searchParams.get('path') ?? '';
    calls.push({ op, method, url });

    const forced = volume.fail?.[op];
    if (forced) return new Response('{"message":"nope"}', { status: forced, statusText: 'Error' });

    if (op === 'list') {
      const all = volume.dirs[path] ?? [];
      const size = Number(url.searchParams.get('page_size') ?? '1000');
      const page = Number(url.searchParams.get('page') ?? '0');
      const body: Record<string, unknown> = {
        entries: all.slice(page * size, page * size + size).map(wireEntry),
      };
      if (!volume.noPaging) {
        body.paging = { index: page, size, total: volume.claimedTotal?.[path] ?? all.length };
      }

      return Response.json({ data: body });
    }

    if (op === 'file' && method === 'GET') {
      return new Response(volume.files?.[path] ?? '', { headers: { 'X-Total-Bytes': '3' } });
    }

    if (op === 'file') {
      // PUT — `create_only` turns an occupied path into a 409 rather than an overwrite.
      const occupied = volume.files?.[path] != null || volume.dirs[path] != null;
      if (url.searchParams.get('create_only') === 'true' && occupied) {
        return new Response('{"message":"exists"}', { status: 409, statusText: 'Conflict' });
      }

      return Response.json({ data: { bytesWritten: 0 } });
    }

    if (op === 'copy') return Response.json({ data: { bytesCopied: 0 } });

    return Response.json({ data: {} });
  };

  vi.stubGlobal('fetch', fetchMock);

  return {
    calls,
    listedPaths: () => calls.filter(c => c.op === 'list').map(c => c.url.searchParams.get('path') ?? ''),
  };
}

/** Toolbar button carrying `key`'s label, or `null` when the toolbar does not offer it. */
function toolButton(key: string, vars?: Record<string, string | number>): HTMLButtonElement | null {
  const toolbar = screen.getByRole('toolbar');
  const label = t('en-US', key, vars);

  return Array.from(toolbar.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === label) ?? null;
}

function requireToolButton(key: string, vars?: Record<string, string | number>): HTMLButtonElement {
  const found = toolButton(key, vars);
  if (!found) throw new Error(`no toolbar button labelled ${key}`);

  return found;
}

function toolbarLabels(): (string | null)[] {
  return Array.from(screen.getByRole('toolbar').querySelectorAll('button')).map(b => b.getAttribute('aria-label'));
}

/** The ten actions, in the order F-025 lists them. */
const ACTION_ORDER = [
  'sourceSetExplorer.newFile',
  'sourceSetExplorer.newFolder',
  'sourceSetExplorer.upload',
  'sourceSetExplorer.download',
  'sourceSetExplorer.copy',
  'sourceSetExplorer.cut',
  'sourceSetExplorer.paste',
  'sourceSetExplorer.rename',
  'sourceSetExplorer.delete',
  'sourceSetExplorer.refresh',
] as const;

const SIMPLE: FakeVolume = {
  dirs: { '': [dir('notes'), file('a.txt')], notes: [file('todo.md')] },
  files: { 'a.txt': 'hi', 'notes/todo.md': '# todo' },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('F-025 R4 — the lazy tree', () => {
  it('lists the root, directories before files, and lists a branch only once it is opened', async () => {
    const probe = installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);

    await screen.findByText('a.txt');
    expect(screen.getAllByRole('treeitem').map(r => r.textContent)).toEqual(['notes', 'a.txt']);
    expect(probe.listedPaths()).toEqual(['']);

    fireEvent.click(screen.getByText('notes'));

    await screen.findByText('todo.md');
    expect(probe.listedPaths()).toContain('notes');
  });

  it('sends volume-relative paths, with no leading slash on a root-level entry', async () => {
    const probe = installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);

    fireEvent.doubleClick(await screen.findByText('a.txt'));

    await waitFor(() => {
      const read = probe.calls.find(c => c.op === 'file' && c.method === 'GET');
      expect(read?.url.searchParams.get('path')).toBe('a.txt');
    });
  });

  it('says a directory is empty rather than showing nothing', async () => {
    installVolume({ dirs: { '': [] } });
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);

    expect(await screen.findByText(t('en-US', 'sourceSetExplorer.emptyDir'))).toBeTruthy();
  });

  it('roots the tree at rootPath and never lists above it (R11)', async () => {
    const probe = installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" rootPath="notes" />);

    await screen.findByText('todo.md');

    expect(probe.listedPaths()).toEqual(['notes']);
    expect(screen.queryByText('a.txt')).toBeNull();
  });
});

describe('F-025 R5 — toolbar and context menu offer one set of actions', () => {
  it('lays the ten actions out in the order the spec lists them', async () => {
    installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);
    await screen.findByText('a.txt');

    expect(toolbarLabels()).toEqual(ACTION_ORDER.map(key => t('en-US', key)));
  });

  it('offers the same set in the right-click menu', async () => {
    installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);

    fireEvent.contextMenu(await screen.findByText('a.txt'));

    const labels = within(await screen.findByRole('menu'))
      .getAllByRole('menuitem')
      .map(item => item.textContent);

    expect(new Set(labels)).toEqual(new Set(ACTION_ORDER.map(key => t('en-US', key))));
  });

  it('disables selection-dependent actions rather than hiding them', async () => {
    installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);
    await screen.findByText('a.txt');

    expect(requireToolButton('sourceSetExplorer.rename').disabled).toBe(true);
    expect(requireToolButton('sourceSetExplorer.delete').disabled).toBe(true);
    // New file / folder target the root when nothing is picked, so they stay live.
    expect(requireToolButton('sourceSetExplorer.newFile').disabled).toBe(false);

    fireEvent.click(screen.getByText('a.txt'));

    expect(requireToolButton('sourceSetExplorer.rename').disabled).toBe(false);
    expect(requireToolButton('sourceSetExplorer.delete').disabled).toBe(false);
  });

  it('offers no in-tree drag affordance — moving is cut then paste (R6)', async () => {
    installVolume(SIMPLE);
    const { container } = render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);
    await screen.findByText('a.txt');

    expect(container.querySelectorAll('[draggable="true"]')).toHaveLength(0);
    expect(requireToolButton('sourceSetExplorer.cut')).toBeTruthy();
    expect(requireToolButton('sourceSetExplorer.paste').disabled).toBe(true);
  });
});

describe('F-025 R6 — pasting a name that is taken gets a suffix, not an overwrite', () => {
  it('copies to a deduplicated name in the same directory', async () => {
    const probe = installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);

    fireEvent.click(await screen.findByText('a.txt'));
    fireEvent.click(requireToolButton('sourceSetExplorer.copy'));
    // Once something is held, the button names it — the label is `pasteNamed`, not `paste`.
    fireEvent.click(requireToolButton('sourceSetExplorer.pasteNamed', { name: 'a.txt' }));

    await waitFor(() => {
      const copy = probe.calls.find(c => c.op === 'copy');
      expect(copy?.url.searchParams.get('src')).toBe('a.txt');
      expect(copy?.url.searchParams.get('dst')).toBe('a (1).txt');
    });
  });
});

describe('F-025 R9 — creating a file never overwrites one', () => {
  it('sends create_only and reports the collision by name', async () => {
    const probe = installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);
    await screen.findByText('a.txt');

    fireEvent.click(requireToolButton('sourceSetExplorer.newFile'));
    fireEvent.change(screen.getByRole('dialog').querySelector('input') as HTMLInputElement, {
      target: { value: 'a.txt' },
    });
    fireEvent.click(within(screen.getByRole('dialog')).getByText(t('en-US', 'sourceSetExplorer.confirm')));

    expect(
      await screen.findByText(t('en-US', 'sourceSetExplorer.errorNameTaken', { name: 'a.txt' }), { exact: false }),
    ).toBeTruthy();

    const put = probe.calls.find(c => c.op === 'file' && c.method === 'PUT');
    expect(put?.url.searchParams.get('create_only')).toBe('true');
  });
});

describe('F-025 R10 — readOnly removes every mutating affordance', () => {
  it('leaves only download and refresh in the toolbar', async () => {
    installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" readOnly />);
    await screen.findByText('a.txt');

    expect(toolbarLabels()).toEqual([
      t('en-US', 'sourceSetExplorer.download'),
      t('en-US', 'sourceSetExplorer.refresh'),
    ]);
  });

  it('drops them from the right-click menu too', async () => {
    installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" readOnly />);

    fireEvent.contextMenu(await screen.findByText('a.txt'));

    const labels = within(await screen.findByRole('menu'))
      .getAllByRole('menuitem')
      .map(item => item.textContent);

    expect(labels).not.toContain(t('en-US', 'sourceSetExplorer.delete'));
    expect(labels).not.toContain(t('en-US', 'sourceSetExplorer.rename'));
    expect(labels).toContain(t('en-US', 'sourceSetExplorer.download'));
  });

  it('offers no edit entry point in the open file, only a way to read it', async () => {
    // The gap this closes: the shipped file view renders its edit toggle unconditionally, so a read-only
    // mount would let the user type changes that are then silently dropped.
    installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" readOnly />);

    fireEvent.doubleClick(await screen.findByText('a.txt'));

    await screen.findByLabelText(t('en-US', 'sourceSetExplorer.reloadFile'));
    expect(screen.queryByLabelText(t('en-US', 'sourceSetExplorer.switchToEdit'))).toBeNull();
  });

  it('still lets a read-only user look at markdown source', async () => {
    installVolume(SIMPLE);
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" readOnly />);

    fireEvent.click(await screen.findByText('notes'));
    fireEvent.doubleClick(await screen.findByText('todo.md'));

    expect(await screen.findByLabelText(t('en-US', 'sourceSetExplorer.switchToSource'))).toBeTruthy();
  });
});

describe('F-026 R15 — a listing says when it is not all of it', () => {
  it('reports the shortfall by count when the volume said how many there are', async () => {
    installVolume({ dirs: { '': [file('a.txt')] }, claimedTotal: { '': 3000 } });
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" maxEntries={1} />);

    expect(
      await screen.findByText(t('en-US', 'sourceSetExplorer.moreNotLoaded', { n: 2999 }), { exact: false }),
    ).toBeTruthy();
  });

  it('treats a short page with no paging as the whole directory, with no notice', async () => {
    installVolume({ dirs: { '': [file('a.txt')] }, noPaging: true });
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);

    await screen.findByText('a.txt');
    expect(screen.queryByText(t('en-US', 'sourceSetExplorer.moreNotLoadedUnknown'))).toBeNull();
    expect(screen.queryByText(t('en-US', 'sourceSetExplorer.moreNotLoaded', { n: 0 }))).toBeNull();
  });

  it('shows the failure instead of presenting a partial listing as whole (R13)', async () => {
    installVolume({ dirs: { '': [] }, fail: { list: 403 } });
    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);

    expect(await screen.findByText(t('en-US', 'sourceSetExplorer.errorForbidden'))).toBeTruthy();
    expect(screen.queryByText(t('en-US', 'sourceSetExplorer.emptyDir'))).toBeNull();
  });
});

describe('F-025 R12 — nothing here mentions a sandbox', () => {
  it('renders no sandbox wording and no wake control', async () => {
    installVolume(SIMPLE);
    const { container } = render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="k" />);
    await screen.findByText('a.txt');

    expect(container.textContent?.toLowerCase()).not.toContain('sandbox');
    expect(container.textContent?.toLowerCase()).not.toContain('nudge');
  });
});

describe('F-025 R3 — auth reaches the volume the way the host chose', () => {
  it('sends the api key as X-API-KEY when given one', async () => {
    const seen: HeadersInit[] = [];
    vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      seen.push(init?.headers ?? {});

      return Response.json({ data: { entries: [], paging: { index: 0, size: 1000, total: 0 } } });
    });

    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} apiKey="secret" />);
    await screen.findByText(t('en-US', 'sourceSetExplorer.emptyDir'));

    expect(seen[0]).toMatchObject({ 'X-API-KEY': 'secret' });
  });

  it('sends custom headers instead when the host relays through a BFF', async () => {
    const seen: HeadersInit[] = [];
    vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      seen.push(init?.headers ?? {});

      return Response.json({ data: { entries: [], paging: { index: 0, size: 1000, total: 0 } } });
    });

    render(<SourceSetFileExplorer sourceSetEndpoint={ENDPOINT} customHeaders={{ Authorization: 'Bearer t' }} />);
    await screen.findByText(t('en-US', 'sourceSetExplorer.emptyDir'));

    expect(seen[0]).toMatchObject({ Authorization: 'Bearer t' });
    expect(seen[0]).not.toHaveProperty('X-API-KEY');
  });
});
