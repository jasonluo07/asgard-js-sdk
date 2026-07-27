import { CSSProperties, KeyboardEvent, MouseEvent, ReactNode, useCallback, useMemo } from 'react';
import { ButtonAction, resolveSandboxUri } from '@asgard-js/core';
import DocumentSvg from '../../../icons/document.svg?react';
import DownloadSvg from '../../../icons/download.svg?react';
import GlobeSvg from '../../../icons/globe.svg?react';
import { useAsgardContext } from '../../../context/asgard-service-context';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { isChannelHomeUri } from '../../../utils/channel-home-download';
import { dispatchUriAction } from '../../../utils/dispatch-uri-action';
import styles from './attachment-template.module.scss';

interface AttachmentChipProps {
  title: string;
  text: string;
  defaultAction: ButtonAction;
  downloadAction?: ButtonAction;
  raw: string;
  customStyle?: {
    style?: CSSProperties;
    title?: { style?: CSSProperties };
    description?: { style?: CSSProperties };
    iconBox?: { style?: CSSProperties };
    downloadButton?: { style?: CSSProperties };
  };
}

export function AttachmentChip(props: AttachmentChipProps): ReactNode {
  const { title, text, defaultAction, downloadAction, raw, customStyle } = props;

  const { sendMessage, client, customChannelId } = useAsgardContext();
  const { onTemplateBtnClick, defaultLinkTarget, onSandboxOpenBrowser, onSandboxOpenFile, sandboxBrowserOpenTarget } =
    useAsgardTemplateContext();

  const dispatchAction = useCallback(
    (action: ButtonAction): void => {
      switch (action.type) {
        case 'message':
        case 'MESSAGE':
          sendMessage?.({ text: action.text });

          return;
        case 'uri':
        case 'URI':
          dispatchUriAction(action.uri, {
            client,
            customChannelId,
            target: action.target,
            defaultLinkTarget,
            onSandboxOpenBrowser,
            onSandboxOpenFile,
            sandboxBrowserOpenTarget,
          });

          return;
        case 'emit':
        case 'EMIT':
          if (onTemplateBtnClick) {
            onTemplateBtnClick(action.payload || {}, action.eventName || '', raw);
          }

          return;
      }
    },
    [
      sendMessage,
      onTemplateBtnClick,
      defaultLinkTarget,
      raw,
      client,
      customChannelId,
      onSandboxOpenBrowser,
      onSandboxOpenFile,
      sandboxBrowserOpenTarget,
    ],
  );

  const handleChipClick = useCallback(() => {
    dispatchAction(defaultAction);
  }, [dispatchAction, defaultAction]);

  // Keyboard activation on the outer chip — outer is a div+role=button so React
  // doesn't fire click for Space/Enter automatically; handle both manually.
  const handleChipKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        dispatchAction(defaultAction);
      }
    },
    [dispatchAction, defaultAction],
  );

  const handleDownloadClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (downloadAction) {
        dispatchAction(downloadAction);
      }
    },
    [dispatchAction, downloadAction],
  );

  // The glyph follows the action, not the template type (BUILD-029): a chip that opens the sandbox browser
  // gets a globe, everything else keeps the file glyph. Same resolver `dispatchUriAction` routes on, so the
  // icon and the side effect can never disagree.
  const isOpenBrowser = useMemo(() => {
    if (defaultAction.type !== 'uri' && defaultAction.type !== 'URI') return false;

    return resolveSandboxUri(defaultAction.uri)?.kind === 'open-browser';
  }, [defaultAction]);

  const isDownloadEmit =
    (downloadAction?.type === 'emit' || downloadAction?.type === 'EMIT') &&
    downloadAction.eventName === 'download_file';
  const isDownloadChannelHome =
    (downloadAction?.type === 'uri' || downloadAction?.type === 'URI') && isChannelHomeUri(downloadAction.uri);
  const showDownloadIcon = isDownloadEmit || isDownloadChannelHome;

  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.chip}
      onClick={handleChipClick}
      onKeyDown={handleChipKeyDown}
      style={customStyle?.style}
    >
      <span className={styles.icon_box} style={customStyle?.iconBox?.style}>
        {isOpenBrowser ? <GlobeSvg /> : <DocumentSvg />}
      </span>
      <span className={styles.body}>
        <span className={styles.title} style={customStyle?.title?.style}>
          {title}
        </span>
        <span className={styles.text} style={customStyle?.description?.style}>
          {text}
        </span>
      </span>
      {showDownloadIcon && (
        <button
          type="button"
          className={styles.download_button}
          onClick={handleDownloadClick}
          aria-label="Download"
          style={customStyle?.downloadButton?.style}
        >
          <DownloadSvg />
        </button>
      )}
    </div>
  );
}
