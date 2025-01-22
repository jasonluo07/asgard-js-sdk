import { EventType, MessageTemplateType } from 'src/constants/enum';

export interface MessageTemplate {
  quickReplies: { text: string }[];
}

export interface TextMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.TEXT;
  text: string;
}

export interface HintMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.HINT;
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

export type ButtonAction =
  | {
      type: 'message';
      text: string;
    }
  | {
      type: 'uri';
      uri: string;
    };

export interface ButtonMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.BUTTON;
  title: string;
  text: string;
  thumbnailImageUrl: string;
  imageAspectRatio: 'rectangle' | 'square';
  imageSize: 'cover' | 'contain';
  imageBackgroundColor: string;
  defaultAction: ButtonAction;
  buttons: { label: string; action: ButtonAction }[];
}

export interface CarouselMessageTemplate extends MessageTemplate {
  type: MessageTemplateType.CAROUSEL;
  columns: Omit<ButtonMessageTemplate, 'type'>[];
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
    | HintMessageTemplate
    | ButtonMessageTemplate
    | ImageMessageTemplate
    | VideoMessageTemplate
    | AudioMessageTemplate
    | LocationMessageTemplate
    | CarouselMessageTemplate;
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

export interface SseResponse<Type extends EventType> {
  eventType: Type;
  requestId: string;
  namespace: string;
  botProviderName: string;
  customChannelId: string;
  fact: Fact<Type>;
}
