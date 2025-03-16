import { ReactNode } from 'react';
import { ConversationMessage, MessageTemplateType } from '@asgard-js/core';
import {
  BotTypingBox,
  ButtonTemplate,
  CarouselTemplate,
  HintTemplate,
  TextTemplate,
} from '../../templates';

interface ConversationMessageRendererProps {
  message: ConversationMessage;
}

export function ConversationMessageRenderer(
  props: ConversationMessageRendererProps
): ReactNode {
  const { message } = props;

  if (message.type === 'user') {
    return <TextTemplate message={message} />;
  }

  if (message.type === 'error') {
    return <HintTemplate message={message} />;
  }

  if (message.isTyping) {
    return (
      <BotTypingBox
        isTyping={message.isTyping}
        typingText={message.typingText}
      />
    );
  }

  switch (message.message.template?.type) {
    case MessageTemplateType.TEXT:
      return <TextTemplate message={message} />;
    case MessageTemplateType.HINT:
      return <HintTemplate message={message} />;
    case MessageTemplateType.BUTTON:
      return <ButtonTemplate message={message} />;
    case MessageTemplateType.CAROUSEL:
      return <CarouselTemplate message={message} />;
    default:
      return <div />;
  }
}
