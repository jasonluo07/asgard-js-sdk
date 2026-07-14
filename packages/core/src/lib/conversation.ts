import { v4 as uuidv4 } from 'uuid';
import { EventType } from '../constants/enum';
import {
  ConversationMessage,
  ConversationToolCallMessage,
  ConversationUserMessage,
  SseResponse,
  ToolCallConsentEventData,
} from '../types';

interface IConversation {
  messages: Map<string, ConversationMessage> | null;
  pendingConsent?: ToolCallConsentEventData | null;
}

export default class Conversation implements IConversation {
  public messages: Map<string, ConversationMessage> | null = null;
  public pendingConsent: ToolCallConsentEventData | null = null;

  constructor({ messages, pendingConsent = null }: IConversation) {
    this.messages = messages;
    this.pendingConsent = pendingConsent ?? null;
  }

  pushMessage(message: ConversationMessage): Conversation {
    const messages = new Map(this.messages);
    messages.set(message.messageId, message);

    return new Conversation({ messages, pendingConsent: this.pendingConsent });
  }

  clearPendingConsent(): Conversation {
    if (!this.pendingConsent) return this;

    return new Conversation({ messages: this.messages, pendingConsent: null });
  }

  onMessage(response: SseResponse<EventType>): Conversation {
    switch (response.eventType) {
      case EventType.MESSAGE_START:
        return this.onMessageStart(response as SseResponse<EventType.MESSAGE_START>);
      case EventType.MESSAGE_DELTA:
        return this.onMessageDelta(response as SseResponse<EventType.MESSAGE_DELTA>);
      case EventType.MESSAGE_COMPLETE:
        return this.onMessageComplete(response as SseResponse<EventType.MESSAGE_COMPLETE>);
      case EventType.MESSAGE_USER:
        return this.onMessageUser(response as SseResponse<EventType.MESSAGE_USER>);
      case EventType.TOOL_CALL_START:
        return this.onToolCallStart(response as SseResponse<EventType.TOOL_CALL_START>);
      case EventType.TOOL_CALL_COMPLETE:
        return this.onToolCallComplete(response as SseResponse<EventType.TOOL_CALL_COMPLETE>);
      case EventType.TOOL_CALL_CONSENT:
        return this.onToolCallConsent(response as SseResponse<EventType.TOOL_CALL_CONSENT>);
      case EventType.ERROR:
        return this.onMessageError(response as SseResponse<EventType.ERROR>);
      default:
        return this;
    }
  }

  /**
   * A message is terminal once `complete` has materialized it (a bot message with `isTyping === false`).
   * Terminal messages must never regress to typing/streaming — late `start`/`delta` frames from replay
   * or out-of-order delivery are ignored (F-011 / UC-018).
   */
  private isTerminalBot(message: ConversationMessage | undefined): boolean {
    return message?.type === 'bot' && !message.isTyping;
  }

