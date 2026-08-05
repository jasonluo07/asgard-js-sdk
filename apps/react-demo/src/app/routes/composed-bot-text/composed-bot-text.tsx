import { ReactNode, useCallback, useState } from 'react';
import {
  BotMessageText,
  Chatbot,
  MessageContentRendererProps,
  TemplateBox,
  TemplateBoxContent,
  Time,
  UserMessageText,
} from '@asgard-js/react';
import '@asgard-js/react/style';
import { ConversationMessage, EventType, MessageTemplateType } from '@asgard-js/core';
import { nanoid } from 'nanoid';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './composed-bot-text.module.scss';

const DEMO_TEXT =
  '這一列用來確認預設 TextTemplate 與自組路徑（TemplateBox + TemplateBoxContent + BotMessageText）都使用無頭像、無時間戳、無泡泡的滿寬 bot 文字版面。\n\n### Markdown 也要照舊\n\n- 清單項目\n- `inline code`\n\n> blockquote 一樣要正常渲染。';

const USER_MENTION = '@簡易線上客服';
const USER_REST = ' 這一列確認自組的 user 訊息仍是靠右的泡泡。';

function createDemoMessage(): ConversationMessage {
  const messageId = nanoid();
  const message = {
    text: DEMO_TEXT,
    template: {
      type: MessageTemplateType.TEXT as const,
      text: DEMO_TEXT,
      quickReplies: [],
    },
    messageId,
    replyToCustomMessageId: '',
    payload: undefined,
    isDebug: false,
    idx: 0,
  };

  return {
    type: 'bot',
    messageId,
    isTyping: false,
    typingText: '',
    eventType: EventType.MESSAGE_COMPLETE,
    time: new Date(),
    message,
    raw: JSON.stringify({
      eventType: EventType.MESSAGE_COMPLETE,
      fact: { messageComplete: { message } },
    }),
  };
}

function createDemoUserMessage(): ConversationMessage {
  return {
    type: 'user',
    messageId: nanoid(),
    text: `${USER_MENTION}${USER_REST}`,
    time: new Date(),
  };
}

export function ComposedBotText(): ReactNode {
  const [composed, setComposed] = useState(true);
  const [initMessages] = useState(() => [createDemoUserMessage(), createDemoMessage()]);

  // The Sindri-style self-composed rows: bot text with no Avatar / time filling the reading width, and a user
  // message whose leading mention becomes a chip — still inside the default right-aligned bubble.
  const composedRenderer = useCallback((props: MessageContentRendererProps): ReactNode => {
    const { message, renderDefaultContent } = props;

    if (message.type === 'user' && message.text.startsWith(USER_MENTION)) {
      return (
        <TemplateBox type="user" direction="horizontal">
          <UserMessageText>
            <span className={styles.mentionChip}>{USER_MENTION}</span>
            {message.text.slice(USER_MENTION.length)}
          </UserMessageText>
          <Time time={message.time} />
        </TemplateBox>
      );
    }

    if (message.type === 'bot') {
      const template = message.message?.template;
      const isText = template?.type === MessageTemplateType.TEXT || !template?.type;
      const text = message.isTyping ? message.typingText : message.message?.text;

      if (isText && text) {
        return (
          <TemplateBox type="bot" direction="horizontal">
            <TemplateBoxContent message={message} quickReplies={template?.quickReplies}>
              <BotMessageText>{text}</BotMessageText>
            </TemplateBoxContent>
          </TemplateBox>
        );
      }
    }

    return renderDefaultContent();
  }, []);

  return (
    <DemoWrapper
      title="自組訊息列"
      description="確認自組的 bot 列（TemplateBox + TemplateBoxContent + BotMessageText）與預設同為滿寬無 chrome，自組的 user 列（TemplateBox + UserMessageText）與預設同為靠右泡泡。"
    >
      <div className={styles.controls}>
        <button className={composed ? styles.active : ''} onClick={() => setComposed(true)}>
          Composed（自組）
        </button>
        <button className={!composed ? styles.active : ''} onClick={() => setComposed(false)}>
          Default（預設）
        </button>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          key={composed ? 'composed' : 'default'}
          title="Composed Bot Text"
          config={{ botProviderEndpoint: 'skip' }}
          customChannelId={`composed-bot-text-${composed ? 'composed' : 'default'}`}
          initMessages={initMessages}
          renderMessageContent={composed ? composedRenderer : undefined}
        />
      </div>
    </DemoWrapper>
  );
}
