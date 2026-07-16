import { ReactNode } from 'react';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { ConversationMessage, MessageTemplateType } from '@asgard-js/core';
import { nanoid } from 'nanoid';
import { DemoWrapper } from '../../components/demo-wrapper';
import { createBaseTemplateExample } from '../../mocks/messages';

/**
 * Isolated verification route for the channel-home:// download URI action (ClickUp 86exuvmuj).
 *
 * The bot's `show_channel_home_download_link` tool returns an ATTACHMENT whose
 * `defaultAction` / `downloadAction` are URI actions with a `channel-home://<relative_path>`
 * uri. The SDK should intercept `channel-home://`, call `<botProviderEndpoint>/channel-home/download`
 * and trigger a browser download — instead of `window.open` (which can't open `channel-home://`).
 *
 * How to verify in DevTools:
 * 1. The attachment renders with a download icon — proves `showDownloadIcon` accepts a
 *    channel-home:// URI `downloadAction` (it used to require an EMIT `download_file`).
 * 2. Click the chip body or the download icon. In the Network panel the SDK fires
 *    `GET <base>/channel-home/download?custom_channel_id=...&relative_path=...` (no `window.open`).
 *    - With `VITE_CHANNEL_HOME_BOT_PROVIDER_ENDPOINT` + valid auth -> the file downloads.
 *    - With the default `skip` endpoint -> the request 404s (offline UI check only).
 *
 * The mock mirrors John's real payload (relative_path含中文 -> encodeURIComponent path).
 */
function createChannelHomeAttachmentExample(): ConversationMessage {
  const messageId = nanoid();

  return createBaseTemplateExample({
    messageId,
    replyToCustomMessageId: '',
    text: '',
    payload: null,
    isDebug: false,
    idx: 0,
    template: {
      type: MessageTemplateType.ATTACHMENT,
      attachments: [
        {
          title: '業務員業績排行.json',
          text: '業務員業績排行查詢結果，包含發票筆數、美元/新台幣營收、毛利及平均毛利率。',
          defaultAction: { type: 'uri', uri: 'channel-home://業務員業績排行.json' },
          downloadAction: { type: 'uri', uri: 'channel-home://業務員業績排行.json' },
        },
      ],
      quickReplies: [],
    },
  });
}

export function ChannelHomeDownload(): ReactNode {
  const initMessages = [createChannelHomeAttachmentExample()];

  return (
    <DemoWrapper
      title="Channel Home Download (channel-home:// URI action)"
      description="ATTACHMENT whose actions use channel-home:// URIs. Clicking the chip or the download icon should fetch <base>/channel-home/download and trigger a browser download instead of window.open."
    >
      <Chatbot
        title="Channel Home Download Demo"
        config={{ botProviderEndpoint: import.meta.env.VITE_CHANNEL_HOME_BOT_PROVIDER_ENDPOINT || 'skip' }}
        customChannelId="channel-home-download-demo"
        initMessages={initMessages}
      />
    </DemoWrapper>
  );
}
