import { ReactNode } from 'react';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import styles from './image-template.module.scss';
import { ConversationBotMessage } from '@asgard-js/core';
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
      <TemplateBoxContent
        quickReplies={template.quickReplies}
        time={message.time}
      >
        <div className={styles.image_box}>
          <img src={previewImageUrl} alt="Message image" />
        </div>
      </TemplateBoxContent>
    </TemplateBox>
  );
}
