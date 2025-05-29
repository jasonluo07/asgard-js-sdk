import { ReactNode } from 'react';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import styles from './carousel-template.module.scss';
import { Card } from '../button-template/card';
import {
  CarouselMessageTemplate,
  ConversationBotMessage,
} from '@asgard-js/core';
import { Time } from '../time';
import { useAsgardContext } from 'src/context/asgard-service-context';
import { useAsgardThemeContext } from 'src/context/asgard-theme-context';

interface CarouselTemplateProps {
  message: ConversationBotMessage;
}

export function CarouselTemplate(props: CarouselTemplateProps): ReactNode {
  const { message } = props;

  const { template: themeTemplate } = useAsgardThemeContext();
  const { avatar } = useAsgardContext();

  const template = message.message.template as CarouselMessageTemplate;

  return (
    <TemplateBox
      className="asgard-carousel-template"
      type="bot"
      direction="vertical"
      style={themeTemplate?.CarouselMessageTemplate?.style}
    >
      <Avatar avatar={avatar} />
      <TemplateBoxContent quickReplies={template.quickReplies}>
        <div className={styles.carousel_root}>
          {template.columns?.map((column, index) => (
            <Card key={index} template={column} />
          ))}
        </div>
      </TemplateBoxContent>
      <Time className={styles.carousel_time} time={message.time} />
    </TemplateBox>
  );
}
