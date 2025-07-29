import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { ClientConfig } from '@jasonluo07/asgard-js-core';
import { getBotProviderModels } from 'src/models/bot-provider';
import { useDeepCompareMemo } from 'src/hooks';
import { deepMerge } from 'src/utils/deep-merge';
import { extractRefs } from 'src/utils/extractors';

type AsyncInitializers = {
  [key: string]: () => Promise<unknown>;
};

export interface Annotations {
  embedConfig: {
    avatar?: string;
    botTypingPlaceholder?: string;
    debugMode?: boolean;
    fullScreen?: boolean;
    inputPlaceholder?: string;
    theme: {
      chatbot: {
        backgroundColor?: string;
        borderColor?: string;
        inactiveColor?: string;
        primaryComponent?: {
          mainColor?: string;
          secondaryColor?: string;
        };
      };
      botMessage: {
        backgroundColor?: string;
        carouselButtonBackgroundColor?: string;
        color?: string;
      };
      userMessage: {
        backgroundColor?: string;
        color?: string;
      };
    };
    title?: string;
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
        } catch {
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
