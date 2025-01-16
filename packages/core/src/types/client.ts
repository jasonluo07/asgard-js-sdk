import { FetchSSEAction } from 'src/constants/enum';

export interface ClientConfig {
  baseUrl: string;
  namespace: string;
  botProviderName: string;
  webhookToken: string;
}

export interface FetchSSEPayload {
  customChannelId: string;
  customMessageId: string;
  text: string;
  action: FetchSSEAction;
}

export type SetChannelPayload = Omit<FetchSSEPayload, 'action'>;
export type SendMessagePayload = Omit<FetchSSEPayload, 'action'>;
