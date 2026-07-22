import { afterEach, describe, expect, it, vi } from 'vitest';
import AsgardServiceClient from './client';
import { isHttpError } from '../types/http-error';

// F-015 — channelMetadata is the join-init existence + restore gate: GET /channel/metadata?custom_channel_id=…
// 200 → parsed metadata, 404 → null (does not exist), any other error → throw (never "not exists").

function fakeResponse(status: number, body: unknown): Response {
  const statusText = status === 404 ? 'Not Found' : status >= 500 ? 'Internal Server Error' : 'OK';

  return {
    status,
    ok: status >= 200 && status < 300,
    statusText,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function makeClient(): AsgardServiceClient {
  return new AsgardServiceClient({
    botProviderEndpoint: 'https://api.example.com/ns/x/bot-provider/y',
    apiKey: 'test-key',
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AsgardServiceClient.channelMetadata (F-015)', () => {
  it('R1/R2: 200 with a `{ data }` envelope → parsed metadata; GET with the custom_channel_id query + api key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      fakeResponse(200, {
        data: { title: '訂單查詢', runState: 'IDLE', lastActivityAt: '2026-07-15T00:00:00Z' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const meta = await makeClient().channelMetadata('ch-1');

    expect(meta).toEqual({
      title: '訂單查詢',
      runState: 'IDLE',
      lastActivityAt: '2026-07-15T00:00:00Z',
      launchedSandboxes: [],
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/ns/x/bot-provider/y/channel/metadata?custom_channel_id=ch-1');
    expect(init.method).toBe('GET');
    expect(init.headers['X-API-KEY']).toBe('test-key');
  });

  it('R2: 200 with a bare body (no envelope) → parsed; a RUNNING channel is reported as such', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { title: null, runState: 'RUNNING' })));

    const meta = await makeClient().channelMetadata('ch-2');

    expect(meta).toEqual({ title: null, runState: 'RUNNING', lastActivityAt: undefined, launchedSandboxes: [] });
  });

  it('R1: 404 → null (channel does not exist)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(404, 'channel not found')));

    expect(await makeClient().channelMetadata('missing')).toBeNull();
  });

  it('R6: a non-404 error (5xx) throws an HttpError and is never surfaced as "not exists"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, 'boom')));

    await expect(makeClient().channelMetadata('ch-3')).rejects.toSatisfy(
      (err: unknown) => isHttpError(err) && err.status === 500,
    );
  });

  it('R6: a network rejection propagates (not swallowed into null)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(makeClient().channelMetadata('ch-4')).rejects.toThrow('network down');
  });

  // F-019 / UC-032 — the metadata decode must whitelist-pass `launchedSandboxes` (mapping the five backend
  // fields) instead of silently dropping it.
  it('F-019: decodes launchedSandboxes, mapping the five backend fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse(200, {
          data: {
            title: null,
            runState: 'IDLE',
            launchedSandboxes: [
              {
                sandboxName: 'sbx-1',
                sandboxBlueprintName: 'analysis',
                workingDirectory: '/home/user/work',
                editorServerEnabled: true,
                browserEnabled: false,
              },
            ],
          },
        }),
      ),
    );

    const metadata = await makeClient().channelMetadata('ch-5');

    expect(metadata?.launchedSandboxes).toEqual([
      {
        sandboxName: 'sbx-1',
        sandboxBlueprintName: 'analysis',
        workingDirectory: '/home/user/work',
        editorServerEnabled: true,
        browserEnabled: false,
      },
    ]);
  });

  it('F-019: an absent launchedSandboxes (old backend) decodes to an empty array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { title: null, runState: 'IDLE' })));

    const metadata = await makeClient().channelMetadata('ch-6');

    expect(metadata?.launchedSandboxes).toEqual([]);
  });
});

