import { ButtonMessageTemplate, ConversationBotMessage } from '@asgard-js/core';
import { ReactNode } from 'react';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import { Card } from './card';

interface ButtonTemplateProps {
  conversationMessage: ConversationBotMessage;
}

export function ButtonTemplate(props: ButtonTemplateProps): ReactNode {
  const { conversationMessage } = props;

  const template = conversationMessage.message
    .template as ButtonMessageTemplate;

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar />
      <TemplateBoxContent
        time={conversationMessage.time}
        quickReplies={template?.quickReplies}
      >
        <Card template={template} />
      </TemplateBoxContent>
    </TemplateBox>
  );
}
