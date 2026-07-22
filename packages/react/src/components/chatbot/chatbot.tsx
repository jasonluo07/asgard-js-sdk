import {
  forwardRef,
  ForwardedRef,
  MutableRefObject,
  ReactNode,
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { ClientConfig, ConversationMessage } from '@asgard-js/core';
import { AsgardThemeContextProvider, AsgardThemeContextValue } from '../../context/asgard-theme-context';
import {
  AsgardServiceContextProvider,
  AsgardServiceContextValue,
  AsgardTemplateContextProvider,
  AsgardTemplateContextValue,
  AsgardAppInitializationContextProvider,
  AsgardServiceContextProviderProps,
  FileDropContextProvider,
  useFileDropContext,
  SendMessageParams,
} from '../../context';
import { AuthState } from '@asgard-js/core';
import clsx from 'clsx';
import { ApiKeyInput } from './api-key-input';
import { ChatbotHeader } from './chatbot-header';
import { ChannelTitle } from './channel-title';
import { ChatbotBody } from './chatbot-body';
import { ChatbotFooter } from './chatbot-footer';
import { ChatbotContainer } from './chatbot-container/chatbot-container';
import { ServiceErrorState } from './service-error-state';
import { DropZoneOverlay } from './drop-zone-overlay/drop-zone-overlay';
import { SandboxLaunchHud } from './sandbox-launch-hud';
import {
  ChatbotFileExplorerAside,
  FileExplorerArrivalBridge,
  FileExplorerToggle,
} from './file-explorer/chatbot-file-explorer';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { ToolCallConsentGate } from '../tool-call-consent';
import styles from './chatbot.module.scss';

interface ChatbotProps extends AsgardTemplateContextValue {
  className?: string;
  style?: CSSProperties;
  title?: string;
  customActions?: ReactNode[];
  theme?: Partial<AsgardThemeContextValue>;
  config: ClientConfig;
  customChannelId: string;
  initMessages?: ConversationMessage[];
  /** Seed for the channel-title store (F-016) — e.g. from `GET /channel/metadata` (wired by F-015). `null` = unnamed. */
  channelTitle?: string | null;
  onSseMessage?: AsgardServiceContextProviderProps['onSseMessage'];
  fullScreen?: boolean;
  avatar?: string;
  /**
   * @deprecated Since F-003 the run-in-progress cue is a connection-bound indicator at the
   * thread↔input seam (see `RunningIndicator`), not a per-message typing placeholder. This prop no
   * longer renders anything and will be removed in a future major.
   */
  botTypingPlaceholder?: string;
  inputPlaceholder?: string;
  enableLoadConfigFromService?: boolean;
  enableUpload?: boolean;
  enableExport?: boolean;
  enableDocumentUpload?: boolean;
  /**
   * Restrict which image MIME types can be uploaded when `enableUpload` is on.
   * When provided, it overrides the default list entirely — the values are used
   * as-is for both the file picker `accept` and validation (you may include
   * types outside the SDK's default list). When omitted, all default image
   * types are accepted.
   */
  allowedImageMimeTypes?: string[];
  /**
   * Restrict which document MIME types can be uploaded when
   * `enableDocumentUpload` is on. When provided, it overrides the default list
   * entirely — the values are used as-is for both the file picker `accept` and
   * validation (you may include types outside the SDK's default list). When
   * omitted, all default document types are accepted.
   */
  allowedDocumentMimeTypes?: string[];
  maintainConnectionWhenClosed?: boolean;
  asyncInitializers?: Record<string, () => Promise<unknown>>;
  onReset?: () => void;
  onClose?: () => void;
  loadingComponent?: ReactNode;
  defaultLinkTarget?: '_blank' | '_self' | '_parent' | '_top';

  /** Host override for a `sandbox://<name>/open-browser` card (F-020); if set the SDK defers to it. */
  onSandboxOpenBrowser?: (sandboxName: string) => void;
  /** Host handler for a `sandbox://<name>/open-file` card (F-020) — the File Explorer destination (F-021). */
  onSandboxOpenFile?: (sandboxName: string, absolutePath: string) => void;
  /** Where the default open-browser handler opens the one-time URL (F-020). Defaults to `_blank`. */
  sandboxBrowserOpenTarget?: '_blank' | '_self' | '_parent' | '_top';

  /**
   * Built-in File Explorer side panel (F-021). `'builtin'` renders a header folder toggle + a right-side
   * aside; `'off'` (default) renders nothing built-in — the consumer places the exported `<FileExplorerPanel>`
   * itself. Either way an `open-file` card hits the panel via the shared controller.
   */
  fileExplorer?: 'builtin' | 'off';
  /** Whether an arriving `open-file` card auto-reveals the built-in aside (F-021 AC9). Defaults to true; a mid-edit dirty file suppresses the yank (AC10). */
  autoRevealOnOpenFileCard?: boolean;
  /** Override the File Explorer tree root (absolute path) instead of the sandbox `workingDirectory` (F-021 AC2). */
  fileExplorerBasePath?: string;

  // Auth state props
  authState?: AuthState;
  onApiKeySubmit?: (apiKey: string) => Promise<void>;
  onAuthError?: (error: { isAuthError: boolean; isBotProviderError: boolean; errorDetail?: unknown }) => void;

  /** Callback fired when SSE connection encounters an error */
  onSseError?: (error: unknown) => void;

  /**
   * Callback to modify outbound params before they hit the wire. Fires for
   * both regular `sendMessage` and tool-call consent reply (Allow / Deny on
   * the consent modal). For consent reply, `params.text` is always `''` and
   * `params.blobIds` is `undefined` — only the resulting `payload` is
   * forwarded; `text` / `blobIds` from the return are dropped on that path.
   */
  onBeforeSendMessage?: (params: SendMessageParams) => SendMessageParams;

  /** Callback fired after a message has been sent */
  onMessageSent?: () => void;

  /**
   * Fired once the chat channel is ready to accept messages. Triggered after
   * the underlying Channel instance is created and the imperative ref has
   * been updated, which guarantees calling
   * `ref.current.serviceContext.sendMessage` from inside the callback works.
   *
   * Re-fires when the channel is replaced (e.g. after `resetChannel`). Use a
   * guard ref in the consumer if the work should only happen once.
   */
  onChannelReady?: () => void;

  /**
   * Custom header renderer. When provided, replaces the default `<ChatbotHeader />`
   * entirely — `title`, `onReset`, `onClose`, `customActions`, and
   * `maintainConnectionWhenClosed` are no longer applied automatically; the
   * renderer owns the header area in full.
   *
   * Use `useAsgardContext()` inside the renderer to access runtime state
   * (`resetChannel`, `isResetting`, `avatar`, `title`, etc.) and
   * `useAsgardThemeContext()` for theme tokens.
   */
  renderHeader?: () => ReactNode;

  /** Custom menu renderer. When provided, renders between chat body and footer. */
  renderMenu?: () => ReactNode;

  /**
   * When true, the built-in docked SubagentList / TaskList inside the thread are not rendered, letting
   * the consumer place the run-chrome itself (e.g. pinned above the composer via `renderMenu`), derived
   * from the same conversation with `deriveTasks` / `deriveSubagents`. Defaults to false.
   */
  hideRunChrome?: boolean;

  /**
   * Extra action nodes rendered at the end of the footer input row, after the
   * send/mic button. Pure additive slot — built-in textarea / attachment
   * buttons / send / mic remain unchanged. Use it to add buttons such as
   * "open SQL editor modal", "switch input mode", etc.
   */
  footerEndActions?: ReactNode[];

  /**
   * Custom footer renderer. When provided, replaces the default `<ChatbotFooter />`
   * entirely. The built-in textarea, send / mic button, image upload, document
   * upload, export, IME composition guard, and `footerEndActions` are **not**
   * rendered — the renderer fully owns the footer area.
   *
   * The container-level drag-and-drop overlay (`<DropZoneOverlay />`) still
   * appears when `enableUpload` or `enableDocumentUpload` is set, but the
   * default consumption path (textarea-side handling) is gone. If your custom
   * footer wants to react to dropped files, read them from
   * `useFileDropContext()`.
   *
   * Use `useAsgardContext()` inside the renderer to access:
   * - `sendMessage(params)` — submit a message (undefined in preview mode)
   * - `isConnecting` — disable send while the channel is busy
   * - `pendingInputValue` / `setPendingInputValue` — receive values pushed in
   *   via `ChatbotRef.setInputValue` or `renderMenu` selection, then clear them
   * - `inputPlaceholder`, `title`, `avatar`, `messages`, etc.
   *
   * Use `useAsgardThemeContext()` for theme tokens to stay visually consistent
   * with the rest of the chatbot.
   */
  renderFooter?: () => ReactNode;

  /** Custom renderer for tool call group. Return null to hide, or return custom JSX. */
  renderToolCallGroup?: AsgardTemplateContextValue['renderToolCallGroup'];

  /** Whether to automatically reset channel on mount. Defaults to true. When false, the channel is created without sending RESET_CHANNEL, allowing history messages to be preserved via initMessages. */
  autoResetChannel?: boolean;

  /**
   * When true, the in-flight SSE run is kept alive when the chatbot unmounts
   * (e.g. the user navigates to another in-app page) instead of being aborted,
   * so that round can finish on the backend. The detached connection cleans
   * itself up once the run completes, or after a safety timeout if the run
   * never finishes. Defaults to false — other SDK consumers are unaffected.
   *
   * Note: this only covers in-app unmounts. A full page reload / tab close /
   * network loss still tears the connection down, since the page itself is gone.
   */
  keepConnectionOnUnmount?: boolean;

  /** Optional user identity hint. When provided, all requests will include the `X-ASGARD-USER-IDENTITY-HINT` header. */
  userIdentityHint?: string;
}

export interface ChatbotRef {
  serviceContext?: AsgardServiceContextValue;
  /** 字串 → 取代 textarea；`(current) => next` → 依當前草稿更新（例：`c => c ? c + "\n" + t : t` 換行接續）。 */
  setInputValue?: (value: string | ((current: string) => string)) => void;
}

export const Chatbot = forwardRef(function Chatbot(props: ChatbotProps, ref: ForwardedRef<ChatbotRef>): ReactNode {
  const {
    title,
    customActions,
    theme,
    config,
    customChannelId,
    initMessages,
    channelTitle,
    onSseMessage,
    fullScreen = false,
    avatar,
    botTypingPlaceholder,
    inputPlaceholder,
    enableLoadConfigFromService = false,
    enableUpload,
    enableExport,
    enableDocumentUpload,
    allowedImageMimeTypes,
    allowedDocumentMimeTypes,
    maintainConnectionWhenClosed = false,
    asyncInitializers = {},
    loadingComponent,
    onReset,
    onClose,
    locale,
    onTemplateBtnClick,
    onErrorClick,
    errorMessageRenderer,
    messageActions,
    onMessageAction,
    renderMessageContent,
    className,
    style,
    defaultLinkTarget,
    authState = 'authenticated',
    onApiKeySubmit,
    onAuthError,
    onSseError,
    onBeforeSendMessage,
    onMessageSent,
    onChannelReady,
    renderHeader,
    renderMenu,
    hideRunChrome,
    footerEndActions,
    renderFooter,
    renderToolCallGroup,
    renderTitle,
    untitledLabel,
    channelTitleHidden,
    onSandboxOpenBrowser,
    onSandboxOpenFile,
    sandboxBrowserOpenTarget,
    fileExplorer = 'off',
    autoRevealOnOpenFileCard = true,
    fileExplorerBasePath,
    autoResetChannel,
    keepConnectionOnUnmount = false,
    userIdentityHint,
  } = props;

  const effectiveConfig = userIdentityHint ? { ...config, userIdentityHint } : config;

  // F-021 — the shared File Explorer controller (built-in aside + open-file card + a consumer-placed panel
  // all bind this one, so an open-file intent hits the panel regardless of placement).
  const fileExplorerController = useFileExplorerController();
  const builtinFileExplorer = fileExplorer === 'builtin';

  // open-file intent (F-021 AC9, notify-not-force): expose it via the host callback, and — for the built-in
  // aside — reveal the panel unless the user is mid-edit (AC10 guard) and auto-reveal is enabled.
  const handleSandboxOpenFile = useCallback(
    (sandboxName: string, absolutePath: string): void => {
      onSandboxOpenFile?.(sandboxName, absolutePath);

      if (builtinFileExplorer) {
        const reveal = autoRevealOnOpenFileCard && !fileExplorerController.isEditingDirty;
        fileExplorerController.requestFile(sandboxName, absolutePath, { reveal });
      }
    },
    [onSandboxOpenFile, builtinFileExplorer, autoRevealOnOpenFileCard, fileExplorerController],
  );

  const dragCounterRef = useRef(0);
  const fileDropRef = useRef<{
    setDroppedFiles: (files: File[]) => void;
    setIsDraggingOver: (value: boolean) => void;
  } | null>(null);

  const isDropEnabled = enableUpload || enableDocumentUpload;

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDropEnabled || !e.dataTransfer.types.includes('Files')) return;

      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        fileDropRef.current?.setIsDraggingOver(true);
      }
    },
    [isDropEnabled],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      fileDropRef.current?.setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      fileDropRef.current?.setIsDraggingOver(false);

      if (!isDropEnabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        fileDropRef.current?.setDroppedFiles(files);
      }
    },
    [isDropEnabled],
  );

  // Render different content based on authState
  const renderContent = (): React.ReactElement => {
    switch (authState) {
      case 'loading':
        return <div className={styles.chatbot__auth_state_container}>{loadingComponent || <div>Loading...</div>}</div>;

      case 'needApiKey':
        return (
          <div className={styles.chatbot__auth_state_container}>
            <ApiKeyInput
              title={title}
              onSubmit={onApiKeySubmit || ((): Promise<void> => Promise.resolve())}
              placeholder="Enter your key"
            />
          </div>
        );

      case 'invalidApiKey':
        return (
          <div className={styles.chatbot__auth_state_container}>
            <ApiKeyInput
              title={title}
              onSubmit={onApiKeySubmit || ((): Promise<void> => Promise.resolve())}
              placeholder="Enter your key"
              error="Please check if the key is correct."
            />
          </div>
        );

      case 'error':
        return (
          <div className={clsx(styles.chatbot__auth_state_container, styles.chatbot__error_state)}>
            <div className={styles.chatbot__error_state__content}>
              <div className={styles.chatbot__error_state__icon}>
                <span role="img" aria-label="warning">
                  ⚠️
                </span>
              </div>
              <div className={styles.chatbot__error_state__message}>Something went wrong. Please try again later.</div>
            </div>
          </div>
        );

      case 'subscriptionExpired':
        return (
          <div className={styles.chatbot__auth_state_container}>
            <ServiceErrorState
              avatar={avatar}
              message="The service is currently unavailable. Please contact the service representative for assistance."
            />
          </div>
        );

      case 'botNotFound':
        return (
          <div className={styles.chatbot__auth_state_container}>
            <ServiceErrorState
              avatar={avatar}
              message="We couldn't find the service. Please contact the service representative for assistance."
            />
          </div>
        );

      case 'authenticated':
      default:
        return (
          <AsgardTemplateContextProvider
            locale={locale}
            onErrorClick={onErrorClick}
            errorMessageRenderer={errorMessageRenderer}
            onTemplateBtnClick={onTemplateBtnClick}
            defaultLinkTarget={defaultLinkTarget}
            messageActions={messageActions}
            onMessageAction={onMessageAction}
            renderMessageContent={renderMessageContent}
            renderToolCallGroup={renderToolCallGroup}
            renderTitle={renderTitle}
            untitledLabel={untitledLabel}
            channelTitleHidden={channelTitleHidden}
            onSandboxOpenBrowser={onSandboxOpenBrowser}
            onSandboxOpenFile={handleSandboxOpenFile}
            sandboxBrowserOpenTarget={sandboxBrowserOpenTarget}
          >
            {/* Group the channel-title row + scrollable thread into the grid's single `1fr` row, so
                the footer stays pinned regardless of thread height or whether the title renders. The
                title is fixed at the top; the body scrolls internally (its own `flex:1; overflow`).
                F-021 — that row is a flex row so the built-in File Explorer aside sits to the right. */}
            <div className={styles.chatbot__main_row}>
              <div className={styles.chatbot__thread_area}>
                {/* Channel-title row + folder toggle — distinct from the bot-name ChatbotHeader (F-017/F-021). */}
                {builtinFileExplorer ? (
                  <div className={styles.chatbot__title_row}>
                    <ChannelTitle />
                    <span className={styles.chatbot__title_toggle}>
                      <FileExplorerToggle controller={fileExplorerController} />
                    </span>
                  </div>
                ) : (
                  <ChannelTitle />
                )}
                <ChatbotBody hideRunChrome={hideRunChrome} />
              </div>
              {builtinFileExplorer && fileExplorerController.open && (
                <aside className={styles.chatbot__file_explorer_aside}>
                  <ChatbotFileExplorerAside controller={fileExplorerController} basePath={fileExplorerBasePath} />
                </aside>
              )}
            </div>
            {/* F-021 AC9 — fire the open-file intent on card arrival (not only on click). */}
            {builtinFileExplorer && <FileExplorerArrivalBridge onIntent={handleSandboxOpenFile} />}
            {renderMenu?.()}
            {/* Footer must live inside the template provider so its docked TaskList / SubagentList
                panels read `locale` from the context (F-010 / F-012). */}
            {renderFooter ? renderFooter() : <ChatbotFooter footerEndActions={footerEndActions} />}
            <ToolCallConsentGate />
            {/* F-018 — sandbox cold-start HUD. Inside the template provider so it reads `locale` for its
                labels (like the docked panels); position:absolute anchors it to ChatbotContainer
                (position:relative), independent of and able to coexist with RunningIndicator. */}
            <SandboxLaunchHud />
          </AsgardTemplateContextProvider>
        );
    }
  };

  // Don't initialize SSE connection when explicitly needing API key or in error state
  if (
    authState !== 'needApiKey' &&
    authState !== 'error' &&
    authState !== 'invalidApiKey' &&
    authState !== 'subscriptionExpired' &&
    authState !== 'botNotFound'
  ) {
    return (
      <AsgardAppInitializationContextProvider
        enabled={enableLoadConfigFromService}
        config={effectiveConfig}
        asyncInitializers={asyncInitializers}
        loadingComponent={loadingComponent}
      >
        <AsgardThemeContextProvider theme={theme}>
          <AsgardServiceContextProvider
            parentRef={ref}
            avatar={avatar}
            title={title}
            config={effectiveConfig}
            customChannelId={customChannelId}
            initMessages={initMessages}
            channelTitle={channelTitle}
            onSseMessage={onSseMessage}
            onAuthError={onAuthError}
            onSseError={onSseError}
            onBeforeSendMessage={onBeforeSendMessage}
            onMessageSent={onMessageSent}
            onChannelReady={onChannelReady}
            botTypingPlaceholder={botTypingPlaceholder}
            inputPlaceholder={inputPlaceholder}
            enableUpload={enableUpload}
            enableExport={enableExport}
            enableDocumentUpload={enableDocumentUpload}
            allowedImageMimeTypes={allowedImageMimeTypes}
            allowedDocumentMimeTypes={allowedDocumentMimeTypes}
            autoResetChannel={autoResetChannel}
            keepConnectionOnUnmount={keepConnectionOnUnmount}
          >
            <FileDropContextProvider>
              <FileDropRefConnector fileDropRef={fileDropRef} />
              <ChatbotContainer
                fullScreen={fullScreen}
                className={className}
                style={style}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {renderHeader ? (
                  renderHeader()
                ) : (
                  <ChatbotHeader
                    title={title}
                    onReset={onReset}
                    onClose={onClose}
                    customActions={customActions}
                    maintainConnectionWhenClosed={maintainConnectionWhenClosed}
                  />
                )}
                {renderContent()}
                <DropZoneOverlay />
              </ChatbotContainer>
            </FileDropContextProvider>
          </AsgardServiceContextProvider>
        </AsgardThemeContextProvider>
      </AsgardAppInitializationContextProvider>
    );
  }

  // For non-authenticated states, don't use AsgardServiceContextProvider to avoid SSE connection
  return (
    <AsgardThemeContextProvider theme={theme}>
      <ChatbotContainer fullScreen={fullScreen} className={className} style={style}>
        {renderHeader ? (
          renderHeader()
        ) : (
          <ChatbotHeader
            title={title}
            onReset={onReset}
            onClose={onClose}
            customActions={customActions}
            maintainConnectionWhenClosed={maintainConnectionWhenClosed}
          />
        )}
        {renderContent()}
      </ChatbotContainer>
    </AsgardThemeContextProvider>
  );
});

/** Connects FileDropContext to the parent's ref so drag handlers can access context setters */
function FileDropRefConnector({
  fileDropRef,
}: {
  fileDropRef: MutableRefObject<{
    setDroppedFiles: (files: File[]) => void;
    setIsDraggingOver: (value: boolean) => void;
  } | null>;
}): ReactNode {
  const { setDroppedFiles, setIsDraggingOver } = useFileDropContext();

  useEffect(() => {
    fileDropRef.current = { setDroppedFiles, setIsDraggingOver };

    return (): void => {
      fileDropRef.current = null;
    };
  }, [fileDropRef, setDroppedFiles, setIsDraggingOver]);

  return null;
}
