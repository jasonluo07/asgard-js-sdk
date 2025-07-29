import {
  createContext,
  PropsWithChildren,
  ReactNode,
  useContext,
  useMemo,
} from 'react';
import {
  ConversationErrorMessage,
  FetchSsePayload,
} from '@jasonluo07/asgard-js-core';

export interface AsgardTemplateContextValue {
  onErrorClick?: (message: ConversationErrorMessage) => void;
  errorMessageRenderer?: (message: ConversationErrorMessage) => ReactNode;
  onTemplateBtnClick?: (
    payload: Record<string, unknown>,
    {
      sse,
    }: {
      sse: {
        sendMessage: (
          payload: Pick<FetchSsePayload, 'text' | 'payload'>
        ) => void;
      };
    }
  ) => void;
}

export const AsgardTemplateContext = createContext<AsgardTemplateContextValue>({
  onErrorClick: undefined,
  errorMessageRenderer: undefined,
  onTemplateBtnClick: undefined,
});

interface AsgardTemplateContextProviderProps extends PropsWithChildren {
  onErrorClick?: (message: ConversationErrorMessage) => void;
  errorMessageRenderer?: (message: ConversationErrorMessage) => ReactNode;
  onTemplateBtnClick?: (
    payload: Record<string, unknown>,
    {
      sse,
    }: {
      sse: {
        sendMessage: (
          payload: Pick<FetchSsePayload, 'text' | 'payload'>
        ) => void;
      };
    }
  ) => void;
}

export function AsgardTemplateContextProvider(
  props: AsgardTemplateContextProviderProps
): ReactNode {
  const { children, onErrorClick, errorMessageRenderer, onTemplateBtnClick } =
    props;

  const contextValue = useMemo(
    () => ({ onErrorClick, errorMessageRenderer, onTemplateBtnClick }),
    [errorMessageRenderer, onErrorClick, onTemplateBtnClick]
  );

  return (
    <AsgardTemplateContext.Provider value={contextValue}>
      {children}
    </AsgardTemplateContext.Provider>
  );
}

export function useAsgardTemplateContext(): AsgardTemplateContextValue {
  return useContext(AsgardTemplateContext);
}
