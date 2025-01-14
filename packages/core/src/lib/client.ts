import EventEmitter from 'events';
import { EventType, FetchSSEAction } from './enum';
import {
  ClientConfig,
  SendMessagePayload,
  SetChannelPayload,
  SSEResponse,
} from './types';
import { createSSEObservable } from './create-sse-observable';
import { concatMap, delay, of } from 'rxjs';

export default class AsgardServiceClient {
  baseUrl: string;
  namespace: string;
  botProviderName: string;
  endpoint: string;
  private webhookToken: string;
  private eventEmitter: EventEmitter;

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

  on<Event extends EventType>(
    event: Event,
    listener: (data: SSEResponse<Event>) => void
  ) {
    this.eventEmitter.on(event as EventType, listener);
  }

  setChannel(payload: SetChannelPayload) {
    return createSSEObservable({
      endpoint: this.endpoint,
      webhookToken: this.webhookToken,
      payload: Object.assign({ action: FetchSSEAction.RESET_CHANNEL }, payload),
    });
  }

  sendMessage(payload: SendMessagePayload, delayTime?: number) {
    return createSSEObservable({
      endpoint: this.endpoint,
      webhookToken: this.webhookToken,
      payload: Object.assign({ action: FetchSSEAction.NONE }, payload),
    })
      .pipe(concatMap((event) => of(event).pipe(delay(delayTime ?? 50))))
      .subscribe({
        next: (esm) => {
          this.eventEmitter.emit(esm.event, esm.data);
        },
        error: (err) => {
          console.error(err);
        },
        complete: () => {
          console.log('SSE channel closed.');
        },
      });
  }
}
