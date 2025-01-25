/* eslint-disable @typescript-eslint/no-empty-function */
import {
  AsgardServiceClient,
  ClientConfig,
  ConversationBotMessage,
  ConversationMessage,
} from '@asgard-js/core';
import {
  createContext,
  DetailedHTMLProps,
  HTMLAttributes,
  ReactNode,
  RefObject,
  useContext,
  useMemo,
  useRef,
} from 'react';
import {
  useAsgardServiceClient,
  useChannel,
  UseChannelReturn,
} from 'src/hooks';

interface AsgardServiceContextType {
  client: AsgardServiceClient | null;
  isConnecting: boolean;
  messages: Map<string, ConversationMessage> | null;
  typingMessages: Map<string, ConversationBotMessage> | null;
  messageBoxBottomRef: RefObject<HTMLDivElement>;
  sendMessage: UseChannelReturn['sendMessage'];
}

export const AsgardServiceContext = createContext<AsgardServiceContextType>({
  client: null,
  isConnecting: false,
  messages: null,
  typingMessages: null,
  messageBoxBottomRef: { current: null },
  sendMessage: () => {},
});

interface AsgardServiceContextProviderProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  children: ReactNode;
  config: ClientConfig;
  customChannelId: string;
  customMessageId?: string;
  delayTime?: number;
  options?: { showDebugMessage?: boolean };
  initMessages?: ConversationMessage[];
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
    initMessages,
    options,
    ...divProps
  } = props;

  const messageBoxBottomRef = useRef<HTMLDivElement>(null);

  const client = useAsgardServiceClient({ config });

  const { messages, typingMessages, sendMessage } = useChannel({
    client,
    customChannelId,
    initMessages,
    options,
  });

  const contextValue = useMemo(
    () => ({
      client,
      isConnecting: client?.isConnecting ?? false,
      messages,
      typingMessages,
      sendMessage,
      messageBoxBottomRef,
    }),
    [client, messages, sendMessage, typingMessages]
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
