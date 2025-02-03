import { FetchSseAction } from 'src/constants/enum';
import {
  ClientConfig,
  SendMessageOptions,
  SendMessagePayload,
  SetChannelOptions,
  SetChannelPayload,
} from 'src/types';
import { createSseObservable } from './create-sse-observable';
import { concatMap, delay, of, retry, Subject, takeUntil } from 'rxjs';

export default class AsgardServiceClient {
  private apiKey: string;
  private endpoint: string;
  private destroy$ = new Subject<void>();

  constructor(config: ClientConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey must be required');
    }

    if (!config.endpoint) {
      throw new Error('endpoint must be required');
    }

    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
  }

  setChannel(payload: SetChannelPayload, options?: SetChannelOptions): void {
    options?.onSseStart?.();

    createSseObservable({
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      payload: {
        action: FetchSseAction.RESET_CHANNEL,
        customChannelId: payload.customChannelId,
        customMessageId: payload?.customMessageId,
        text: '',
      },
    })
      .pipe(takeUntil(this.destroy$), retry(3))
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

  sendMessage(payload: SendMessagePayload, options?: SendMessageOptions): void {
    options?.onSseStart?.();

    createSseObservable({
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      payload: {
        action: FetchSseAction.NONE,
        customChannelId: payload.customChannelId,
        customMessageId: payload?.customMessageId,
        text: payload.text,
      },
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
