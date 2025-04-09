import { ReactNode } from 'react';
import { TemplateBox } from '../template-box';
import { Avatar } from '../avatar';
import styles from './carousel-template.module.scss';
import { Card } from '../button-template/card';
import {
  CarouselMessageTemplate,
  ConversationBotMessage,
} from '@asgard-js/core';
import { Time } from '../time';
import { useAsgardContext } from 'src/context/asgard-service-context';

interface ChartTemplateProps {
  message: ConversationBotMessage;
}

export function ChartTemplate(props: ChartTemplateProps): ReactNode {
  const { message } = props;

  const { avatar } = useAsgardContext();

  const template = message.message.template as CarouselMessageTemplate;

  return (
    <TemplateBox type="bot" direction="vertical">
      <Avatar avatar={avatar} />
      <div className={styles.carousel_root}>
        {template.columns?.map((column, index) => (
          <Card key={index} template={column} />
        ))}
      </div>
      <Time className={styles.carousel_time} time={message.time} />
    </TemplateBox>
  );
}
