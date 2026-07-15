import {
  AsgardServiceClient,
  Channel,
  ChannelMetadata,
  ChannelStates,
  Conversation,
  ConversationMessage,
  EventType,
  FetchSsePayload,
  SseResponse,
  ToolCallConsentAnswer,
} from '@asgard-js/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UseChannelProps {
  defaultIsOpen?: boolean;
  resetPayload?: Pick<FetchSsePayload, 'text'> & Partial<Pick<FetchSsePayload, 'payload'>>;
  client: AsgardServiceClient | null;
  customChannelId: string;
  customMessageId?: string;
  initMessages?: ConversationMessage[];
  /** Seed for the channel title store (F-016) — e.g. from `GET /channel/metadata` (wired by F-015). */
  channelTitle?: string | null;
  autoResetChannel?: boolean;
  onSseMessage?: (
    response: SseResponse<EventType>,
    context: {
      conversation: Conversation | null;
    },
  ) => void;
  onAuthError?: (error: { isAuthError: boolean; isBotProviderError: boolean; errorDetail?: unknown }) => void;
  onSseError?: (error: unknown) => void;
  onBeforeSendMessage?: (params: {
    text: string;
    payload?: Record<string, unknown> | (() => Record<string, unknown>);
  }) => { text: string; payload?: Record<string, unknown> | (() => Record<string, unknown>) };
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
}

export interface UseChannelReturn {
  isOpen: boolean;
  isResetting: boolean;
  isConnecting: boolean;
  conversation: Conversation | null;
  /** Current channel title (F-016) — seeded from metadata + updated by `title.update`. `null` = unnamed. */
  channelTitle: string | null;
  sendMessage?: (
    payload: Pick<FetchSsePayload, 'text' | 'blobIds'> &
      Partial<Pick<FetchSsePayload, 'payload'>> & { filePreviewUrls?: string[]; documentNames?: string[] },
  ) => Promise<void>;
  resetChannel?: (payload?: Pick<FetchSsePayload, 'text'> & Partial<Pick<FetchSsePayload, 'payload'>>) => void;
  closeChannel?: () => void;
  replyToolCallConsents?: (answers: ToolCallConsentAnswer[], payload?: FetchSsePayload['payload']) => Promise<void>;
}

