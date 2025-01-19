import { ReactNode } from 'react';
import clsx from 'clsx';
import { ConversationMessage } from 'src/hooks';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import styles from './text-template.module.scss';
import { Avatar } from '../avatar';
import { Time } from '../time';

interface TextTemplateProps {
  conversationMessage: ConversationMessage;
}

export function TextTemplate(props: TextTemplateProps): ReactNode {
  const { conversationMessage } = props;

  if (conversationMessage.type === 'user') {
    return (
      <TemplateBox type="user" direction="horizontal">
        <div className={clsx(styles.text, styles['text--user'])}>
          {conversationMessage.text}
        </div>
        <Time time={conversationMessage.time} />
      </TemplateBox>
    );
  }

  return (
    <TemplateBox type="bot" direction="horizontal">
      <Avatar />
      <TemplateBoxContent
        time={conversationMessage.time}
        quickReplies={conversationMessage.message.template?.quickReplies}
      >
        <div className={clsx(styles.text, styles['text--bot'])}>
          {conversationMessage.message.text}
        </div>
      </TemplateBoxContent>
    </TemplateBox>
  );
}
