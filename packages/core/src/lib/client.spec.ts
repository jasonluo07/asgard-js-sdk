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
