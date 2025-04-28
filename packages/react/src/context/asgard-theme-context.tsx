import {
  createContext,
  CSSProperties,
  PropsWithChildren,
  ReactNode,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import { deepMerge } from 'src/utils/deep-merge';
import { useAsgardAppInitializationContext } from 'src/context/asgard-app-initialization-context';

export interface AsgardThemeContextValue {
  chatbot: Pick<
    CSSProperties,
    | 'width'
    | 'height'
    | 'maxWidth'
    | 'minWidth'
    | 'maxHeight'
    | 'minHeight'
    | 'backgroundColor'
    | 'borderColor'
    | 'borderRadius'
  > & {
    contentMaxWidth?: CSSProperties['maxWidth'];
  };
  botMessage: Pick<CSSProperties, 'color' | 'backgroundColor'>;
  userMessage: Pick<CSSProperties, 'color' | 'backgroundColor'>;
}

export const defaultAsgardThemeContextValue: AsgardThemeContextValue = {
  chatbot: {
    width: '375px',
    height: '640px',
    backgroundColor: 'var(--asg-color-bg)',
    borderColor: 'var(--asg-color-border)',
    borderRadius: 'var(--asg-radius-md)',
    contentMaxWidth: '1200px',
  },
  botMessage: {
    color: 'var(--asg-color-text)',
    backgroundColor: 'var(--asg-color-secondary)',
  },
  userMessage: {
    color: 'var(--asg-color-text)',
    backgroundColor: 'var(--asg-color-primary)',
  },
};

export const AsgardThemeContext = createContext<AsgardThemeContextValue>(
  defaultAsgardThemeContextValue
);

export function AsgardThemeContextProvider(
  props: PropsWithChildren<{
    theme?: Partial<AsgardThemeContextValue>;
  }>
): ReactNode {
  const { children, theme = {} } = props;
  const {
    data: { annotations },
  } = useAsgardAppInitializationContext();

  const deepMergeTheme = useCallback(
    function () {
      /**
       * Orders of theme (high to low):
       * 1. Theme from props
       * 2. Theme from annotations
       * 3. Default theme
       */

      const themeFromAnnotations = annotations?.embedConfig?.theme ?? {};
      const tempTheme = deepMerge(
        defaultAsgardThemeContextValue,
        themeFromAnnotations
      );

      return deepMerge(tempTheme, theme);
    },
    [theme, annotations?.embedConfig?.theme]
  );

  const value = useMemo(() => deepMergeTheme(), [deepMergeTheme]);

  return (
    <AsgardThemeContext.Provider value={value}>
      {children}
    </AsgardThemeContext.Provider>
  );
}

export function useAsgardThemeContext(): AsgardThemeContextValue {
  return useContext(AsgardThemeContext);
}
