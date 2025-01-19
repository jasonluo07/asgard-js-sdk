import { ClientConfig, AsgardServiceClient } from '@asgard-js/core';
import { useEffect, useRef } from 'react';

interface UseAsgardServiceClientProps {
  config: ClientConfig;
}

export function useAsgardServiceClient(
  props: UseAsgardServiceClientProps
): AsgardServiceClient | null {
  const { config } = props;

  const clientRef = useRef<AsgardServiceClient | null>(
    new AsgardServiceClient(config)
  );

  useEffect(() => {
    return (): void => {
      console.log('cleaning up client');
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [config]);

  return clientRef.current;
}
