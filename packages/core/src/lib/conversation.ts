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

  resetConversation(): Conversation {
    return new Conversation({ messages: null });
  }

  pushMessage(prev: Conversation, message: ConversationMessage): Conversation {
    const messages = new Map(prev.messages);
    messages.set(message.messageId, message);

    return new Conversation({ messages });
  }

  onMessage(
    prev: Conversation,
    response: SseResponse<EventType>,
    options?: { showDebugMessage?: boolean }
  ): Conversation {
    const showDebugMessage = options?.showDebugMessage ?? false;

    switch (response.eventType) {
      case EventType.MESSAGE_START:
        return prev.onMessageStart(
          prev,
          response as SseResponse<EventType.MESSAGE_START>,
          { showDebugMessage }
        );
      case EventType.MESSAGE_DELTA:
        return prev.onMessageDelta(
          prev,
          response as SseResponse<EventType.MESSAGE_DELTA>,
          { showDebugMessage }
        );
      case EventType.MESSAGE_COMPLETE:
        return prev.onMessageComplete(
          prev,
          response as SseResponse<EventType.MESSAGE_COMPLETE>,
          { showDebugMessage }
        );
      default:
        return prev;
    }
  }

  onMessageStart(
    prev: Conversation,
    response: SseResponse<EventType.MESSAGE_START>,
    options: { showDebugMessage: boolean }
  ): Conversation {
    const message = response.fact.messageStart.message;
    const messages = new Map(prev.messages);

    if (
      (message.isDebug && !options.showDebugMessage) ||
      messages?.has(message.messageId)
    ) {
      return new Conversation({ messages });
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

    return new Conversation({ messages });
  }

  onMessageDelta(
    prev: Conversation,
    response: SseResponse<EventType.MESSAGE_DELTA>,
    options: { showDebugMessage: boolean }
  ): Conversation {
    const message = response.fact.messageDelta.message;

    const messages = new Map(prev.messages);

    const currentMessage = messages.get(message.messageId);

    if (currentMessage?.type === 'user') return prev;

    if (
      (message.isDebug && !options.showDebugMessage) ||
      currentMessage?.eventType === EventType.MESSAGE_COMPLETE
    ) {
      return new Conversation({ messages });
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

    return new Conversation({ messages });
  }

  onMessageComplete(
    prev: Conversation,
    response: SseResponse<EventType.MESSAGE_COMPLETE>,
    options: { showDebugMessage: boolean }
  ): Conversation {
    const message = response.fact.messageComplete.message;

    const messages = new Map(prev.messages);

    if (message.isDebug && !options.showDebugMessage) {
      return new Conversation({ messages });
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

    return new Conversation({ messages });
  }
}
