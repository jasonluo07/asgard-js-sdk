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
  customChannelId: string | null;
  initConversation?: ConversationMessage[];
  onResetChannelInit?: (event: SSEResponse<EventType.INIT>) => void;
}

export interface UseChannelReturn {
  conversation: ConversationMessage[];
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

  const [conversation, setConversation] = useState<ConversationMessage[]>(
    initConversation ?? []
  );

  useEffect(() => {
    if (!client) {
      console.warn('Client is not available');

      return;
    }

    if (!customChannelId) {
      console.warn('customChannelId is required');

      return;
    }

    client.setChannel({
      customChannelId,
      customMessageId: '',
      text: '',
    });
  }, [client, customChannelId]);

  const sendMessage = useCallback(
    (text: string, customMessageId?: string) => {
      if (!client) {
        console.warn('Client is not available');

        return;
      }

      if (!customChannelId) {
        console.warn('customChannelId is required');

        return;
      }

      setConversation((prev) =>
        prev.concat({
          type: 'user',
          customMessageId,
          text,
          time: new Date(),
        })
      );

      client.sendMessage({
        customChannelId,
        customMessageId,
        text,
      });
    },
    [client, customChannelId]
  );

  useEffect(() => {
    if (!onResetChannelInit) return;

    client?.on(
      FetchSSEAction.RESET_CHANNEL,
      EventType.INIT,
      onResetChannelInit
    );
  }, [client, onResetChannelInit]);

  useEffect(() => {
    client?.on(FetchSSEAction.NONE, EventType.MESSAGE_START, () => {
      startTyping();
    });
  }, [client, startTyping]);

  useEffect(() => {
    client?.on(FetchSSEAction.NONE, EventType.MESSAGE_DELTA, (event) => {
      onTyping(event.fact.messageDelta.message);
    });
  }, [client, onTyping]);

  useEffect(() => {
    client?.on(FetchSSEAction.NONE, EventType.MESSAGE_COMPLETE, (event) => {
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
  };
}
