import { AsgardServiceClient, ClientConfig } from '@asgard-js/core';
import {
  createContext,
  DetailedHTMLProps,
  HTMLAttributes,
  ReactNode,
  useContext,
  useEffect,
} from 'react';
import { useAsgardServiceClient } from 'src/hooks';

type AsgardServiceContextType = {
  client: AsgardServiceClient | null;
  customChannelId: string | null;
};

export const AsgardServiceContext = createContext<AsgardServiceContextType>({
  client: null,
  customChannelId: null,
});

interface AsgardServiceContextProviderProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
  children: ReactNode;
  config: ClientConfig;
  customChannelId: string;
  customMessageId?: string;
}

export function AsgardServiceContextProvider(
  props: AsgardServiceContextProviderProps
): ReactNode {
  const { children, config, customChannelId, customMessageId, ...divProps } =
    props;

  const client = useAsgardServiceClient({ config });

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
      customMessageId,
      text: '',
    });
  }, [client, customChannelId, customMessageId]);

  return (
    <AsgardServiceContext.Provider value={{ client, customChannelId }}>
      <div {...divProps}>{children}</div>
    </AsgardServiceContext.Provider>
  );
}

export function useAsgardContext(): AsgardServiceContextType {
  return useContext(AsgardServiceContext);
}
