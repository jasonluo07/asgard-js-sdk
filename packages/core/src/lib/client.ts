import EventEmitter from 'events';
import { EventType, FetchSSEAction } from './enum';
import {
  ClientConfig,
  FetchSSEPayload,
  SendMessagePayload,
  SetChannelPayload,
  SSEResponse,
} from './types';
import {
  EventSourceMessage,
  fetchEventSource,
} from '@microsoft/fetch-event-source';

export default class AsgardServiceClient {
  baseUrl: string;
  namespace: string;
  botProviderName: string;
  endpoint: string;
  private webhookToken: string;
  private eventEmitter: EventEmitter;
  private controller: AbortController | null = null;
  channelId: string | null = null;

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

  async fetchSSE(payload: FetchSSEPayload) {
    try {
      this.controller = this.controller || new AbortController();

      await fetchEventSource(this.endpoint, {
        method: 'POST',
        headers: {
          'X-Asgard-Webhook-Token': this.webhookToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: this.controller.signal,
        onmessage: (ev: EventSourceMessage) => {
          this.eventEmitter.emit(ev.event, JSON.parse(ev.data));
        },
        onerror: (err) => {
          console.error(err);
        },
      });
    } catch (error) {
      console.error(error);
    }
  }

  async setChannel(payload: SetChannelPayload) {
    if (this.channelId) {
      this.close();
    }

    this.channelId = payload.customChannelId;
    await this.fetchSSE(
      Object.assign({ action: FetchSSEAction.RESET_CHANNEL }, payload)
    );
  }

  async sendMessage(payload: SendMessagePayload) {
    await this.fetchSSE(
      Object.assign({ action: FetchSSEAction.NONE }, payload)
    );
  }

  close() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
      this.channelId = null;
    }
  }
}
