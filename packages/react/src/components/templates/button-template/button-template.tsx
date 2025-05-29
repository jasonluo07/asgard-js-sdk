import { ButtonMessageTemplate, ConversationBotMessage } from '@asgard-js/core';
import { ReactNode } from 'react';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import { Card } from './card';
import { useAsgardContext } from 'src/context/asgard-service-context';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';

interface ButtonTemplateProps {
  message: ConversationBotMessage;
}

export function ButtonTemplate(props: ButtonTemplateProps): ReactNode {
  const { message } = props;

  const { template: themeTemplate } = useAsgardThemeContext();

  const { avatar } = useAsgardContext();

  const template = message.message.template as ButtonMessageTemplate;

  return (
    <TemplateBox
      className="asgard-button-template"
      type="bot"
      direction="horizontal"
      style={themeTemplate?.ButtonMessageTemplate?.style}
    >
      <Avatar avatar={avatar} />
      <TemplateBoxContent
        time={message.time}
        quickReplies={template?.quickReplies}
      >
        <Card template={template} />
      </TemplateBoxContent>
    </TemplateBox>
  );
}
