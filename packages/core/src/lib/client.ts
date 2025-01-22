import EventEmitter from 'events';
import { EventType, FetchSseAction } from 'src/constants/enum';
import {
  ClientConfig,
  SendMessageOptions,
  SendMessagePayload,
  SetChannelOptions,
  SetChannelPayload,
  SseResponse,
} from 'src/types';
import { createSseObservable } from './create-sse-observable';
import {
  concatMap,
  delay,
  finalize,
  of,
  Subject,
  Subscription,
  takeUntil,
} from 'rxjs';

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

  on<Action extends FetchSseAction, Event extends EventType>(
    action: Action,
    event: Event,
    listener: (data: SseResponse<Event>) => void
  ): void {
    const eventKey = `${action}:${event}`;

    if (this.eventEmitter.listeners(eventKey).length > 0) {
      this.eventEmitter.removeAllListeners(eventKey);
    }

    this.eventEmitter.on(eventKey, listener);
  }

  setChannel(
    payload: SetChannelPayload,
    options?: SetChannelOptions
  ): Subscription {
    options?.onStart?.();

    return createSseObservable({
      endpoint: this.endpoint,
      webhookToken: this.webhookToken,
      payload: Object.assign({ action: FetchSseAction.RESET_CHANNEL }, payload),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => options?.onCompleted?.())
      )
      .subscribe({
        next: (esm) => {
          this.eventEmitter.emit(
            `${FetchSseAction.RESET_CHANNEL}:${esm.event}`,
            JSON.parse(esm.data)
          );
        },
      });
  }

  sendMessage(
    payload: SendMessagePayload,
    options?: SendMessageOptions
  ): Subscription {
    options?.onStart?.();

    return createSseObservable({
      endpoint: this.endpoint,
      webhookToken: this.webhookToken,
      payload: Object.assign({ action: FetchSseAction.NONE }, payload),
    })
      .pipe(
        concatMap((event) => of(event).pipe(delay(options?.delayTime ?? 50))),
        takeUntil(this.destroy$),
        finalize(() => options?.onCompleted?.())
      )
      .subscribe({
        next: (esm) => {
          this.eventEmitter.emit(
            `${FetchSseAction.NONE}:${esm.event}`,
            JSON.parse(esm.data)
          );
        },
      });
  }

  close(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
