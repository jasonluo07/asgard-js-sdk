import { EventType, FetchSseAction } from 'src/constants/enum';
import { ErrorEventData, SseResponse } from './sse-response';

export interface IAsgardServiceClient {
  fetchSse(payload: FetchSsePayload, options?: FetchSseOptions): void;
}

export interface ClientConfig {
  endpoint: string;
  apiKey?: string;
  onExecutionError?: (error: ErrorEventData) => void;
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
