import {
  createContext,
  CSSProperties,
  PropsWithChildren,
  ReactNode,
  useContext,
  useMemo,
} from 'react';
import { deepMerge } from 'src/utils/deep-merge';

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
    fullScreen?: boolean;
    theme?: Partial<AsgardThemeContextValue>;
  }>
): ReactNode {
  const { children, fullScreen, theme = {} } = props;

  const value = useMemo(
    () =>
      deepMerge(
        defaultAsgardThemeContextValue,
        fullScreen
          ? deepMerge(theme, {
              chatbot: {
                width: '100vw',
                height: '100vh',
                borderRadius: 'var(--asg-radius-none)',
              },
            })
          : theme
      ),
    [fullScreen, theme]
  );

  return (
    <AsgardThemeContext.Provider value={value}>
      {children}
    </AsgardThemeContext.Provider>
  );
}

export function useAsgardThemeContext(): AsgardThemeContextValue {
  return useContext(AsgardThemeContext);
}
