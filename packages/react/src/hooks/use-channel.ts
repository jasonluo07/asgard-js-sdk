import {
  AsgardServiceClient,
  Conversation,
  ConversationMessage,
  EventType,
  SseResponse,
} from '@asgard-js/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseChannelProps {
  client: AsgardServiceClient | null;
  customChannelId: string;
  initMessages?: ConversationMessage[];
  options?: { showDebugMessage?: boolean };
  onResetChannelInit?: (event: SseResponse<EventType.INIT>) => void;
}

export interface UseChannelReturn {
  isConnecting: boolean;
  messages: Map<string, ConversationMessage> | null;
  sendMessage: (text: string, customMessageId?: string) => void;
}

export function useChannel(props: UseChannelProps): UseChannelReturn {
  const { client, customChannelId, initMessages, options } = props;

  if (!client) {
    throw new Error('Client instance is required');
  }

  if (!customChannelId) {
    throw new Error('Custom channel id is required');
  }

  const [isConnecting, setIsConnecting] = useState(false);

  const [conversation, setConversation] = useState<Conversation>(
    new Conversation({
      messages: new Map(
        initMessages?.map((message) => [message.messageId, message])
      ),
    })
  );

  useEffect(() => {
    client.setChannel({
      customChannelId,
      customMessageId: '',
    });
  }, [client, customChannelId]);

  const sendMessage = useCallback(
    (text: string, customMessageId?: string) => {
      setIsConnecting(true);

      setConversation((prevConversation) => {
        const nextConversation = prevConversation.pushMessage(
          prevConversation,
          {
            type: 'user',
            messageId: customMessageId ?? crypto.randomUUID(),
            text,
            time: new Date(),
          }
        );

        client.sendMessage(
          {
            customChannelId,
            customMessageId,
            text,
          },
          {
            onSseMessage: (response) => {
              setConversation((prev) =>
                nextConversation.onMessage(prev, response, {
                  showDebugMessage: options?.showDebugMessage,
                })
              );
            },
            onSseCompleted: () => {
              setIsConnecting(false);
            },
          }
        );

        return nextConversation;
      });
    },
    [client, customChannelId, options]
  );

  return useMemo(
    () => ({
      isConnecting,
      messages: conversation.messages,
      sendMessage,
    }),
    [conversation, isConnecting, sendMessage]
  );
}
