import {
  IAsgardServiceClient,
  SendMessageOptions,
  SendMessagePayload,
} from 'src/types';
import Conversation from './conversation';
import { BehaviorSubject } from 'rxjs';

interface ChannelConfig {
  client: IAsgardServiceClient;
  isOpen?: boolean;
  customChannelId: string;
  conversation: Conversation;
}

export default class Channel {
  private client: IAsgardServiceClient;

  public isConnecting$: BehaviorSubject<boolean>;
  public conversation$: BehaviorSubject<Conversation>;
  public customChannelId: string;

  constructor(config: ChannelConfig) {
    if (!config.client) {
      throw new Error('client must be required');
    }

    if (!config.customChannelId) {
      throw new Error('customChannelId must be required');
    }

    this.client = config.client;
    this.customChannelId = config.customChannelId;

    this.isConnecting$ = new BehaviorSubject(false);
    this.conversation$ = new BehaviorSubject(config.conversation);
  }

  sendMessage(
    payload: Omit<SendMessagePayload, 'customChannelId'>,
    options?: SendMessageOptions
  ): void {
    this.isConnecting$.next(true);

    const messageId = payload.customMessageId ?? crypto.randomUUID();

    this.conversation$.next(
      this.conversation$.value.pushMessage({
        type: 'user',
        messageId,
        text: payload.text,
        time: new Date(),
      })
    );

    this.client.sendMessage(
      {
        customChannelId: this.customChannelId,
        customMessageId: messageId,
        text: payload.text,
      },
      {
        onSseStart: options?.onSseStart,
        onSseMessage: (response) => {
          options?.onSseMessage?.(response);
          this.conversation$.next(this.conversation$.value.onMessage(response));
        },
        onSseError: (err) => {
          options?.onSseError?.(err);
          this.isConnecting$.next(false);
        },
        onSseCompleted: () => {
          options?.onSseCompleted?.();
          this.isConnecting$.next(false);
        },
      }
    );
  }

  close(): void {
    this.isConnecting$.complete();
    this.conversation$.complete();
  }
}
