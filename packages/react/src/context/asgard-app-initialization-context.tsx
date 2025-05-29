import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { ClientConfig } from '@asgard-js/core';
import { getBotProviderModels } from 'src/models/bot-provider';
import { useDeepCompareMemo } from 'src/hooks';
import { deepMerge } from 'src/utils/deep-merge';
import { extractRefs } from 'src/utils/extractors';

type AsyncInitializers = {
  [key: string]: () => Promise<unknown>;
};

export interface Annotations {
  embedConfig: {
    theme: {
      chatbot: Record<string, unknown>;
      botMessage: Record<string, unknown>;
      userMessage: Record<string, unknown>;
    };
  };
}

export interface AsgardAppInitializationContextValue {
  data: {
    annotations?: Annotations;
  };
  loading: boolean;
  error: Error | null;
}

export const AsgardAppInitializationContext =
  createContext<AsgardAppInitializationContextValue>({
    data: {},
    loading: true,
    error: null,
  });

export interface AsgardAppInitializationContextProviderProps {
  enabled: boolean;
  config: ClientConfig;
  asyncInitializers?: AsyncInitializers;
  loadingComponent?: React.ReactNode;
}

export const AsgardAppInitializationContextProvider = (
  props: PropsWithChildren<AsgardAppInitializationContextProviderProps>
): ReactNode => {
  const {
    enabled,
    asyncInitializers: asyncInitializersFromProp = {},
    children,
    loadingComponent = <div>Loading...</div>,
  } = props;

  const botProviderModels = useDeepCompareMemo(
    () => getBotProviderModels(props.config),
    [props.config]
  );

  const asyncInitializers = useDeepCompareMemo(
    () =>
      deepMerge(
        { annotations: botProviderModels.getAnnotations },
        asyncInitializersFromProp
      ),
    [...extractRefs(asyncInitializersFromProp), botProviderModels]
  );

  const [data, setData] = useState<AsgardAppInitializationContextValue['data']>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      return;
    }

    setLoading(true);

    Promise.all(
      Object.entries(asyncInitializers).map(async ([key, fn]) => {
        try {
          const value = await fn();

          return [key, value];
        } catch (e) {
          return [key, undefined];
        }
      })
    )
      .then((results) => {
        if (isMounted) setData(Object.fromEntries(results));
      })
      .catch((err) => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return (): void => {
      isMounted = false;
    };
  }, [asyncInitializers, enabled]);

  if (!enabled) {
    return children;
  }

  if (loading) {
    return loadingComponent;
  }

  return (
    <AsgardAppInitializationContext.Provider value={{ data, loading, error }}>
      {children}
    </AsgardAppInitializationContext.Provider>
  );
};

export const useAsgardAppInitializationContext =
  (): AsgardAppInitializationContextValue =>
    useContext(AsgardAppInitializationContext);
