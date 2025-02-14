import { EventType, FetchSseAction } from 'src/constants/enum';
import { SseResponse } from './sse-response';

export interface IAsgardServiceClient {
  resetChannel(
    payload: ResetChannelPayload,
    options?: ResetChannelOptions
  ): void;
  sendMessage(payload: SendMessagePayload, options?: SendMessageOptions): void;
}

export interface ClientConfig {
  endpoint: string;
  apiKey: string;
  transformSsePayload?: (payload: FetchSsePayload) => FetchSsePayload;
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

export type ResetChannelPayload = Pick<
  FetchSsePayload,
  'customChannelId' | 'customMessageId'
>;
export type ResetChannelOptions = ConnectionOptions;

export type SendMessagePayload = Pick<
  FetchSsePayload,
  'customChannelId' | 'customMessageId' | 'text'
>;
export type SendMessageOptions = ConnectionOptions & {
  delayTime?: number;
};
