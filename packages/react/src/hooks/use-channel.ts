import {
  AsgardServiceClient,
  Channel,
  Conversation,
  ConversationMessage,
  EventType,
  SseResponse,
  Subscription,
} from '@asgard-js/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseChannelProps {
  client: AsgardServiceClient | null;
  customChannelId: string;
  customMessageId?: string;
  initMessages?: ConversationMessage[];
  showDebugMessage?: boolean;
  onResetChannelInit?: (event: SseResponse<EventType.INIT>) => void;
}

export interface UseChannelReturn {
  isOpen: boolean;
  isResetting: boolean;
  isConnecting: boolean;
  conversation: Conversation | null;
  sendMessage?: (text: string) => void;
  resetChannel?: () => void;
  closeChannel?: () => void;
}

export function useChannel(props: UseChannelProps): UseChannelReturn {
  const {
    client,
    customChannelId,
    customMessageId,
    initMessages,
    showDebugMessage,
  } = props;

  if (!client) {
    throw new Error('Client instance is required');
  }

  if (!customChannelId) {
    throw new Error('Custom channel id is required');
  }

  const [channel, setChannel] = useState<Channel | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const subscriptionsRef = useRef<Subscription[] | null>(null);

  const resetChannel = useCallback(() => {
    setIsResetting(true);

    client?.resetChannel(
      { customChannelId, customMessageId },
      {
        onSseCompleted: () => {
          setIsResetting(false);

          setChannel(() => {
            const newChannel = new Channel({
              client,
              customChannelId,
              conversation: new Conversation({
                showDebugMessage,
                messages: new Map(
                  initMessages?.map((message) => [message.messageId, message])
                ),
              }),
            });

            setIsOpen(true);
            setIsConnecting(newChannel.isConnecting$.value);
            setConversation(newChannel.conversation$.value);

            return newChannel;
          });
        },
      }
    );
  }, [
    client,
    customChannelId,
    customMessageId,
    initMessages,
    showDebugMessage,
  ]);

  const closeChannel = useCallback(() => {
    setChannel((prevChannel) => {
      prevChannel?.close();

      return null;
    });
    setIsOpen(false);
    setIsResetting(false);
    setIsConnecting(false);
    setConversation(null);
    subscriptionsRef.current?.forEach((subscription) =>
      subscription.unsubscribe()
    );
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      channel?.sendMessage({ text });
    },
    [channel]
  );

  useEffect(() => {
    if (!channel) return;

    subscriptionsRef.current = [
      channel?.isConnecting$.subscribe(setIsConnecting),
      channel?.conversation$.subscribe(setConversation),
    ];

    return (): void => {
      subscriptionsRef.current?.forEach((subscription) =>
        subscription.unsubscribe()
      );
    };
  }, [channel]);

  useEffect(() => {
    if (!channel && isOpen) resetChannel();
  }, [channel, isOpen, resetChannel]);

  useEffect(() => {
    return (): void => closeChannel();
  }, [closeChannel]);

  return useMemo(
    () => ({
      isOpen,
      isResetting,
      isConnecting,
      conversation,
      sendMessage,
      resetChannel,
      closeChannel,
    }),
    [
      isOpen,
      isResetting,
      isConnecting,
      conversation,
      sendMessage,
      resetChannel,
      closeChannel,
    ]
  );
}
