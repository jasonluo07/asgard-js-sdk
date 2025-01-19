import { ClientConfig, AsgardServiceClient } from '@asgard-js/core';
import { useEffect, useRef } from 'react';

interface UseAsgardServiceClientProps {
  config: ClientConfig;
}

export function useAsgardServiceClient(
  props: UseAsgardServiceClientProps
): AsgardServiceClient | null {
  const { config } = props;

  const clientRef = useRef<AsgardServiceClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new AsgardServiceClient(config);
  }

  useEffect(() => {
    return (): void => {
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [config]);

  return clientRef.current;
}
