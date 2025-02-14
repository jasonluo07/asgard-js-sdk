import {
  ClientConfig,
  IAsgardServiceClient,
  FetchSsePayload,
  FetchSseOptions,
} from 'src/types';
import { createSseObservable } from './create-sse-observable';
import { concatMap, delay, of, retry, Subject, takeUntil } from 'rxjs';

export default class AsgardServiceClient implements IAsgardServiceClient {
  private apiKey: string;
  private endpoint: string;
  private destroy$ = new Subject<void>();
  private transformSsePayload?: (payload: FetchSsePayload) => FetchSsePayload;

  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey must be required');
    }

    if (!config.endpoint) {
      throw new Error('endpoint must be required');
    }

    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.transformSsePayload = config.transformSsePayload;
  }

  fetchSse(payload: FetchSsePayload, options?: FetchSseOptions): void {
    options?.onSseStart?.();

    createSseObservable({
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      payload: this.transformSsePayload?.(payload) ?? payload,
    })
      .pipe(
        concatMap((event) => of(event).pipe(delay(options?.delayTime ?? 50))),
        takeUntil(this.destroy$),
        retry(3)
      )
      .subscribe({
        next: (response) => {
          options?.onSseMessage?.(response);
        },
        error: (error) => {
          options?.onSseError?.(error);
        },
        complete: () => {
          options?.onSseCompleted?.();
        },
      });
  }

  close(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