export function useChannel(props: UseChannelProps): UseChannelReturn {
  const {
    client,
    defaultIsOpen,
    resetPayload,
    customChannelId,
    customMessageId,
    initMessages,
    channelTitle: channelTitleSeed,
    autoResetChannel,
    onSseMessage,
    onAuthError,
    onSseError,
    onBeforeSendMessage,
    onChannelReady,
  } = props;

  // Preview mode: client is null (when botProviderEndpoint is 'skip')
  const isPreviewMode = !client;

  const [channel, setChannel] = useState<Channel | null>(null);
  const [isOpen, setIsOpen] = useState(defaultIsOpen ?? true);
  const [isResetting, setIsResetting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [channelTitle, setChannelTitle] = useState<string | null>(channelTitleSeed ?? null);

  // Preview mode: static conversation from initMessages
  const previewConversation = useMemo(
    () => (isPreviewMode ? new Conversation({ messages: new Map(initMessages?.map(m => [m.messageId, m])) }) : null),
    [isPreviewMode, initMessages],
  );

  const resetChannel = useCallback(
    async (payload?: Pick<FetchSsePayload, 'text'> & Partial<Pick<FetchSsePayload, 'payload'>>) => {
      if (isPreviewMode || !client) return;

      const conversation = new Conversation({
        messages: new Map(initMessages?.map(message => [message.messageId, message])),
      });

      setIsResetting(true);
      setIsConnecting(true);
      setConversation(conversation);

      const resolvedPayload = onBeforeSendMessage
        ? onBeforeSendMessage({ text: payload?.text ?? '', payload: payload?.payload })
        : payload;

      const channel = await Channel.reset(
        {
          client,
          customChannelId,
          customMessageId,
          conversation,
          channelTitle: channelTitleSeed,
          statesObserver: (states: ChannelStates): void => {
            setIsConnecting(states.isConnecting);
            setConversation(states.conversation);
            setChannelTitle(states.channelTitle);
          },
        },
        resolvedPayload,
        {
          onSseCompleted() {
            setIsResetting(false);
          },
          onSseError(error) {
            setIsResetting(false);
            // The channel was adopted early (see onChannelCreated below). Reset
            // failed and Channel.reset will close it, so drop it from state —
            // otherwise later sends no-op against a dead channel and the
            // `!channel && isOpen` reset-retry effect can never re-fire.
            setChannel(null);
            // Handle authentication and bot provider errors
            if (error && typeof error === 'object' && ('isAuthError' in error || 'isBotProviderError' in error)) {
              onAuthError?.(
                error as {
                  isAuthError: boolean;
                  isBotProviderError: boolean;
                  errorDetail?: unknown;
                },
              );
            }

            onSseError?.(error);
          },
          onSseMessage(response: SseResponse<EventType>) {
            onSseMessage?.(response, {
              conversation,
            });
          },
        },
        // Adopt the channel as soon as it exists — before the RESET_CHANNEL run
        // completes — so a tool_call.consent emitted during reset can be replied
        // to (otherwise `channel` is still null and the reply is dropped).
        setChannel,
      );

      setIsOpen(true);
      setChannel(channel);
    },
    [
      isPreviewMode,
      client,
      customChannelId,
      customMessageId,
      initMessages,
      channelTitleSeed,
      onSseMessage,
      onAuthError,
      onSseError,
      onBeforeSendMessage,
    ],
  );

  const initChannel = useCallback(() => {
    if (isPreviewMode || !client) return;

    const conversation = new Conversation({
      messages: new Map(initMessages?.map(message => [message.messageId, message])),
    });

    setConversation(conversation);

    const channel = Channel.create({
      client,
      customChannelId,
      customMessageId,
      conversation,
      channelTitle: channelTitleSeed,
      statesObserver: (states: ChannelStates): void => {
        setIsConnecting(states.isConnecting);
        setConversation(states.conversation);
        setChannelTitle(states.channelTitle);
      },
    });

    setIsOpen(true);
    setChannel(channel);
  }, [isPreviewMode, client, customChannelId, customMessageId, initMessages, channelTitleSeed]);

  // F-015 — join an existing channel: replay the server transcript (F-014) and seed the title from
  // metadata (F-016) without ever sending RESET_CHANNEL. `titleSeed` comes from `GET /channel/metadata`.
  // The live restore path uses the server transcript as the single source of truth, so it does NOT seed
  // from `initMessages` (which stays preview/offline-only — see the preview branch above).
  const restoreChannel = useCallback(
    async (titleSeed: string | null): Promise<void> => {
      if (isPreviewMode || !client) return;

      const conversation = new Conversation({ messages: new Map() });

      setIsConnecting(true);
      setConversation(conversation);
      setChannelTitle(titleSeed);

      try {
        const channel = await Channel.restore(
          {
            client,
            customChannelId,
            customMessageId,
            conversation,
            channelTitle: titleSeed,
            statesObserver: (states: ChannelStates): void => {
              setIsConnecting(states.isConnecting);
              setConversation(states.conversation);
              setChannelTitle(states.channelTitle);
            },
          },
          {
            onSseError(error) {
              // Restore connection failed. Drop the channel so the mount effect can re-evaluate, and
              // surface the error — never fall back to a reset (that would wipe the channel we restored).
              setChannel(null);
              if (error && typeof error === 'object' && ('isAuthError' in error || 'isBotProviderError' in error)) {
                onAuthError?.(
                  error as {
                    isAuthError: boolean;
                    isBotProviderError: boolean;
                    errorDetail?: unknown;
                  },
                );
              }

              onSseError?.(error);
            },
            onSseMessage(response: SseResponse<EventType>) {
              onSseMessage?.(response, {
                conversation,
              });
            },
          },
          // Adopt the channel before the replay finishes — a RUNNING restore can emit a tool_call.consent
          // before its terminal, and a reply submitted then must reach a non-null channel.
          setChannel,
        );

        setIsOpen(true);
        setChannel(channel);
      } catch {
        // Channel.restore rethrows after onSseError already handled and dropped the channel; nothing left
        // to do here (kept out of the unhandled-rejection path).
      }
    },
    [isPreviewMode, client, customChannelId, customMessageId, onSseMessage, onAuthError, onSseError],
  );

  const closeChannel = useCallback(() => {
    setChannel((prevChannel: Channel | null) => {
      prevChannel?.close();

      return null;
    });
    setIsOpen(false);
    setIsResetting(false);
    setIsConnecting(false);
    setConversation(null);
  }, []);

  const sendMessage = useCallback(
    async (
      payload: Pick<FetchSsePayload, 'text' | 'blobIds'> &
        Partial<Pick<FetchSsePayload, 'payload'>> & {
          filePreviewUrls?: string[];
          documentNames?: string[];
        },
    ): Promise<void> => {
      await channel?.sendMessage(
        { ...payload, customMessageId },
        {
          onSseMessage(response: SseResponse<EventType>) {
            onSseMessage?.(response, {
              conversation,
            });
          },
          onSseError(error) {
            if (error && typeof error === 'object' && ('isAuthError' in error || 'isBotProviderError' in error)) {
              onAuthError?.(
                error as {
                  isAuthError: boolean;
                  isBotProviderError: boolean;
                  errorDetail?: unknown;
                },
              );
            }

            onSseError?.(error);
          },
        },
      );
    },
    [channel, customMessageId, onSseMessage, onAuthError, onSseError, conversation],
  );

  const replyToolCallConsents = useCallback(
    async (answers: ToolCallConsentAnswer[], payload?: FetchSsePayload['payload']): Promise<void> => {
      if (client?.debugMode) {
        // eslint-disable-next-line no-console
        console.log(
          `[consent] use-channel.replyToolCallConsents · channel=${channel ? 'SET' : 'NULL ← reply 會被丟掉!'}`,
        );
      }

      await channel?.replyToolCallConsents(
        answers,
        {
          onSseMessage(response: SseResponse<EventType>) {
            onSseMessage?.(response, {
              conversation,
            });
          },
        },
        payload,
      );
    },
    [channel, client, onSseMessage, conversation],
  );

  // F-015 — metadata-gated join-init. On mount, gate on `GET /channel/metadata` instead of unconditionally
  // resetting: an existing channel is always restored (never reset → no history loss); a non-existent one
  // follows `autoResetChannel`. The old "mount always resets" semantics are gone.
  useEffect(() => {
    if (isPreviewMode || !client) return;

    if (channel || !isOpen) return;

    // A client without the metadata gate (a custom IAsgardServiceClient) keeps the pre-F-015 behavior:
    // branch on autoResetChannel with no existence check.
    if (!client.channelMetadata) {
      if (autoResetChannel !== false) {
        resetChannel(resetPayload);
      } else {
        initChannel();
      }

      return;
    }

    const getMetadata = client.channelMetadata.bind(client);
    let cancelled = false;

    void (async (): Promise<void> => {
      let metadata: ChannelMetadata | null;

      try {
        metadata = await getMetadata(customChannelId);
      } catch (error) {
        // R6 — indeterminate result (network / 5xx). Never reset on an unknown existence (that would
        // wipe a channel that may exist); settle into an empty, input-enabled state and surface the error.
        if (cancelled) return;

        onSseError?.(error);
        initChannel();

        return;
      }

      if (cancelled) return;

      if (metadata) {
        // R2 — channel exists: always restore, seed the title from metadata, never RESET_CHANNEL.
        restoreChannel(metadata.title);
      } else if (autoResetChannel !== false) {
        // R3 — not exists + auto-reset (default): open via RESET_CHANNEL.
        resetChannel(resetPayload);
      } else {
        // R4 — not exists + no auto-reset: stay empty; the first user send starts it with action=NONE.
        initChannel();
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, [
    isPreviewMode,
    client,
    channel,
    isOpen,
    customChannelId,
    autoResetChannel,
    restoreChannel,
    resetChannel,
    initChannel,
    resetPayload,
    onSseError,
  ]);

  const prevChannelRef = useRef<Channel | null>(null);
  useEffect(() => {
    if (channel && channel !== prevChannelRef.current) {
      prevChannelRef.current = channel;
      onChannelReady?.();
    } else if (!channel) {
      prevChannelRef.current = null;
    }
  }, [channel, onChannelReady]);

  useEffect(() => {
    return (): void => closeChannel();
  }, [closeChannel]);

  return useMemo(
    () =>
      isPreviewMode
        ? {
            isOpen: true,
            isResetting: false,
            isConnecting: false,
            conversation: previewConversation,
            channelTitle: channelTitleSeed ?? null,
          }
        : {
            isOpen,
            isResetting,
            isConnecting,
            conversation,
            channelTitle,
            sendMessage,
            resetChannel,
            closeChannel,
            replyToolCallConsents,
          },
    [
      isPreviewMode,
      previewConversation,
      isOpen,
      isResetting,
      isConnecting,
      conversation,
      channelTitle,
      channelTitleSeed,
      sendMessage,
      resetChannel,
      closeChannel,
      replyToolCallConsents,
    ],
  );
}
