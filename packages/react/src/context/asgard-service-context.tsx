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
  avatar?: string;
  client: AsgardServiceClient | null;
  isConnecting: boolean;
  messages: Map<string, ConversationMessage> | null;
  messageBoxBottomRef: RefObject<HTMLDivElement>;
  sendMessage: UseChannelReturn['sendMessage'];
}

export const AsgardServiceContext = createContext<AsgardServiceContextType>({
  avatar: undefined,
  client: null,
  isConnecting: false,
  messages: null,
  messageBoxBottomRef: { current: null },
  sendMessage: () => {},
});

interface AsgardServiceContextProviderProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  children: ReactNode;
  avatar?: string;
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
    avatar,
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

  const { messages, sendMessage, isConnecting } = useChannel({
    client,
    customChannelId,
    initMessages,
    options,
  });

  const contextValue = useMemo(
    () => ({
      avatar,
      client,
      isConnecting,
      messages,
      sendMessage,
      messageBoxBottomRef,
    }),
    [avatar, client, isConnecting, messages, sendMessage]
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
