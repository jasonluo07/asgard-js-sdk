import { Observer } from 'rxjs';
import { EventType } from '../constants/enum';
import Conversation from '../lib/conversation';
import { IAsgardServiceClient } from './client';
import { ErrorMessage, Message } from './sse-response';
import { Subagent, SubagentTerminalStatus } from './subagent';
import { Task } from './task';

export type ObserverOrNext<T> = Partial<Observer<T>> | ((value: T) => void);

export interface ChannelStates {
  isConnecting: boolean;
  conversation: Conversation;
  /** Current Task Check List derived from the conversation (F-010; exposed as a store in F-013). */
  tasks: Task[];
  /** Current Subagent list derived from the conversation (F-012; exposed as a store in F-013). */
  subagents: Subagent[];
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
  /** This tool-call's own correlation id; an `Agent` spawn's `toolUseId` becomes a subagent key (F-012). */
  toolUseId?: string;
  /** Non-empty when this tool-call belongs to a subagent (points at the `Agent`'s `toolUseId`) (F-012). */
  parentToolUseId?: string;
  isComplete: boolean;
  time: Date;
  traceId?: string;
};

/**
 * A subagent lifecycle event (F-012), stored so the react layer can fold `subagent.{start,complete}`
 * together with the ordered `Agent` / child tool-call messages into the current subagent list.
 * Keyed in the conversation Map by `subagent:${parentToolUseId}:${kind}` (start upserts, complete wins).
 */
export type ConversationSubagentMessage = {
  type: 'subagent';
  messageId: string;
  kind: 'start' | 'complete';
  parentToolUseId: string;
  agentId?: string;
  subagentType?: string;
  description?: string;
  /** Present on `complete`. */
  status?: SubagentTerminalStatus;
  summary?: string;
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
  | ConversationThinkingMessage
  | ConversationSubagentMessage;
