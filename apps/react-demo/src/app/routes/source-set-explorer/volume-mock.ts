// An in-memory SourceSet volume, served by intercepting `fetch` for one sentinel origin.
//
// TASK-004 wants the demo to exercise every action end to end, and a real dev volume needs an endpoint
// and a key that not everyone running this demo has. This stands in for one: it speaks the same wire
// contract the edge server does, including the parts that are easy to get wrong and hard to reproduce on
// demand — real pagination, `create_only` answering 409, and a directory whose `total` exceeds what the
// backend will actually serve.
//
// It only claims URLs under MOCK_ENDPOINT; anything else falls through to the real `fetch`, so pointing
// the route at a live volume through `VITE_SOURCE_SET_ENDPOINT` bypasses all of this.

export const MOCK_ENDPOINT = 'https://source-set-mock.invalid/v1/source-set/demo/volume';

/**
 * Round-trip latency the mock adds to every response.
 *
 * Not padding: F-026 requires a directory node to show that it is loading while its walk pages, and an
 * instantaneous mock makes that state unobservable — the very acceptance criterion this route exists to
 * demonstrate would be untestable by hand. Real volumes are slower than this.
 */
const MOCK_LATENCY_MS = 120;

/** Value is the file's text; `null` marks a directory. */
type Node = string | null;

const SAMPLE_MARKDOWN = `# Release notes

A **markdown** file, so the viewer's rendered ↔ source toggle has something to switch between.

- lists render
- \`inline code\` renders
- and the source view is syntax highlighted

> Switch to source with the toolbar button on the right.
`;

const SAMPLE_TS = `export function greet(name: string): string {
  return \`Hello, \${name}\`;
}
`;

// A 1×1 transparent PNG — enough for the viewer's image branch.
const SAMPLE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function seed(): Map<string, Node> {
  const fs = new Map<string, Node>();

  fs.set('README.md', SAMPLE_MARKDOWN);
  fs.set('greet.ts', SAMPLE_TS);
  fs.set('logo.png', SAMPLE_PNG);

  fs.set('notes', null);
  fs.set('notes/todo.md', '# Todo\n\n- [ ] try renaming this file\n- [ ] try cut and paste into another folder\n');
  fs.set('notes/ideas.txt', 'plain text, opens in the highlighted read-only view\n');

  fs.set('empty', null);

  // 1,200 entries: more than one page at the server maximum of 1000, so expanding this walks two pages
  // and still ends up complete. This is the case that should NOT produce a shortfall notice.
  fs.set('paged', null);
  for (let i = 0; i < 1200; i++) {
    fs.set(`paged/file-${String(i).padStart(4, '0')}.txt`, `entry ${i}\n`);
  }

  // Same 1,200 entries, but the listing claims 12,000 (see `CLAIMED_TOTAL`). The walk runs out of pages
  // before reaching that total, which is exactly when F-026 requires the tree to say how many are missing
  // instead of showing 1,200 as though it were the whole directory.
  fs.set('overclaimed', null);
  for (let i = 0; i < 1200; i++) {
    fs.set(`overclaimed/item-${String(i).padStart(4, '0')}.txt`, `item ${i}\n`);
  }

  return fs;
}

/** Directories whose listing reports a bigger total than the mock will actually serve. */
const CLAIMED_TOTAL: Record<string, number> = { overclaimed: 12_000 };

function parentOf(path: string): string {
  const i = path.lastIndexOf('/');

  return i > 0 ? path.slice(0, i) : '';
}

function nameOf(path: string): string {
  const i = path.lastIndexOf('/');

  return i >= 0 ? path.slice(i + 1) : path;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function error(status: number, message: string): Response {
  return json({ message }, status);
}

/**
 * Install the mock. Returns a teardown that restores the previous `fetch`, so a route can install it in
 * an effect without leaking the patch into the rest of the demo.
 */
export function installMockVolume(): () => void {
  const fs = seed();
  const original = window.fetch.bind(window);

  const handler = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!raw.startsWith(MOCK_ENDPOINT)) return original(input, init);

    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));

    const url = new URL(raw);
    const op = url.pathname.split('/').pop() ?? '';
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = url.searchParams.get('path') ?? '';

    if (op === 'list') {
      if (path !== '' && fs.get(path) !== null) return error(404, 'no such directory');

      const all = [...fs.keys()]
        .filter(key => parentOf(key) === path && key !== path)
        .map(key => ({
          name: nameOf(key),
          isDir: fs.get(key) === null,
          sizeBytes: fs.get(key)?.length ?? 0,
          mtimeUnix: 0,
          mode: 420,
        }));

      const size = Math.min(Number(url.searchParams.get('page_size') ?? '1000'), 1000);
      const page = Number(url.searchParams.get('page') ?? '0');

      return json({
        data: {
          entries: all.slice(page * size, page * size + size),
          paging: { index: page, size, total: CLAIMED_TOTAL[path] ?? all.length },
        },
      });
    }

    if (op === 'stat') {
      const node = fs.get(path);

      return json({
        data: { exists: fs.has(path), isDir: node === null, sizeBytes: node?.length ?? 0, mtimeUnix: 0, mode: 420 },
      });
    }

    if (op === 'file' && method === 'GET') {
      const node = fs.get(path);
      if (node == null) return error(404, 'no such file');

      // Images are stored as data URLs; hand back the bytes so the client's blob read behaves normally.
      if (node.startsWith('data:')) {
        const binary = atob(node.slice(node.indexOf(',') + 1));
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

        return new Response(bytes, { headers: { 'X-Total-Bytes': String(bytes.length) } });
      }

      return new Response(node, { headers: { 'X-Total-Bytes': String(node.length) } });
    }

    if (op === 'file' && method === 'PUT') {
      if (url.searchParams.get('create_only') === 'true' && fs.has(path)) {
        return error(409, 'already exists');
      }

      const form = init?.body instanceof FormData ? init.body : null;
      const picked = form?.get('file');
      const text = picked instanceof Blob ? await picked.text() : '';
      fs.set(path, text);

      return json({ data: { bytesWritten: text.length } });
    }

    if (op === 'mkdir') {
      if (fs.has(path)) return error(409, 'already exists');

      fs.set(path, null);

      return json({ data: {} });
    }

    if (op === 'item' && method === 'DELETE') {
      if (!fs.has(path)) return error(404, 'no such item');

      const hasChildren = [...fs.keys()].some(key => key.startsWith(`${path}/`));
      if (fs.get(path) === null && hasChildren) return error(409, 'directory not empty');

      fs.delete(path);

      return json({ data: {} });
    }

    if (op === 'all' && method === 'DELETE') {
      [...fs.keys()].filter(key => key === path || key.startsWith(`${path}/`)).forEach(key => fs.delete(key));

      return json({ data: {} });
    }

    if (op === 'copy' || op === 'move') {
      const src = url.searchParams.get('src') ?? '';
      const dst = url.searchParams.get('dst') ?? '';
      if (!fs.has(src)) return error(404, 'no such source');

      if (fs.has(dst) && url.searchParams.get('overwrite') !== 'true') return error(409, 'destination occupied');

      const moving = [...fs.entries()].filter(([key]) => key === src || key.startsWith(`${src}/`));
      moving.forEach(([key, value]) => fs.set(dst + key.slice(src.length), value));
      if (op === 'move') moving.forEach(([key]) => fs.delete(key));

      return json({ data: { bytesCopied: 0 } });
    }

    return error(400, `unsupported op: ${op}`);
  };

  window.fetch = handler as typeof window.fetch;

  return (): void => {
    window.fetch = original;
  };
}
