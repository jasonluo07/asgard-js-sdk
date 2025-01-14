import { EventType, FetchSSEAction, MessageTemplateType } from './enum';

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

export interface MessageTemplate {
  quickReplies: { text: string }[];
}

export interface TextMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.TEXT;
  text: string;
}

export interface ImageMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.IMAGE;
  originalContentUrl: string;
  previewImageUrl: string;
}

export interface VideoMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.VIDEO;
  originalContentUrl: string;
  previewImageUrl: string;
  duration: number;
}

export interface AudioMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.AUDIO;
  originalContentUrl: string;
  duration: number;
}

export interface LocationMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.LOCATION;
  title: string;
  text: string;
  latitude: number;
  longitude: number;
}

export interface Message<Payload = unknown> {
  messageId: string;
  replyToCustomMessageId: string;
  text: string;
  payload: Payload | null;
  isDebug: boolean;
  idx: number;
  template:
    | TextMessageTemplate
    | ImageMessageTemplate
    | VideoMessageTemplate
    | AudioMessageTemplate
    | LocationMessageTemplate;
}

export type EventData<
  CurrentEventType extends EventType,
  TargetEventType extends EventType
> = CurrentEventType extends TargetEventType ? { message: Message } : null;

export interface Fact<Type extends EventType> {
  runInit: null;
  runDone: null;
  runError: null;
  messageStart: EventData<Type, EventType.MESSAGE_START>;
  messageDelta: EventData<Type, EventType.MESSAGE_DELTA>;
  messageComplete: EventData<Type, EventType.MESSAGE_COMPLETE>;
}

export interface SSEResponse<Type extends EventType> {
  eventType: Type;
  requestId: string;
  namespace: string;
  botProviderName: string;
  customChannelId: string;
  fact: Fact<Type>;
}
