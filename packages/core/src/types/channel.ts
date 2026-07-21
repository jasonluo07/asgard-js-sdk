import { Observer } from 'rxjs';
import { EventType } from '../constants/enum';
import Conversation from '../lib/conversation';
import { IAsgardServiceClient } from './client';
import { ErrorMessage, Message } from './sse-response';
import { Subagent, SubagentTerminalStatus } from './subagent';
import { Task } from './task';

export type ObserverOrNext<T> = Partial<Observer<T>> | ((value: T) => void);

/**
 * Sandbox cold-start phase derived from the last sandbox event (F-018): `launching` after
 * `sandbox.launch`, `ready` after `sandbox.ready`, `idle` with no sandbox event (also reset on run
 * init / error). Feeds the Launch HUD latch on the react side.
 */
export type SandboxPhase = 'idle' | 'launching' | 'ready';

/**
 * One live sandbox in a channel, from `GET /channel/metadata` `launchedSandboxes[]` (F-019). A channel
 * may hold several at once (e.g. one running analysis, one driving a browser), so this is always handled
 * as a set — never assume a singleton. metadata (heartbeat-backed) is the sole authority on "who is live";
 * the `asgard.sandbox.launch` SSE event is only a hint.
 */
export interface LaunchedSandbox {
  /** Authoritative identity key — every fs / browser API call locates the sandbox by this. */
  sandboxName: string;
  /** The blueprint that created it — the display label (usually more readable than `sandboxName`). */
  sandboxBlueprintName: string;
  /** This sandbox's working directory (the File Explorer tree root, F-021). */
  workingDirectory: string;
  /** Whether the editor server is enabled (gates the "open editor" affordance). */
  editorServerEnabled: boolean;
  /** Whether the browser is enabled (gates the browser-handoff card, F-020). */
  browserEnabled: boolean;
}

export interface ChannelStates {
  isConnecting: boolean;
  conversation: Conversation;
  /** Current Task Check List derived from the conversation (F-010; exposed as a store in F-013). */
  tasks: Task[];
  /** Current Subagent list derived from the conversation (F-012; exposed as a store in F-013). */
  subagents: Subagent[];
  /** Current channel title — seeded from metadata + updated by `title.update` (F-016). `null` = unnamed. */
  channelTitle: string | null;
  /** Current sandbox cold-start phase (F-018) — drives the Launch HUD. `idle` when no sandbox in flight. */
  sandboxPhase: SandboxPhase;
  /** Live sandboxes in this channel from the latest `/channel/metadata` (F-019). Empty when none live. */
  launchedSandboxes: LaunchedSandbox[];
}

export interface ChannelConfig {
  client: IAsgardServiceClient;
  customChannelId: string;
  customMessageId?: string;
  conversation: Conversation;
  /** Seed for the channel title store (F-016) — from `GET /channel/metadata` at join (wired by F-015). `null` = unnamed. */
  channelTitle?: string | null;
  /** Seed for the launchedSandboxes store (F-019) — from `GET /channel/metadata` at join. Reconciled on set. */
  launchedSandboxes?: LaunchedSandbox[];
  statesObserver?: ObserverOrNext<ChannelStates>;
}

/** A channel's run state from `GET /channel/metadata` (F-015): `RUNNING` = a run is in flight. */
export type ChannelRunState = 'RUNNING' | 'IDLE';

/**
 * Channel metadata from `GET /channel/metadata` (F-015) — the join-init existence + restore gate.
 * Returned by `client.channelMetadata()` on `200`. A `404` (channel does not exist) is surfaced as
 * `channelMetadata()` returning `null`, which is distinct from a `200` carrying `title: null` (an
 * existing but unnamed channel). `title` seeds the channel-title store (F-016); `runState` describes
 * whether a run is still streaming when history is replayed (F-014).
 */
export interface ChannelMetadata {
  title: string | null;
  runState: ChannelRunState;
  lastActivityAt?: string;
  /** Live sandboxes in this channel (F-019) — the sole authority on "who is live". `[]` when none / old backend. */
  launchedSandboxes: LaunchedSandbox[];
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
   * Set when a still-running tool-call is force-settled by a user-initiated stop-generation (F-020 AC10):
   * the run was aborted before this call's `tool_call.complete` arrived, so it converges to `cancelled`
   * instead of lingering as `running`. Never set by a real terminal frame.
   */
  isCancelled?: boolean;
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
