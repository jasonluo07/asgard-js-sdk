/* eslint-disable @typescript-eslint/no-empty-function */
import { AsgardServiceClient, ClientConfig } from '@asgard-js/core';
import {
  createContext,
  DetailedHTMLProps,
  HTMLAttributes,
  ReactNode,
  useContext,
  useMemo,
} from 'react';
import {
  ConversationMessage,
  useAsgardServiceClient,
  useChannel,
  UseChannelReturn,
  useChatbotTyping,
  UseChatbotTypingReturn,
} from 'src/hooks';

interface AsgardServiceContextType
  extends Pick<UseChatbotTypingReturn, 'isTyping' | 'displayText'>,
    Pick<UseChannelReturn, 'conversation' | 'sendMessage'> {
  client: AsgardServiceClient | null;
}

export const AsgardServiceContext = createContext<AsgardServiceContextType>({
  client: null,
  isTyping: false,
  displayText: null,
  conversation: [],
  sendMessage: () => {},
});

interface AsgardServiceContextProviderProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  children: ReactNode;
  config: ClientConfig;
  customChannelId: string;
  customMessageId?: string;
  delayTime?: number;
  initConversation?: ConversationMessage[];
}

export function AsgardServiceContextProvider(
  props: AsgardServiceContextProviderProps
): ReactNode {
  const {
    children,
    config,
    customChannelId,
    customMessageId,
    delayTime,
    initConversation,
    ...divProps
  } = props;

  const client = useAsgardServiceClient({ config });

  const { isTyping, displayText, startTyping, onTyping, stopTyping } =
    useChatbotTyping();

  const { sendMessage, conversation } = useChannel({
    client,
    customChannelId,
    startTyping,
    onTyping,
    stopTyping,
    initConversation,
  });

  const contextValue = useMemo(
    () => ({ client, isTyping, displayText, conversation, sendMessage }),
    [client, conversation, displayText, isTyping, sendMessage]
  );

  return (
    <AsgardServiceContext.Provider value={contextValue}>
      <div {...divProps}>{children}</div>
    </AsgardServiceContext.Provider>
  );
}

export function useAsgardContext(): AsgardServiceContextType {
  return useContext(AsgardServiceContext);
}
