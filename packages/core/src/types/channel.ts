import { EventType } from 'src/constants/enum';
import { Message } from './sse-response';

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
