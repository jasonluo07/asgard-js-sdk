import {
  AsgardServiceClient,
  ClientConfig,
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
  avatar?: string;
  client: AsgardServiceClient | null;
  isOpen: boolean;
  isResetting: boolean;
  isConnecting: boolean;
  messages: Map<string, ConversationMessage> | null;
  messageBoxBottomRef: RefObject<HTMLDivElement>;
  sendMessage?: UseChannelReturn['sendMessage'];
  resetChannel?: UseChannelReturn['resetChannel'];
  closeChannel?: UseChannelReturn['closeChannel'];
  botTypingPlaceholder?: string;
}

export const AsgardServiceContext = createContext<AsgardServiceContextType>({
  avatar: undefined,
  client: null,
  isOpen: false,
  isResetting: false,
  isConnecting: false,
  messages: null,
  messageBoxBottomRef: { current: null },
  botTypingPlaceholder: undefined,
});

interface AsgardServiceContextProviderProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  children: ReactNode;
  avatar?: string;
  config: ClientConfig;
  botTypingPlaceholder?: string;
  customChannelId: string;
  customMessageId?: string;
  delayTime?: number;
  initMessages?: ConversationMessage[];
}

export function AsgardServiceContextProvider(
  props: AsgardServiceContextProviderProps
): ReactNode {
  const {
    avatar,
    children,
    config,
    botTypingPlaceholder,
    customChannelId,
    initMessages,
  } = props;

  const messageBoxBottomRef = useRef<HTMLDivElement>(null);

  const client = useAsgardServiceClient({ config });

  const {
    isOpen,
    isResetting,
    isConnecting,
    conversation,
    sendMessage,
    resetChannel,
    closeChannel,
  } = useChannel({
    client,
    customChannelId,
    initMessages,
  });

  const contextValue = useMemo(
    () => ({
      avatar,
      client,
      isOpen,
      isResetting,
      isConnecting,
      messages: conversation?.messages ?? null,
      sendMessage,
      resetChannel,
      closeChannel,
      botTypingPlaceholder,
      messageBoxBottomRef,
    }),
    [
      avatar,
      client,
      isOpen,
      isResetting,
      isConnecting,
      conversation?.messages,
      sendMessage,
      resetChannel,
      closeChannel,
      botTypingPlaceholder,
    ]
  );

  return (
    <AsgardServiceContext.Provider value={contextValue}>
      {children}
    </AsgardServiceContext.Provider>
  );
}

export function useAsgardContext(): AsgardServiceContextType {
  return useContext(AsgardServiceContext);
}