// F-020 / UC-034 — generateSandboxBrowserOpenUrl POSTs to the sandbox browser open-url endpoint and returns
// the one-time openURL. Contract confirmed against asgard-core edgeserver GenerateSandboxBrowserOpenUrl:
// POST {botProviderEndpoint}/sandbox/{sandbox_name}/browser/open-url, path params only, { data: { openURL } }.
describe('AsgardServiceClient.generateSandboxBrowserOpenUrl (F-020)', () => {
  it('POSTs to the browser open-url endpoint and returns data.openURL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse(200, { data: { openURL: 'https://neko.example.com/t/abc' } }));
    vi.stubGlobal('fetch', fetchMock);

    const url = await makeClient().generateSandboxBrowserOpenUrl('sbx-1');

    expect(url).toBe('https://neko.example.com/t/abc');

    const [reqUrl, init] = fetchMock.mock.calls[0];
    expect(reqUrl).toBe('https://api.example.com/ns/x/bot-provider/y/sandbox/sbx-1/browser/open-url');
    expect(init.method).toBe('POST');
    expect(init.headers['X-API-KEY']).toBe('test-key');
  });

  it('accepts a bare body without the { data } envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, { openURL: 'https://neko.example.com/t/xyz' })));

    expect(await makeClient().generateSandboxBrowserOpenUrl('sbx-2')).toBe('https://neko.example.com/t/xyz');
  });

  it('url-encodes the sandbox name in the path', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse(200, { data: { openURL: 'https://neko.example.com/t/1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await makeClient().generateSandboxBrowserOpenUrl('sbx a');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.com/ns/x/bot-provider/y/sandbox/sbx%20a/browser/open-url',
    );
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, 'boom')));

    await expect(makeClient().generateSandboxBrowserOpenUrl('sbx-3')).rejects.toThrow();
  });
});

// F-021 / UC-037 — sandbox fs client methods (Cycle 1: list / read / write). Contract confirmed against
// asgard-core edgeserver: GET fs/list (JSON), GET fs/file (raw octet-stream + X-Total-Bytes/X-Truncated),
// PUT fs/file (multipart form-data → { data: { bytesWritten } }).

function blobResponse(status: number, body: BodyInit, headers: Record<string, string> = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status >= 500 ? 'Internal Server Error' : 'OK',
    headers: { get: (k: string): string | null => headers[k] ?? null },
    blob: async () => new Blob([body]),
    text: async () => String(body),
  } as unknown as Response;
}

describe('AsgardServiceClient sandbox fs (F-021)', () => {
  it('sandboxFsList: GET fs/list?path=… → decoded entries + truncated', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      fakeResponse(200, {
        data: {
          entries: [{ name: 'report.md', isDir: false, sizeBytes: 12, mtimeUnix: 1700000000, mode: 420 }],
          truncated: false,
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeClient().sandboxFsList('sbx-1', '/home/user');

    expect(result).toEqual({
      entries: [{ name: 'report.md', isDir: false, sizeBytes: 12, mtimeUnix: 1700000000, mode: 420 }],
      truncated: false,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/ns/x/bot-provider/y/sandbox/sbx-1/fs/list?path=%2Fhome%2Fuser');
    expect(init.method).toBe('GET');
    expect(init.headers['X-API-KEY']).toBe('test-key');
  });

  it('sandboxFsRead: GET fs/file → blob content + X-Total-Bytes / X-Truncated', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(blobResponse(200, 'hello', { 'X-Total-Bytes': '5', 'X-Truncated': 'false' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeClient().sandboxFsRead('sbx-1', '/home/user/report.md');

    expect(result.totalBytes).toBe(5);
    expect(result.truncated).toBe(false);
    expect(await result.content.text()).toBe('hello');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.com/ns/x/bot-provider/y/sandbox/sbx-1/fs/file?path=%2Fhome%2Fuser%2Freport.md',
    );
  });

  it('sandboxFsRead: forwards offset_bytes / limit_bytes and reads X-Truncated=true', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(blobResponse(200, 'par', { 'X-Total-Bytes': '100', 'X-Truncated': 'true' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeClient().sandboxFsRead('sbx-1', '/f.txt', { offsetBytes: 0, limitBytes: 3 });

    expect(result.truncated).toBe(true);
    expect(result.totalBytes).toBe(100);
    expect(fetchMock.mock.calls[0][0]).toContain('offset_bytes=0');
    expect(fetchMock.mock.calls[0][0]).toContain('limit_bytes=3');
  });

  it('sandboxFsWrite: PUT fs/file multipart → bytesWritten', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { data: { bytesWritten: 5 } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await makeClient().sandboxFsWrite('sbx-1', '/home/user/report.md', 'hello');

    expect(result).toEqual({ bytesWritten: 5 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api.example.com/ns/x/bot-provider/y/sandbox/sbx-1/fs/file?path=%2Fhome%2Fuser%2Freport.md',
    );
    expect(init.method).toBe('PUT');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('sandboxFsWrite: forwards mode / create_only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { data: { bytesWritten: 1 } }));
    vi.stubGlobal('fetch', fetchMock);

    await makeClient().sandboxFsWrite('sbx-1', '/f.txt', 'x', { mode: 420, createOnly: true });

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('mode=420');
    expect(url).toContain('create_only=true');
  });

  it('sandboxFsList: throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(500, 'boom')));

    await expect(makeClient().sandboxFsList('sbx-1', '/x')).rejects.toThrow();
  });
});
