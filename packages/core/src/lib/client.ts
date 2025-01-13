import EventEmitter from 'events';
import {
  ClientConfig,
  EventType,
  FetchSSEPayload,
  MessageSSEResponse,
} from './types';
import {
  EventSourceMessage,
  fetchEventSource,
} from '@microsoft/fetch-event-source';

export default class SSEClient {
  baseUrl: string;
  namespace: string;
  botProviderName: string;
  endpoint: string;
  private webhookToken: string;
  private eventEmitter: EventEmitter;
  private controller: AbortController | null;

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
    this.controller = null;
  }

  on<Event extends EventType>(
    event: Event,
    listener: (data: MessageSSEResponse<Event>) => void
  ) {
    this.eventEmitter.on(event as string, listener);
  }

  async fetchSSE(payload: FetchSSEPayload) {
    this.controller = new AbortController();
    await fetchEventSource(this.endpoint, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
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
  }

  async resetChannel() {
    await this.fetchSSE({
      customChannelId: 'ch-2468',
      customMessageId: '',
      text: '',
      action: 'RESET_CHANNEL',
    });
  }

  async sendMessage(payload: FetchSSEPayload) {
    console.log('send message: ', payload.text);
    await this.fetchSSE(payload);
  }

  close() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}
