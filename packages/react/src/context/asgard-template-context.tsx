import {
  createContext,
  PropsWithChildren,
  ReactNode,
  useContext,
  useMemo,
} from 'react';
import { ConversationErrorMessage } from '@asgard-js/core';

export interface AsgardTemplateContextValue {
  onErrorClick?: (message: ConversationErrorMessage) => void;
  errorMessageRenderer?: (message: ConversationErrorMessage) => ReactNode;
}

export const AsgardTemplateContext = createContext<AsgardTemplateContextValue>({
  onErrorClick: undefined,
  errorMessageRenderer: undefined,
});

interface AsgardTemplateContextProviderProps extends PropsWithChildren {
  onErrorClick?: (message: ConversationErrorMessage) => void;
  errorMessageRenderer?: (message: ConversationErrorMessage) => ReactNode;
}

export function AsgardTemplateContextProvider(
  props: AsgardTemplateContextProviderProps
): ReactNode {
  const { children, onErrorClick, errorMessageRenderer } = props;

  const contextValue = useMemo(
    () => ({ onErrorClick, errorMessageRenderer }),
    [errorMessageRenderer, onErrorClick]
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
