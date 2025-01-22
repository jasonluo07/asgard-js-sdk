import { FetchSseAction } from 'src/constants/enum';

export interface ClientConfig {
  baseUrl: string;
  namespace: string;
  botProviderName: string;
  webhookToken: string;
}

export interface FetchSsePayload {
  customChannelId: string;
  customMessageId?: string;
  text: string;
  action: FetchSseAction;
}

export interface ConnectionOptions {
  onStart?: () => void;
  onCompleted?: () => void;
}

export type SetChannelPayload = Omit<FetchSsePayload, 'action'>;
export type SetChannelOptions = ConnectionOptions;

export type SendMessagePayload = Omit<FetchSsePayload, 'action'>;
export type SendMessageOptions = ConnectionOptions & {
  delayTime?: number;
};
