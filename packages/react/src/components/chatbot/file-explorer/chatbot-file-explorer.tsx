import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { ConversationMessage, resolveSandboxUri } from '@asgard-js/core';
import { useAsgardContext } from '../../../context/asgard-service-context';
import { useLaunchedSandboxes } from '../../../hooks/use-derived-state';
import { FileExplorerController } from '../../../hooks/use-file-explorer-controller';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { t } from '../../../i18n';
import { FileExplorerPanel } from './file-explorer-panel';
import { createSandboxFsProviders } from './create-sandbox-fs-providers';
import { FolderTreeIcon } from './icons';
import styles from './chatbot-file-explorer.module.scss';

/**
 * Collect every `uri` action string carried by a bot message's template (F-021 AC9 arrival scan). Covers
 * the attachment chip (default / download action) and the button / carousel card actions — the same
 * surfaces `dispatchUriAction` handles on click.
 */
function collectUris(message: ConversationMessage): string[] {
  if (message.type !== 'bot') return [];

  const template = message.message.template as
    | {
        type?: string;
        attachments?: Array<{ defaultAction?: unknown; downloadAction?: unknown }>;
        buttons?: Array<{ action?: unknown }>;
        columns?: Array<{ buttons?: Array<{ action?: unknown }> }>;
      }
    | undefined;
  if (!template) return [];

  const uris: string[] = [];
  const pushAction = (action: unknown): void => {
    if (
      action &&
      typeof action === 'object' &&
      'uri' in action &&
      typeof (action as { uri: unknown }).uri === 'string'
    ) {
      uris.push((action as { uri: string }).uri);
    }
  };

  template.attachments?.forEach(a => {
    pushAction(a.defaultAction);
    pushAction(a.downloadAction);
  });
  template.buttons?.forEach(b => pushAction(b.action));
  template.columns?.forEach(c => c.buttons?.forEach(b => pushAction(b.action)));

  return uris;
}

/**
 * Arrival-side of the open-file intent (F-021 AC9, notify-not-force): scan the conversation for `open-file`
 * `sandbox://` cards and fire `onIntent` once per (message, uri) — on arrival, without a click. Renders
 * nothing. Must live inside the service context (reads `conversation`).
 */
export function FileExplorerArrivalBridge({
  onIntent,
}: {
  onIntent: (sandboxName: string, absolutePath: string) => void;
}): ReactNode {
  const { conversation } = useAsgardContext();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const messages = conversation?.messages;
    if (!messages) return;

    for (const message of messages.values()) {
      for (const uri of collectUris(message)) {
        const intent = resolveSandboxUri(uri);
        if (intent?.kind !== 'open-file') continue;

        const key = `${message.messageId}:${uri}`;
        if (seen.current.has(key)) continue;

        seen.current.add(key);
        onIntent(intent.sandboxName, intent.absolutePath);
      }
    }
  }, [conversation, onIntent]);

  return null;
}

/** Header folder toggle (F-021 AC6) — sits right of the ChannelTitle; toggles the built-in aside. */
export function FileExplorerToggle({ controller }: { controller: FileExplorerController }): ReactNode {
  const { locale = 'en-US' } = useAsgardTemplateContext();

  return (
    <button
      type="button"
      className={`${styles.toggle} ${controller.open ? styles.toggleActive : ''}`}
      onClick={controller.toggle}
      aria-label={t(locale, 'header.fileExplorer')}
      aria-pressed={controller.open}
      title={t(locale, 'header.fileExplorer')}
    >
      <FolderTreeIcon size={18} />
    </button>
  );
}

/**
 * The built-in File Explorer aside (F-021 AC6). Reads the live channel + client from context, drives the
 * panel from `launchedSandboxes$` (F-019) and the shared controller, and wires the core fs client.
 */
export function ChatbotFileExplorerAside({
  controller,
  basePath,
}: {
  controller: FileExplorerController;
  basePath?: string;
}): ReactNode {
  const { client, channel, nudge, isRunning, pendingConsent } = useAsgardContext();
  const sandboxes = useLaunchedSandboxes(channel);
  // A sandbox whose fs calls keep failing is dropped from the dropdown (AC5); metadata stays authoritative.
  const providers = useMemo(
    () =>
      client ? createSandboxFsProviders(client, { onSandboxUnreachable: name => channel?.dropSandbox(name) }) : null,
    [client, channel],
  );

  if (!providers) return null;

  return (
    <FileExplorerPanel
      sandboxes={sandboxes}
      controller={controller}
      listDir={providers.listDir}
      readFile={providers.readFile}
      saveFile={providers.saveFile}
      watchFile={providers.watchFile}
      mkdir={providers.mkdir}
      remove={providers.remove}
      copy={providers.copy}
      move={providers.move}
      upload={providers.upload}
      download={providers.download}
      onNudge={nudge}
      // A nudge is a turn, so the channel refuses one while a run holds it (F-023 AC6) — and this
      // empty state is on screen during exactly that window, between the send and the sandbox coming up.
      // #409 — core refuses a nudge while a consent prompt is pending (#407), and `isRunning` is false
      // by then (the consent frame precedes the run terminal), so it alone leaves the button live.
      nudgeDisabled={isRunning || pendingConsent !== null}
      onClose={controller.closeExplorer}
      chrome="flush"
      basePath={basePath}
    />
  );
}
