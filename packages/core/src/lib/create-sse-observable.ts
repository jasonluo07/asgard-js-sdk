import { Observable } from 'rxjs';
import { EventSourceMessage, fetchEventSource } from '@microsoft/fetch-event-source';
import { FetchSsePayload, SseResponse } from '../types';
import { HttpError } from '../types/http-error';
import { EventType } from '../constants/enum';

interface CreateSseObservableOptions {
  endpoint: string;
  apiKey?: string;
  debugMode?: boolean;
  payload: FetchSsePayload;
  customHeaders?: Record<string, string>;
}

export function createSseObservable(options: CreateSseObservableOptions): Observable<SseResponse<EventType>> {
  const { endpoint, apiKey, payload, debugMode, customHeaders } = options;

  return new Observable<SseResponse<EventType>>(subscriber => {
    const controller = new AbortController();
    let currentTraceId: string | undefined;
    // Whether a resumable cursor exists — set once any event carries an `id:`. `@microsoft/fetch-event-source`
    // tracks that `id:` and replays it as the `Last-Event-ID` header on its native reconnect (F-002).
    let hasCursor = false;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }

    const searchParams = new URLSearchParams();

    if (debugMode) {
      searchParams.set('is_debug', 'true');
    }

    const url = new URL(endpoint);

    if (searchParams.toString()) {
      url.search = searchParams.toString();
    }

    fetchEventSource(url.toString(), {
      method: 'POST',
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
      /**
       * Allow SSE to work when the page is hidden.
       * https://github.com/Azure/fetch-event-source/issues/17#issuecomment-1525904929
       */
      openWhenHidden: true,
      onopen: async response => {
        if (!response.ok) {
          let body: unknown;
          try {
            body = await response.json();
          } catch {
            try {
              body = await response.text();
            } catch {
              body = null;
            }
          }

          subscriber.error(new HttpError(response.status, response.statusText, body));
          controller.abort();
        } else {
          currentTraceId = response.headers.get('X-Trace-Id') ?? undefined;
        }
      },
      onmessage: (esm: EventSourceMessage) => {
        // A non-empty `id:` is the resume cursor; from here a mid-stream drop can be resumed (F-002).
        if (esm.id) hasCursor = true;

        const data = JSON.parse(esm.data) as SseResponse<EventType>;

        if (currentTraceId) {
          data.traceId = currentTraceId;
        } else if (data.requestId) {
          data.traceId = data.requestId;
          if (!currentTraceId) {
            currentTraceId = data.requestId;
          }
        }

        subscriber.next(data);
      },
      onclose: () => {
        subscriber.complete();
      },
      onerror: err => {
        // A cursor exists → let @microsoft/fetch-event-source run its native Last-Event-ID reconnect:
        // returning without throwing tells the library to retry (obeying the server `retry:`), and it
        // replays the last `id:` as `Last-Event-ID`, so the backend resumes from the cursor with no
        // re-dispatch (F-002 / UC-003).
        if (hasCursor) return;

        // No cursor yet (failure before 200, or no `id:` received) → do NOT reconnect: an empty-cursor
        // POST would be re-dispatched as a new run. Surface the error to the caller instead (F-002 / UC-004).
        subscriber.error(err);
        controller.abort();
        throw err;
      },
    });

    return (): void => {
      controller.abort();
    };
  });
}
