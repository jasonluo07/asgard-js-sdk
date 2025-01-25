import { EventType } from 'src/constants/enum';
import {
  ConversationBotMessage,
  ConversationMessage,
  SseResponse,
} from 'src/types';

interface IConversation {
  messages: Map<string, ConversationMessage> | null;
  typingMessages: Map<string, ConversationBotMessage> | null;
}

export default class Conversation implements IConversation {
  public messages: Map<string, ConversationMessage> | null;
  public typingMessages: Map<string, ConversationBotMessage> | null = null;

  constructor({ messages, typingMessages }: IConversation) {
    this.messages = messages;
    this.typingMessages = typingMessages;
  }

  resetConversation(): Conversation {
    return new Conversation({
      messages: null,
      typingMessages: null,
    });
  }

  pushMessage(prev: Conversation, message: ConversationMessage): Conversation {
    const messages = new Map(prev.messages);
    messages.set(message.messageId, message);

    return new Conversation({
      messages,
      typingMessages: prev.typingMessages,
    });
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
      case EventType.DONE:
        return prev.onMessageDone(prev);
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
    const typingMessages = new Map(prev.typingMessages);

    if (
      (message.isDebug && !options.showDebugMessage) ||
      typingMessages?.has(message.messageId)
    ) {
      return new Conversation({
        messages: prev.messages,
        typingMessages,
      });
    }

    typingMessages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_START,
      isTyping: true,
      typingText: '',
      messageId: message.messageId,
      message,
      time: new Date(),
    });

    return new Conversation({
      messages: prev.messages,
      typingMessages,
    });
  }

  onMessageDelta(
    prev: Conversation,
    response: SseResponse<EventType.MESSAGE_DELTA>,
    options: { showDebugMessage: boolean }
  ): Conversation {
    const message = response.fact.messageDelta.message;

    const messages = new Map(prev.messages);
    const typingMessages = new Map(prev.typingMessages);

    const currentTypingMessage = typingMessages.get(message.messageId);

    if (
      (message.isDebug && !options.showDebugMessage) ||
      messages.has(message.messageId) ||
      currentTypingMessage?.eventType === EventType.MESSAGE_COMPLETE
    ) {
      return new Conversation({
        messages: prev.messages,
        typingMessages,
      });
    }

    const typingText = `${currentTypingMessage?.typingText ?? ''}${
      message.text
    }`;

    typingMessages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_DELTA,
      isTyping: true,
      typingText,
      messageId: message.messageId,
      message,
      time: new Date(),
    });

    return new Conversation({
      messages: prev.messages,
      typingMessages,
    });
  }

  onMessageComplete(
    prev: Conversation,
    response: SseResponse<EventType.MESSAGE_COMPLETE>,
    options: { showDebugMessage: boolean }
  ): Conversation {
    const message = response.fact.messageComplete.message;

    const messages = new Map(prev.messages);
    const typingMessages = new Map(prev.typingMessages);

    if (message.isDebug && !options.showDebugMessage) {
      return new Conversation({
        messages,
        typingMessages,
      });
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

    typingMessages.delete(message.messageId);

    return new Conversation({
      messages,
      typingMessages,
    });
  }

  onMessageDone(prev: Conversation): Conversation {
    const messages = new Map(prev.messages);
    const typingMessages = new Map(prev.typingMessages);

    typingMessages.forEach((message, key) => {
      if (message.eventType === EventType.MESSAGE_COMPLETE) {
        messages.set(message.messageId, message);
        typingMessages.delete(key);
      }
    });

    return new Conversation({
      messages: prev.messages,
      typingMessages,
    });
  }
}
