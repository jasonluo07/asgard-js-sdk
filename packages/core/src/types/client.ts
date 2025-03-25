import { EventType, FetchSseAction } from 'src/constants/enum';
import { SseResponse } from './sse-response';
import { EventHandler } from './event-emitter';

export interface IAsgardServiceClient {
  fetchSse(payload: FetchSsePayload, options?: FetchSseOptions): void;
}

export type InitEventHandler = EventHandler<SseResponse<EventType.INIT>>;
export type MessageEventHandler = EventHandler<
  SseResponse<
    | EventType.MESSAGE_START
    | EventType.MESSAGE_DELTA
    | EventType.MESSAGE_COMPLETE
  >
>;
export type ProcessEventHandler = EventHandler<
  SseResponse<EventType.PROCESS_START | EventType.PROCESS_COMPLETE>
>;
export type DoneEventHandler = EventHandler<SseResponse<EventType.DONE>>;
export type ErrorEventHandler = EventHandler<SseResponse<EventType.ERROR>>;

export interface SseHandlers {
  onRunInit?: InitEventHandler;
  onMessage?: MessageEventHandler;
  onProcess?: ProcessEventHandler;
  onRunDone?: DoneEventHandler;
  onRunError?: ErrorEventHandler;
}

export interface ClientConfig extends SseHandlers {
  endpoint: string;
  apiKey?: string;
  debugMode?: boolean;
  transformSsePayload?: (payload: FetchSsePayload) => FetchSsePayload;
}

export interface FetchSsePayload {
  customChannelId: string;
  customMessageId?: string;
  text: string;
  action: FetchSseAction;
}

export interface FetchSseOptions {
  delayTime?: number;
  onSseStart?: () => void;
  onSseMessage?: (response: SseResponse<EventType>) => void;
  onSseError?: (error: unknown) => void;
  onSseCompleted?: () => void;
}

export interface SseEvents {
  [EventType.INIT]: InitEventHandler;
  [EventType.PROCESS]: ProcessEventHandler;
  [EventType.MESSAGE]: MessageEventHandler;
  [EventType.DONE]: DoneEventHandler;
  [EventType.ERROR]: ErrorEventHandler;
}
