import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { createSseObservable } from './create-sse-observable';

// F-023 AC10 — a deliberate abort (unmount, channel switch, the legacy stop fallback) is not a
// transport failure. It must not reach the subscriber as an error and must not trigger the
// Last-Event-ID reconnect, or letting go of a channel would quietly resurrect its connection.
//
// The spec asserts this against *our* code rather than trusting the transport library's internal
// `signal.aborted` guard: the callbacks handed to `fetchEventSource` are captured and driven directly,
// which is exactly the situation where an implicit guard would not save us.

vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn(),
  EventStreamContentType: 'text/event-stream',
}));

type Handlers = {
  onmessage: (event: { id?: string; data: string }) => void;
  onclose: () => void;
  onerror: (err: unknown) => number | void;
};

const mockedFetchEventSource = vi.mocked(fetchEventSource);

function capture(): Handlers {
  const call = mockedFetchEventSource.mock.calls[0];

  return call[1] as unknown as Handlers;
}

describe('createSseObservable — deliberate abort vs. transport failure (F-023 AC10)', () => {
  beforeEach(() => {
    mockedFetchEventSource.mockReset();
    mockedFetchEventSource.mockReturnValue(Promise.resolve());
  });

  it('does not reconnect after the consumer unsubscribes, even mid-stream with a cursor', () => {
    const error = vi.fn();
    const subscription = createSseObservable({ endpoint: 'https://example.test/message/sse' }).subscribe({ error });

    const handlers = capture();
    // A cursor exists, which is normally the signal to let the library reconnect (F-002).
    handlers.onmessage({ id: 'evt-1', data: '{"eventType":"asgard.message.delta"}' });

    subscription.unsubscribe();

    // Throwing is what stops @microsoft/fetch-event-source for good; returning would schedule a retry.
    expect(() => handlers.onerror(new DOMException('Aborted', 'AbortError'))).toThrow();
    expect(error).not.toHaveBeenCalled();
  });

  it('still reconnects on a genuine mid-stream failure while the consumer is listening', () => {
    const error = vi.fn();
    createSseObservable({ endpoint: 'https://example.test/message/sse' }).subscribe({ error });

    const handlers = capture();
    handlers.onmessage({ id: 'evt-1', data: '{"eventType":"asgard.message.delta"}' });

    // Returning without throwing is the library's "please retry with Last-Event-ID" contract (F-002).
    expect(() => handlers.onerror(new Error('network blip'))).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  });

  it('still surfaces a failure that happened before any cursor arrived', () => {
    const error = vi.fn();
    createSseObservable({ endpoint: 'https://example.test/message/sse' }).subscribe({ error });

    const handlers = capture();

    expect(() => handlers.onerror(new Error('connect refused'))).toThrow();
    expect(error).toHaveBeenCalledTimes(1);
  });
});
