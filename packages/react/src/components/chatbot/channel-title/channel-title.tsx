import { ReactNode } from 'react';
import { useAsgardContext } from '../../../context/asgard-service-context';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { ChatHeader } from '../chat-header';

// @deprecated Since F-022 use `ChatHeader` (the unified heading bar). `ChannelTitle` is the special case
// of `ChatHeader` with only a channel title — no bot identity, no right-side actions. It is kept as a thin
// backward-compatible wrapper: existing `<ChannelTitle />` imports keep working, and the old (F-017)
// `renderTitle` (whole-row semantics) maps to `ChatHeader`'s `renderHeader` (UC-043). New code should use
// `ChatHeader` directly — it is the only one that can express a bot main line + subtitle or action buttons.

export function ChannelTitle(): ReactNode {
  const { channelTitle } = useAsgardContext();
  const { renderTitle, untitledLabel, channelTitleHidden } = useAsgardTemplateContext();

  return (
    <ChatHeader
      title={channelTitle}
      untitledLabel={untitledLabel}
      hidden={channelTitleHidden}
      renderHeader={
        renderTitle
          ? ({ title, renderDefault }): ReactNode => renderTitle({ botName: null, title, renderDefault })
          : undefined
      }
    />
  );
}

export default ChannelTitle;
