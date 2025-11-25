import { AsgardServiceClient, ClientConfig, ConversationMessage } from '@asgard-js/core';
import {
  createContext,
  ForwardedRef,
  ReactNode,
  RefObject,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useAsgardServiceClient, useChannel, UseChannelProps, UseChannelReturn } from '../hooks';

export interface AsgardServiceContextValue {
  avatar?: string;
  title?: string;
  client: AsgardServiceClient | null;
  customChannelId?: string;
  isOpen: boolean;
  isResetting: boolean;
  isConnecting: boolean;
  messages: Map<string, ConversationMessage> | null;
  messageBoxBottomRef: RefObject<HTMLDivElement>;
  sendMessage?: UseChannelReturn['sendMessage'];
  resetChannel?: UseChannelReturn['resetChannel'];
  closeChannel?: UseChannelReturn['closeChannel'];
  botTypingPlaceholder?: string;
  inputPlaceholder?: string;
  enableUpload?: boolean;
  enableExport?: boolean;
}

export const AsgardServiceContext = createContext<AsgardServiceContextValue>({
  avatar: undefined,
  title: undefined,
  client: null,
  customChannelId: undefined,
  isOpen: false,
  isResetting: false,
  isConnecting: false,
  messages: null,
  messageBoxBottomRef: { current: null },
  botTypingPlaceholder: undefined,
  inputPlaceholder: undefined,
  enableUpload: undefined,
  enableExport: undefined,
});

export interface AsgardServiceContextProviderProps {
  children: ReactNode;
  parentRef?: ForwardedRef<Partial<{ serviceContext?: AsgardServiceContextValue }>>;
  avatar?: string;
  title?: string;
  config: ClientConfig;
  botTypingPlaceholder?: string;
  inputPlaceholder?: string;
  enableUpload?: boolean;
  enableExport?: boolean;
  customChannelId: string;
  customMessageId?: string;
  delayTime?: number;
  initMessages?: ConversationMessage[];
  onSseMessage?: UseChannelProps['onSseMessage'];
  onAuthError?: (error: { isAuthError: boolean; isBotProviderError: boolean; errorDetail?: unknown }) => void;
}

export function AsgardServiceContextProvider(props: AsgardServiceContextProviderProps): ReactNode {
  const {
    avatar,
    title,
    children,
    parentRef,
    config,
    botTypingPlaceholder,
    inputPlaceholder,
    enableUpload,
    enableExport,
    customChannelId,
    initMessages,
    onSseMessage,
    onAuthError,
  } = props;

  const messageBoxBottomRef = useRef<HTMLDivElement>(null);

  const client = useAsgardServiceClient({ config });

  const { isOpen, isResetting, isConnecting, conversation, sendMessage, resetChannel, closeChannel } = useChannel({
    client,
    customChannelId,
    initMessages,
    onSseMessage,
    onAuthError,
  });

  const contextValue = useMemo(
    () => ({
      avatar,
      title,
      client,
      customChannelId,
      isOpen,
      isResetting,
      isConnecting,
      messages: conversation?.messages ?? null,
      sendMessage,
      resetChannel,
      closeChannel,
      botTypingPlaceholder,
      inputPlaceholder,
      enableUpload,
      enableExport,
      messageBoxBottomRef,
    }),
    [
      avatar,
      title,
      client,
      customChannelId,
      isOpen,
      isResetting,
      isConnecting,
      conversation?.messages,
      sendMessage,
      resetChannel,
      closeChannel,
      botTypingPlaceholder,
      inputPlaceholder,
      enableUpload,
      enableExport,
    ],
  );

  useImperativeHandle(parentRef, () => {
    return {
      serviceContext: contextValue,
    };
  });

  return <AsgardServiceContext.Provider value={contextValue}>{children}</AsgardServiceContext.Provider>;
}

export function useAsgardContext(): AsgardServiceContextValue {
  return useContext(AsgardServiceContext);
}
