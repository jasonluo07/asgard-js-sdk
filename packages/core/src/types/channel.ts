import { Observer } from 'rxjs';
import { EventType } from '../constants/enum';
import Conversation from '../lib/conversation';
import { IAsgardServiceClient } from './client';
import { ErrorMessage, Message } from './sse-response';

export type ObserverOrNext<T> = Partial<Observer<T>> | ((value: T) => void);

export interface ChannelStates {
  isConnecting: boolean;
  conversation: Conversation;
}

export interface ChannelConfig {
  client: IAsgardServiceClient;
  customChannelId: string;
  customMessageId?: string;
  conversation: Conversation;
  statesObserver?: ObserverOrNext<ChannelStates>;
}

export type ConversationUserMessage = {
  type: 'user';
  messageId: string;
  text: string;
  blobIds?: string[];
  filePreviewUrls?: string[];
  documentNames?: string[];
  /** The client-sent id echoed back on GET rejoin — the dedup key vs the optimistic bubble (F-014). */
  customMessageId?: string;
  /** Identity hint carried by a replayed `message.user` (F-014). */
  identityHint?: string;
  time: Date;
  traceId?: string;
};

export type ConversationBotMessage = {
  type: 'bot';
  messageId: string;
  eventType: EventType;
  isTyping: boolean;
  typingText: string | null;
  message: Message;
  time: Date;
  traceId?: string;
  raw: string;
};

export type ConversationErrorMessage = {
  type: 'error';
  messageId: string;
  eventType: EventType;
  error: ErrorMessage;
  time: Date;
  traceId?: string;
};

export type ConversationToolCallMessage = {
  type: 'tool-call';
  messageId: string; // `${processId}-${callSeq}`
  eventType: EventType.TOOL_CALL_START | EventType.TOOL_CALL_COMPLETE;
  processId: string;
  callSeq: number;
  toolName: string;
  reason?: string;
  toolsetName: string;
  parameter: Record<string, unknown>;
  result?: Record<string, unknown>;
  /** Backend-reported failure flag carried from `tool_call.complete` (F-009); absent until complete. */
  isError?: boolean;
  /**
   * Structured result sidecar carried from `tool_call.complete` (F-010); the replay-safe source for
   * `TaskCreate` / `TaskUpdate` accumulation (id / status), read by `reduceTaskEvents`.
   */
  sidecar?: Record<string, unknown>;
  isComplete: boolean;
  time: Date;
  traceId?: string;
};

/**
 * Extended-thinking (reasoning) block (F-001), assembled from `message.thinking.{start,delta,complete}`.
 * Rendered as its own collapsible block, separate from the bot answer and tool-calls. `isThinking`
 * distinguishes the streaming state (auto-expanded "Thinking…") from the completed state (collapsed
 * "Thought for a moment"). No elapsed-time field — the completed summary is fixed and replay-safe.
 */
export type ConversationThinkingMessage = {
  type: 'thinking';
  messageId: string;
  text: string;
  isThinking: boolean;
  time: Date;
  traceId?: string;
};

export type ConversationMessage =
  | ConversationUserMessage
  | ConversationBotMessage
  | ConversationErrorMessage
  | ConversationToolCallMessage
  | ConversationThinkingMessage;
