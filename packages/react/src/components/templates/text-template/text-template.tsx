import { ReactNode } from 'react';
import clsx from 'clsx';
import { ConversationMessage } from '@asgard-js/core';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import styles from './text-template.module.scss';
import { Avatar } from '../avatar';
import { Time } from '../time';
import { useAsgardContext } from 'src/context/asgard-service-context';

interface TextTemplateProps {
  message: ConversationMessage;
}

export function TextTemplate(props: TextTemplateProps): ReactNode {
  const { message } = props;

  const { avatar } = useAsgardContext();

  if (message.type === 'error') return null;

  if (message.type === 'user') {
    return (
      <TemplateBox type="user" direction="horizontal">
        <div className={clsx(styles.text, styles['text--user'])}>
          {message.text}
        </div>
        <Time time={message.time} />
      </TemplateBox>
    );
  }

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar avatar={avatar} />
      <TemplateBoxContent
        time={message.time}
        quickReplies={message.message.template?.quickReplies}
      >
        <div className={clsx(styles.text, styles['text--bot'])}>
          {message.message.text}
        </div>
      </TemplateBoxContent>
    </TemplateBox>
  );
}
