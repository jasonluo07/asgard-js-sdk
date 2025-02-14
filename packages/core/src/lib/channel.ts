import {
  ChannelConfig,
  ChannelStates,
  IAsgardServiceClient,
  ObserverOrNext,
  SendMessageOptions,
  SendMessagePayload,
} from 'src/types';
import Conversation from './conversation';
import { BehaviorSubject, combineLatest, map, Subscription } from 'rxjs';

export default class Channel {
  private client: IAsgardServiceClient;
  private isConnecting$: BehaviorSubject<boolean>;
  private conversation$: BehaviorSubject<Conversation>;
  private statesSubscription?: Subscription;

  public customChannelId: string;
  public customMessageId?: string;

  constructor(config: ChannelConfig) {
    if (!config.client) {
      throw new Error('client must be required');
    }

    if (!config.customChannelId) {
      throw new Error('customChannelId must be required');
    }

    this.client = config.client;
    this.customChannelId = config.customChannelId;
    this.customMessageId = config.customMessageId;

    this.isConnecting$ = new BehaviorSubject(false);
    this.conversation$ = new BehaviorSubject(config.conversation);

    if (config.statesObserver) {
      this.statesSubscription = this.subscribe(config.statesObserver);
    }
  }

  private subscribe(observer: ObserverOrNext<ChannelStates>): Subscription {
    return combineLatest([this.isConnecting$, this.conversation$])
      .pipe(
        map(([isConnecting, conversation]) => ({
          isConnecting,
          conversation,
        }))
      )
      .subscribe(observer);
  }

  sendMessage(
    payload: Omit<SendMessagePayload, 'customChannelId'>,
    options?: SendMessageOptions
  ): void {
    this.isConnecting$.next(true);

    const text = payload.text.trim();
    const messageId = payload.customMessageId ?? crypto.randomUUID();

    this.conversation$.next(
      this.conversation$.value.pushMessage({
        type: 'user',
        messageId,
        text,
        time: new Date(),
      })
    );

    this.client.sendMessage(
      {
        customChannelId: this.customChannelId,
        customMessageId: messageId,
        text,
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
    this.statesSubscription?.unsubscribe();
  }
}
