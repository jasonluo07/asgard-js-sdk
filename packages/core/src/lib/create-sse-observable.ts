import { Observable } from 'rxjs';
import {
  EventSourceMessage,
  fetchEventSource,
} from '@microsoft/fetch-event-source';
import { FetchSSEPayload } from 'src/types';

interface CreateSSEObservableOptions {
  endpoint: string;
  webhookToken: string;
  payload: FetchSSEPayload;
}

export function createSSEObservable(
  options: CreateSSEObservableOptions
): Observable<EventSourceMessage> {
  const { endpoint, webhookToken, payload } = options;

  return new Observable<EventSourceMessage>((subscriber) => {
    const controller = new AbortController();

    fetchEventSource(endpoint, {
      method: 'POST',
      headers: {
        'X-Asgard-Webhook-Token': webhookToken,
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
        subscriber.next(esm);
      },
      onclose: () => {
        subscriber.complete();
      },
      onerror: (err) => {
        subscriber.error(err);
        controller.abort();
      },
    });

    return (): void => {
      controller.abort();
    };
  });
}
