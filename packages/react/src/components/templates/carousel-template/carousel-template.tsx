import { ReactNode } from 'react';
import { ConversationBotMessage } from 'src/hooks';
import { TemplateBox } from '../template-box';
import { Avatar } from '../avatar';
import styles from './carousel-template.module.scss';
import { Card } from '../button-template/card';
import { CarouselMessageTemplate } from '@asgard-js/core';
import { Time } from '../time';

interface CarouselTemplateProps {
  conversationMessage: ConversationBotMessage;
}

export function CarouselTemplate(props: CarouselTemplateProps): ReactNode {
  const { conversationMessage } = props;

  const template = conversationMessage.message
    .template as CarouselMessageTemplate;

  return (
    <TemplateBox type="bot" direction="vertical">
      <Avatar />
      <div className={styles.carousel_root}>
        {template.columns?.map((column, index) => (
          <Card key={index} template={column} />
        ))}
      </div>
      <Time className={styles.carousel_time} time={conversationMessage.time} />
    </TemplateBox>
  );
}