  onMessageStart(response: SseResponse<EventType.MESSAGE_START>): Conversation {
    const message = response.fact.messageStart.message;

    // Terminal guard: a completed message stays put; a late `start` must not blank it into a typing bubble.
    if (this.isTerminalBot(this.messages?.get(message.messageId))) return this;

    const messages = new Map(this.messages);

    messages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_START,
      isTyping: true,
      typingText: '',
      messageId: message.messageId,
      message,
      time: new Date(),
      traceId: response.traceId,
      raw: '',
    });

    return new Conversation({ messages, pendingConsent: this.pendingConsent });
  }

  onMessageDelta(response: SseResponse<EventType.MESSAGE_DELTA>): Conversation {
    const message = response.fact.messageDelta.message;
    const currentMessage = this.messages?.get(message.messageId);

    // Terminal guard: a late `delta` after `complete` must not flip the message back into typing (UC-018).
    if (this.isTerminalBot(currentMessage)) return this;

    // Lazy-init: a `delta` with no existing entry (delta-before-start / mid-stream join) creates the
    // typing message rather than silently dropping its text (UC-017).
    const currentBot = currentMessage?.type === 'bot' ? currentMessage : undefined;
    const messages = new Map(this.messages);

    messages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_DELTA,
      isTyping: true,
      typingText: `${currentBot?.typingText ?? ''}${message.text}`,
      messageId: message.messageId,
      message,
      time: new Date(),
      traceId: response.traceId ?? currentBot?.traceId,
      raw: currentBot?.raw ?? '',
    });

    return new Conversation({ messages, pendingConsent: this.pendingConsent });
  }

  onMessageComplete(response: SseResponse<EventType.MESSAGE_COMPLETE>): Conversation {
    const message = response.fact.messageComplete.message;

    const messages = new Map(this.messages);

    const currentMessage = messages.get(message.messageId);

    messages.set(message.messageId, {
      type: 'bot',
      eventType: EventType.MESSAGE_COMPLETE,
      isTyping: false,
      typingText: null,
      messageId: message.messageId,
      message,
      time: new Date(),
      traceId: response.traceId ?? (currentMessage?.type === 'bot' ? currentMessage.traceId : undefined),
      raw: JSON.stringify(response),
    });

    return new Conversation({ messages, pendingConsent: this.pendingConsent });
  }

  onMessageUser(response: SseResponse<EventType.MESSAGE_USER>): Conversation {
    const data = response.fact.messageUser;

    // Dedup: the optimistic bubble sent live is keyed by the customMessageId the client generated, which
    // the backend echoes back here as `customMessageId`. If that (or the backend messageId) already maps
    // to a user message, this replayed turn is a duplicate — keep the existing one (F-014 invariant).
    const existing =
      this.messages?.get(data.messageId) ??
      (data.customMessageId ? this.messages?.get(data.customMessageId) : undefined);

    if (existing?.type === 'user') return this;

    const messages = new Map(this.messages);
    const userMessage: ConversationUserMessage = {
      type: 'user',
      messageId: data.messageId,
      text: data.text,
      blobIds: data.blobIds,
      customMessageId: data.customMessageId,
      identityHint: data.identityHint,
      time: new Date(),
      traceId: response.traceId,
    };
    messages.set(data.messageId, userMessage);

    return new Conversation({ messages, pendingConsent: this.pendingConsent });
  }

  onMessageError(response: SseResponse<EventType.ERROR>): Conversation {
    const messageId = uuidv4();
    const error = response.fact.runError.error;

    const messages = new Map(this.messages);

    messages.set(messageId, {
      type: 'error',
      eventType: EventType.ERROR,
      messageId,
      error,
      time: new Date(),
      traceId: response.traceId,
    });

    return new Conversation({ messages, pendingConsent: this.pendingConsent });
  }

  onToolCallStart(response: SseResponse<EventType.TOOL_CALL_START>): Conversation {
    const toolCallStart = response.fact.toolCallStart;
    const messages = new Map(this.messages);
    const toolCallKey = `${toolCallStart.processId}-${toolCallStart.callSeq}`;

    const toolCallMessage: ConversationToolCallMessage = {
      type: 'tool-call',
      eventType: EventType.TOOL_CALL_START,
      messageId: toolCallKey,
      processId: toolCallStart.processId,
      callSeq: toolCallStart.callSeq,
      toolName: toolCallStart.toolCall.toolName,
      reason: toolCallStart.toolCall.reason,
      toolsetName: toolCallStart.toolCall.toolsetName,
      parameter: toolCallStart.toolCall.parameter,
      isComplete: false,
      time: new Date(),
      traceId: response.traceId,
    };

    messages.set(toolCallKey, toolCallMessage);

    return new Conversation({ messages, pendingConsent: this.pendingConsent });
  }

  onToolCallComplete(response: SseResponse<EventType.TOOL_CALL_COMPLETE>): Conversation {
    const toolCallComplete = response.fact.toolCallComplete;
    const messages = new Map(this.messages);
    const toolCallKey = `${toolCallComplete.processId}-${toolCallComplete.callSeq}`;

    const existingMessage = messages.get(toolCallKey);

    if (existingMessage?.type === 'tool-call') {
      const updatedMessage: ConversationToolCallMessage = {
        ...existingMessage,
        eventType: EventType.TOOL_CALL_COMPLETE,
        result: toolCallComplete.toolCallResult,
        isComplete: true,
        traceId: response.traceId ?? existingMessage.traceId,
      };
      messages.set(toolCallKey, updatedMessage);
    }

    return new Conversation({ messages, pendingConsent: this.pendingConsent });
  }

  onToolCallConsent(response: SseResponse<EventType.TOOL_CALL_CONSENT>): Conversation {
    const consent = response.fact.toolCallConsent;

    return new Conversation({ messages: this.messages, pendingConsent: consent });
  }
}
