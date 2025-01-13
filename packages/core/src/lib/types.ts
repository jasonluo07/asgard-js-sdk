import { EventType, TemplateType } from './enum';

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
  action: 'RESET_CHANNEL' | 'NONE';
}

export interface BasicTemplate {
  quickReplies: { text: string }[];
}

export interface TextTemplate extends BasicTemplate {
  type: TemplateType.TEXT;
  text: string;
}

export interface ImageTemplate extends BasicTemplate {
  type: TemplateType.IMAGE;
  originalContentUrl: string;
  previewImageUrl: string;
}

export interface VideoTemplate extends BasicTemplate {
  type: TemplateType.VIDEO;
  originalContentUrl: string;
  previewImageUrl: string;
  duration: number;
}

export interface AudioTemplate extends BasicTemplate {
  type: TemplateType.AUDIO;
  originalContentUrl: string;
  duration: number;
}

export interface LocationTemplate extends BasicTemplate {
  type: TemplateType.LOCATION;
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
    | TextTemplate
    | ImageTemplate
    | VideoTemplate
    | AudioTemplate
    | LocationTemplate;
}

export type MessageObject<
  CurrentEventType extends EventType,
  TargetEventType extends EventType
> = CurrentEventType extends TargetEventType ? { message: Message } : null;

export interface Fact<Type extends EventType> {
  runInit: null;
  runDone: null;
  runError: null;
  messageStart: MessageObject<Type, EventType.MESSAGE_START>;
  messageDelta: MessageObject<Type, EventType.MESSAGE_DELTA>;
  messageComplete: MessageObject<Type, EventType.MESSAGE_COMPLETE>;
}

export interface MessageSSEResponse<Type extends EventType> {
  eventType: Type;
  requestId: string;
  namespace: string;
  botProviderName: string;
  customChannelId: string;
  fact: Fact<Type>;
}

export type AllEventTypeResponse =
  | MessageSSEResponse<EventType.INIT>
  | MessageSSEResponse<EventType.MESSAGE_START>
  | MessageSSEResponse<EventType.MESSAGE_DELTA>
  | MessageSSEResponse<EventType.MESSAGE_COMPLETE>
  | MessageSSEResponse<EventType.DONE>;
