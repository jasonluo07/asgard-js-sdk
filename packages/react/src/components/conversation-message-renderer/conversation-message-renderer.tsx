import { ReactNode } from 'react';
import { ConversationMessage } from 'src/hooks';
import {
  ButtonTemplate,
  CarouselTemplate,
  HintTemplate,
  TextTemplate,
} from '../templates';
import { MessageTemplateType } from '@asgard-js/core';

interface ConversationMessageRendererProps {
  conversationMessage: ConversationMessage;
}

export function ConversationMessageRenderer(
  props: ConversationMessageRendererProps
): ReactNode {
  const { conversationMessage } = props;

  if (conversationMessage.type === 'user') {
    return <TextTemplate conversationMessage={conversationMessage} />;
  }

  const template = conversationMessage.message.template;

  switch (template?.type) {
    case MessageTemplateType.TEXT:
      return <TextTemplate conversationMessage={conversationMessage} />;
    case MessageTemplateType.HINT:
      return <HintTemplate conversationMessage={conversationMessage} />;
    case MessageTemplateType.BUTTON:
      return <ButtonTemplate conversationMessage={conversationMessage} />;
    case MessageTemplateType.CAROUSEL:
      return <CarouselTemplate conversationMessage={conversationMessage} />;
    default:
      return <div>Unknown template</div>;
  }
}
