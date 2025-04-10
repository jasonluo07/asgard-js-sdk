import { ReactNode } from 'react';
import { TemplateBox } from '../template-box';
import { Avatar } from '../avatar';
import styles from './image-template.module.scss';
import { ConversationBotMessage } from '@asgard-js/core';
import { Time } from '../time';
import { useAsgardContext } from 'src/context/asgard-service-context';
import { ImageMessageTemplate } from '../../../../../core/src';

interface ImageTemplateProps {
  message: ConversationBotMessage;
}

export function ImageTemplate(props: ImageTemplateProps): ReactNode {
  const { message } = props;
  const template = message.message.template as ImageMessageTemplate;
  const { previewImageUrl } = template;
  const { avatar } = useAsgardContext();

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar avatar={avatar} />
      <div className={styles.image_box}>
        <img src={previewImageUrl} alt="Message image" />
      </div>
      <div className={styles.quick_replies_box}></div>
      <Time className={styles.time} time={message.time} />
    </TemplateBox>
  );
}
