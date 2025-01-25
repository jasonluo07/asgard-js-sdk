import { Observable } from 'rxjs';
import {
  EventSourceMessage,
  fetchEventSource,
} from '@microsoft/fetch-event-source';
import { FetchSsePayload, SseResponse } from 'src/types';
import { EventType } from 'src/constants/enum';

interface CreateSseObservableOptions {
  endpoint: string;
  apiKey: string;
  payload: FetchSsePayload;
}

export function createSseObservable(
  options: CreateSseObservableOptions
): Observable<SseResponse<EventType>> {
  const { endpoint, apiKey, payload } = options;

  return new Observable<SseResponse<EventType>>((subscriber) => {
    const controller = new AbortController();

    fetchEventSource(endpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
      onopen: async (response) => {
        if (!response.ok) {
          subscriber.error(response);
          controller.abort();
        }
      },
      onmessage: (esm: EventSourceMessage) => {
        subscriber.next(JSON.parse(esm.data));
      },
      onclose: () => {
        subscriber.complete();
      },
      onerror: (err) => {
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
