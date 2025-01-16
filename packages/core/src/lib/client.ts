import EventEmitter from 'events';
import { EventType, FetchSSEAction } from 'src/constants/enum';
import {
  ClientConfig,
  SendMessagePayload,
  SetChannelPayload,
  SSEResponse,
} from 'src/types';
import { createSSEObservable } from './create-sse-observable';
import { concatMap, delay, of, Subject, Subscription, takeUntil } from 'rxjs';

export default class AsgardServiceClient {
  baseUrl: string;
  namespace: string;
  botProviderName: string;
  endpoint: string;
  private webhookToken: string;
  private eventEmitter: EventEmitter;
  private destroy$ = new Subject<void>();

  constructor(config: ClientConfig) {
    if (!config.baseUrl) {
      throw new Error('baseUrl must be required');
    }

    if (!config.namespace) {
      throw new Error('namespace must be required');
    }

    if (!config.botProviderName) {
      throw new Error('botProviderName must be required');
    }

    if (!config.webhookToken) {
      throw new Error('webhookToken must be required');
    }

    this.baseUrl = config.baseUrl;
    this.namespace = config.namespace;
    this.botProviderName = config.botProviderName;
    this.webhookToken = config.webhookToken;
    this.endpoint = `${this.baseUrl}/generic/ns/${this.namespace}/bot-provider/${this.botProviderName}/message/sse`;
    this.eventEmitter = new EventEmitter();
  }

  on<Action extends FetchSSEAction, Event extends EventType>(
    action: Action,
    event: Event,
    listener: (data: SSEResponse<Event>) => void
  ): void {
    const eventKey = `${action}:${event}`;

    if (this.eventEmitter.listeners(eventKey).length > 0) {
      this.eventEmitter.removeAllListeners(eventKey);
    }

    this.eventEmitter.on(eventKey, listener);
  }

  setChannel(payload: SetChannelPayload): Subscription {
    return createSSEObservable({
      endpoint: this.endpoint,
      webhookToken: this.webhookToken,
      payload: Object.assign({ action: FetchSSEAction.RESET_CHANNEL }, payload),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (esm) => {
          this.eventEmitter.emit(
            `${FetchSSEAction.RESET_CHANNEL}:${esm.event}`,
            esm.data
          );
        },
        error: (err) => {
          console.error(err);
        },
        complete: () => {
          console.log('SSE connection closed.');
        },
      });
  }

  sendMessage(payload: SendMessagePayload, delayTime?: number): Subscription {
    return createSSEObservable({
      endpoint: this.endpoint,
      webhookToken: this.webhookToken,
      payload: Object.assign({ action: FetchSSEAction.NONE }, payload),
    })
      .pipe(concatMap((event) => of(event).pipe(delay(delayTime ?? 50))))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (esm) => {
          this.eventEmitter.emit(
            `${FetchSSEAction.NONE}:${esm.event}`,
            esm.data
          );
        },
        error: (err) => {
          console.error(err);
        },
        complete: () => {
          console.log('SSE connection closed.');
        },
      });
  }

  close(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
