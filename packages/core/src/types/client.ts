import { EventType, FetchSseAction } from 'src/constants/enum';
import { Message, SseResponse } from './sse-response';

export interface ClientConfig {
  endpoint: string;
  apiKey: string;
  webhookToken?: string;
}

export interface FetchSsePayload {
  customChannelId: string;
  customMessageId?: string;
  text: string;
  action: FetchSseAction;
}

export interface ConnectionOptions {
  onSseStart?: () => void;
  onSseMessage?: (response: SseResponse<EventType>) => void;
  onSseError?: (error: unknown) => void;
  onSseCompleted?: () => void;
}

export type SetChannelPayload = Pick<
  FetchSsePayload,
  'customChannelId' | 'customMessageId'
>;
export type SetChannelOptions = ConnectionOptions;

export type SendMessagePayload = Pick<
  FetchSsePayload,
  'customChannelId' | 'customMessageId' | 'text'
>;
export type SendMessageOptions = ConnectionOptions & {
  delayTime?: number;
};

export type ConversationUserMessage = {
  type: 'user';
  messageId: string;
  text: string;
  time: Date;
};

export type ConversationBotMessage = {
  type: 'bot';
  messageId: string;
  eventType: EventType;
  isTyping: boolean;
  typingText: string | null;
  message: Message;
  time: Date;
};

export type ConversationMessage =
  | ConversationUserMessage
  | ConversationBotMessage;
