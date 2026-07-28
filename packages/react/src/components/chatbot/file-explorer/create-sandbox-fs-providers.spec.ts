import { describe, expect, it, vi } from 'vitest';
import { AsgardServiceClient, HttpError } from '@asgard-js/core';
import { Observable } from 'rxjs';
import { createSandboxFsProviders } from './create-sandbox-fs-providers';

/** Minimal stub of the fs surface the providers touch. */
function makeClient(overrides: Partial<AsgardServiceClient>): AsgardServiceClient {
  return overrides as AsgardServiceClient;
}

describe('createSandboxFsProviders — sandbox lifecycle (F-021 AC5)', () => {
  it('drops a sandbox after three consecutive sandbox-level failures', async () => {
    const onSandboxUnreachable = vi.fn();
    const client = makeClient({
      sandboxFsList: vi.fn().mockRejectedValue(new HttpError(412, 'Precondition Failed')),
    });
    const { listDir } = createSandboxFsProviders(client, { onSandboxUnreachable });

    await expect(listDir('sb', '/work')).rejects.toThrow();
    await expect(listDir('sb', '/work')).rejects.toThrow();
    expect(onSandboxUnreachable).not.toHaveBeenCalled();

    await expect(listDir('sb', '/work')).rejects.toThrow();
    expect(onSandboxUnreachable).toHaveBeenCalledWith('sb');
  });

  it('counts 5xx as sandbox-level too, and counts each sandbox separately', async () => {
    const onSandboxUnreachable = vi.fn();
    const client = makeClient({
      sandboxFsList: vi.fn().mockRejectedValue(new HttpError(503, 'Service Unavailable')),
    });
    const { listDir } = createSandboxFsProviders(client, { onSandboxUnreachable });

    await expect(listDir('a', '/work')).rejects.toThrow();
    await expect(listDir('b', '/work')).rejects.toThrow();
    await expect(listDir('a', '/work')).rejects.toThrow();
    await expect(listDir('a', '/work')).rejects.toThrow();

    expect(onSandboxUnreachable).toHaveBeenCalledTimes(1);
    expect(onSandboxUnreachable).toHaveBeenCalledWith('a');
  });

  it('never drops a live sandbox for a path-level failure', async () => {
    const onSandboxUnreachable = vi.fn();
    const client = makeClient({
      sandboxFsList: vi.fn().mockRejectedValue(new HttpError(404, 'Not Found')),
    });
    const { listDir } = createSandboxFsProviders(client, { onSandboxUnreachable });

    for (let i = 0; i < 5; i++) await expect(listDir('sb', '/nope')).rejects.toThrow();

    expect(onSandboxUnreachable).not.toHaveBeenCalled();
  });

  it('resets the streak on any success, so intermittent failures never trip it', async () => {
    const onSandboxUnreachable = vi.fn();
    const sandboxFsList = vi
      .fn()
      .mockRejectedValueOnce(new HttpError(412, 'Precondition Failed'))
      .mockRejectedValueOnce(new HttpError(412, 'Precondition Failed'))
      .mockResolvedValueOnce({ entries: [], truncated: false })
      .mockRejectedValueOnce(new HttpError(412, 'Precondition Failed'))
      .mockRejectedValueOnce(new HttpError(412, 'Precondition Failed'));
    const { listDir } = createSandboxFsProviders(makeClient({ sandboxFsList }), { onSandboxUnreachable });

    await expect(listDir('sb', '/work')).rejects.toThrow();
    await expect(listDir('sb', '/work')).rejects.toThrow();
    await expect(listDir('sb', '/work')).resolves.toEqual({ entries: [], truncated: false });
    await expect(listDir('sb', '/work')).rejects.toThrow();
    await expect(listDir('sb', '/work')).rejects.toThrow();

    expect(onSandboxUnreachable).not.toHaveBeenCalled();
  });
});

describe('createSandboxFsProviders — watchFile (F-021 AC3)', () => {
  it('reports each change and unsubscribes the stream on teardown', () => {
    const unsubscribed = vi.fn();
    let emit: (() => void) | null = null;
    const client = makeClient({
      sandboxFsWatch: vi.fn().mockReturnValue(
        new Observable(subscriber => {
          emit = (): void => subscriber.next({ op: 'WRITE', path: '/work/a.ts', mtimeUnix: 1 });

          return unsubscribed;
        }),
      ),
    });
    const onChange = vi.fn();

    const stop = createSandboxFsProviders(client).watchFile('sb', '/work/a.ts', onChange);
    emit?.();
    emit?.();
    expect(onChange).toHaveBeenCalledTimes(2);

    stop();
    expect(unsubscribed).toHaveBeenCalled();
  });

  it('swallows stream errors rather than throwing into the render tree', () => {
    const client = makeClient({
      sandboxFsWatch: vi.fn().mockReturnValue(
        new Observable(subscriber => {
          subscriber.error(new HttpError(412, 'Precondition Failed'));
        }),
      ),
    });

    expect(() => createSandboxFsProviders(client).watchFile('sb', '/work/a.ts', vi.fn())).not.toThrow();
  });
});
