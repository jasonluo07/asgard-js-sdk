import { EventType } from 'src/constants/enum';
import { ConversationMessage, SseResponse } from 'src/types';

interface IConversation {
  messages: Map<string, ConversationMessage> | null;
}

export default class Conversation implements IConversation {
  public messages: Map<string, ConversationMessage> | null = null;

  constructor({ messages }: IConversation) {
    this.messages = messages;
  }

  pushMessage(message: ConversationMessage): Conversation {
    const messages = new Map(this.messages);
    messages.set(message.messageId, message);

    return new Conversation({ messages });
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

    messages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_START,
      isTyping: true,
      typingText: '',
      messageId: message.messageId,
      message,
      time: new Date(),
    });

    return new Conversation({ messages });
  }

  onMessageDelta(response: SseResponse<EventType.MESSAGE_DELTA>): Conversation {
    const message = response.fact.messageDelta.message;

    const messages = new Map(this.messages);

    const currentMessage = messages.get(message.messageId);

    if (currentMessage?.type !== 'bot') return this;

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

    return new Conversation({ messages });
  }

  onMessageComplete(
    response: SseResponse<EventType.MESSAGE_COMPLETE>
  ): Conversation {
    const message = response.fact.messageComplete.message;

    const messages = new Map(this.messages);

    messages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_COMPLETE,
      isTyping: false,
      typingText: null,
      messageId: message.messageId,
      message,
      time: new Date(),
    });

    return new Conversation({ messages });
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

    return new Conversation({ messages });
  }
}
