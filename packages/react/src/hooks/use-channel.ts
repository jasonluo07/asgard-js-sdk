import {
  AsgardServiceClient,
  Channel,
  ChannelStates,
  Conversation,
  ConversationMessage,
  EventType,
  SseResponse,
} from '@asgard-js/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

  const resetChannel = useCallback(() => {
    setIsResetting(true);

    client?.resetChannel(
      { customChannelId, customMessageId },
      {
        onSseCompleted: () => {
          setIsResetting(false);

          setChannel(() => {
            const conversation = new Conversation({
              showDebugMessage,
              messages: new Map(
                initMessages?.map((message) => [message.messageId, message])
              ),
            });

            const newChannel = new Channel({
              client,
              customChannelId,
              conversation,
              statesObserver: (states: ChannelStates): void => {
                setIsConnecting(states.isConnecting);
                setConversation(states.conversation);
              },
            });

            setIsOpen(true);
            setIsConnecting(false);
            setConversation(conversation);

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
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      channel?.sendMessage({ text });
    },
    [channel]
  );

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
