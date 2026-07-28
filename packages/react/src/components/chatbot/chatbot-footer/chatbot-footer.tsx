import { ReactNode, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useAsgardContext } from '../../../context/asgard-service-context';
import { useAsgardAppInitializationContext } from '../../../context/asgard-app-initialization-context';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { RunningIndicator } from '../running-indicator';
import { ChatComposer } from './chat-composer';
import styles from './chatbot-footer.module.scss';

interface ChatbotFooterProps {
  footerEndActions?: ReactNode[];
  /** Slot between the RunningIndicator and the pill (outside it). */
  renderComposerAbove?: () => ReactNode;
  /** Slot inside the pill, below the input row. */
  renderComposerInline?: () => ReactNode;
}

/**
 * Footer assembly layer (BUILD-028). It owns the seam, the content width and the footer-level theme,
 * and delegates the input itself to `<ChatComposer>`. Everything about attachments, sending and the
 * pill's layout lives in the composer — this file should stay small.
 */
export function ChatbotFooter({
  footerEndActions,
  renderComposerAbove,
  renderComposerInline,
}: ChatbotFooterProps = {}): ReactNode {
  const {
    isRunning,
    enableUpload: enableUploadProp,
    enableDocumentUpload: enableDocumentUploadProp,
  } = useAsgardContext();
  const { data } = useAsgardAppInitializationContext();
  const { chatbot } = useAsgardThemeContext();

  const footerRef = useRef<HTMLDivElement>(null);

  // Upload flags: the prop wins, then the bot provider's annotations.
  const enableUpload = useMemo(
    () => enableUploadProp ?? data.annotations?.embedConfig?.enableUpload ?? false,
    [enableUploadProp, data.annotations?.embedConfig?.enableUpload],
  );

  const enableDocumentUpload = useMemo(
    () => enableDocumentUploadProp ?? data.annotations?.embedConfig?.enableDocumentUpload ?? false,
    [enableDocumentUploadProp, data.annotations?.embedConfig?.enableDocumentUpload],
  );

  const footerStyles = useMemo(
    () => ({
      ...chatbot?.footer?.style,
      borderTopColor: chatbot?.borderColor,
    }),
    [chatbot],
  );

  const contentStyles = useMemo(() => ({ maxWidth: chatbot?.contentMaxWidth ?? '1200px' }), [chatbot?.contentMaxWidth]);

  return (
    <div ref={footerRef} className={clsx('asgard-chatbot-footer', styles.chatbot_footer)} style={footerStyles}>
      {/* Thread↔input seam: the run-in-progress indicator, bound to the whole connection (F-003) —
          minus the rejoin transcript replay, which is loading history rather than generating (F-023
          AC9 / UC-046), hence `isRunning` rather than the broader `isConnecting`.
          The Subagent (F-012) / Task (F-010) live-state panels sit immediately above this seam, in
          ChatbotBody's fixed docked strip (outside the thread's scroll box). */}
      <RunningIndicator running={isRunning} />

      <div className={styles.chatbot_footer__content} style={contentStyles}>
        {renderComposerAbove?.()}
        <ChatComposer
          enableUpload={enableUpload}
          enableDocumentUpload={enableDocumentUpload}
          footerRef={footerRef}
          renderComposerInline={renderComposerInline}
          footerEndActions={footerEndActions}
        />
      </div>
    </div>
  );
}
