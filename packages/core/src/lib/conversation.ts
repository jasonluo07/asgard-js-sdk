import { EventType } from 'src/constants/enum';
import { ConversationMessage, SseResponse } from 'src/types';

interface IConversation {
  messages: Map<string, ConversationMessage> | null;
  showDebugMessage?: boolean;
}

export default class Conversation implements IConversation {
  public showDebugMessage = false;
  public messages: Map<string, ConversationMessage> | null = null;

  constructor({ messages, showDebugMessage }: IConversation) {
    this.messages = messages;
    this.showDebugMessage = showDebugMessage ?? false;
  }

  private create(messages: IConversation['messages']): Conversation {
    return new Conversation({
      messages,
      showDebugMessage: this.showDebugMessage,
    });
  }

  pushMessage(message: ConversationMessage): Conversation {
    const messages = new Map(this.messages);
    messages.set(message.messageId, message);

    return this.create(messages);
  }

  onMessage(response: SseResponse<EventType>): Conversation {
    switch (response.eventType) {
      case EventType.MESSAGE_START:
        return this.onMessageStart(
          response as SseResponse<EventType.MESSAGE_START>
        );
      case EventType.MESSAGE_DELTA:
        return this.onMessageDelta(
          response as SseResponse<EventType.MESSAGE_DELTA>
        );
      case EventType.MESSAGE_COMPLETE:
        return this.onMessageComplete(
          response as SseResponse<EventType.MESSAGE_COMPLETE>
        );
      case EventType.ERROR:
        return this.onMessageError(response as SseResponse<EventType.ERROR>);
      default:
        return this;
    }
  }

  onMessageStart(response: SseResponse<EventType.MESSAGE_START>): Conversation {
    const message = response.fact.messageStart.message;
    const messages = new Map(this.messages);

    if (
      (message.isDebug && !this.showDebugMessage) ||
      messages?.has(message.messageId)
    ) {
      return this.create(messages);
    }

    messages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_START,
      isTyping: true,
      typingText: '',
      messageId: message.messageId,
      message,
      time: new Date(),
    });

    return this.create(messages);
  }

  onMessageDelta(response: SseResponse<EventType.MESSAGE_DELTA>): Conversation {
    const message = response.fact.messageDelta.message;

    const messages = new Map(this.messages);

    const currentMessage = messages.get(message.messageId);

    if (currentMessage?.type !== 'bot') return this;

    if (
      (message.isDebug && !this.showDebugMessage) ||
      currentMessage?.eventType === EventType.MESSAGE_COMPLETE
    ) {
      return this.create(messages);
    }

    const typingText = `${currentMessage?.typingText ?? ''}${message.text}`;

    messages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_DELTA,
      isTyping: true,
      typingText,
      messageId: message.messageId,
      message,
      time: new Date(),
    });

    return this.create(messages);
  }

  onMessageComplete(
    response: SseResponse<EventType.MESSAGE_COMPLETE>
  ): Conversation {
    const message = response.fact.messageComplete.message;

    const messages = new Map(this.messages);

    if (message.isDebug && !this.showDebugMessage) {
      return this.create(messages);
    }

    messages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_COMPLETE,
      isTyping: false,
      typingText: null,
      messageId: message.messageId,
      message,
      time: new Date(),
    });

    return this.create(messages);
  }

  onMessageError(response: SseResponse<EventType.ERROR>): Conversation {
    const messageId = crypto.randomUUID();
    const error = response.fact.runError.error;

    const messages = new Map(this.messages);

    messages.set(messageId, {
      type: 'error',
      eventType: EventType.ERROR,
      messageId,
      error,
      time: new Date(),
    });

    return this.create(messages);
  }
}
