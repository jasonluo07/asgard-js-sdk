import {
  AsgardServiceClient,
  EventType,
  FetchSSEAction,
  Message,
  SSEResponse,
} from '@asgard-js/core';
import { useCallback, useEffect, useState } from 'react';
import { UseChatbotTypingReturn } from './use-chatbot-typing';

export type ConversationUserMessage = {
  type: 'user';
  customMessageId?: string;
  text: string;
  time: Date;
};

export type ConversationBotMessage = {
  type: 'bot';
  eventType: EventType;
  message: Message;
  time: Date;
};

export type ConversationMessage =
  | ConversationUserMessage
  | ConversationBotMessage;

interface UseChannelProps
  extends Pick<
    UseChatbotTypingReturn,
    'startTyping' | 'onTyping' | 'stopTyping'
  > {
  client: AsgardServiceClient | null;
  customChannelId: string;
  initConversation?: ConversationMessage[];
  onResetChannelInit?: (event: SSEResponse<EventType.INIT>) => void;
}

export interface UseChannelReturn {
  conversation: ConversationMessage[];
  isConnectionProcessing: boolean;
  sendMessage: (text: string, customMessageId?: string) => void;
}

export function useChannel(props: UseChannelProps): UseChannelReturn {
  const {
    client,
    customChannelId,
    initConversation,
    onResetChannelInit,
    startTyping,
    onTyping,
    stopTyping,
  } = props;

  if (!client) {
    throw new Error('Client instance is required');
  }

  if (!customChannelId) {
    throw new Error('Custom channel id is required');
  }

  const [isConnectionProcessing, setIsConnectionProcessing] = useState(false);

  const [conversation, setConversation] = useState<ConversationMessage[]>(
    initConversation ?? []
  );

  useEffect(() => {
    console.log('conversation', conversation);
  }, [conversation]);

  useEffect(() => {
    client.setChannel(
      {
        customChannelId,
        customMessageId: '',
        text: '',
      },
      {
        onStart: () => setIsConnectionProcessing(true),
        onCompleted: () => setIsConnectionProcessing(false),
      }
    );
  }, [client, customChannelId]);

  const sendMessage = useCallback(
    (text: string, customMessageId?: string) => {
      setConversation((prev) =>
        prev.concat({
          type: 'user',
          customMessageId,
          text,
          time: new Date(),
        })
      );

      client.sendMessage(
        {
          customChannelId,
          customMessageId,
          text,
        },
        {
          onStart: () => setIsConnectionProcessing(true),
          onCompleted: () => setIsConnectionProcessing(false),
        }
      );
    },
    [client, customChannelId]
  );

  useEffect(() => {
    if (!onResetChannelInit) return;

    client.on(FetchSSEAction.RESET_CHANNEL, EventType.INIT, onResetChannelInit);
  }, [client, onResetChannelInit]);

  useEffect(() => {
    client.on(FetchSSEAction.NONE, EventType.MESSAGE_START, (event) => {
      startTyping(event.fact.messageStart.message);
    });
  }, [client, startTyping]);

  useEffect(() => {
    client.on(FetchSSEAction.NONE, EventType.MESSAGE_DELTA, (event) => {
      onTyping(event.fact.messageDelta.message);
    });
  }, [client, onTyping]);

  useEffect(() => {
    client.on(FetchSSEAction.NONE, EventType.MESSAGE_COMPLETE, (event) => {
      const { eventType, fact } = event;
      const message = fact.messageComplete.message;
      if (!message.isDebug) {
        setConversation((prev) =>
          prev.concat({
            type: 'bot',
            eventType,
            message,
            time: new Date(),
          })
        );
      }

      stopTyping();
    });
  }, [client, stopTyping]);

  return {
    conversation,
    sendMessage,
    isConnectionProcessing,
  };
}
