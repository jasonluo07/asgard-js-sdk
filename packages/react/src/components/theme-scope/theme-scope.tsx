import { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import clsx from 'clsx';
import {
  AsgardThemeContextProvider,
  AsgardThemeContextValue,
  useAsgardThemeContext,
} from '../../context/asgard-theme-context';
import styles from './theme-scope.module.scss';

/**
 * Re-establishes the SDK's theme where the chat shell isn't.
 *
 * The design tokens (`--asg-color-*`, radius, spacing) are emitted by a SCSS mixin onto
 * `ChatbotContainer`'s root, so anything rendered outside that subtree falls back to the literal
 * defaults baked into each rule — which are light-themed. That bites the components F-021 AC7 invites
 * consumers to place "anywhere outside the Chat UI": `<FileExplorerPanel>` in a docked side panel comes
 * out white on a dark page.
 *
 * Wrap those in this to get the tokens plus whatever `theme` overrides you already pass to `<Chatbot>`:
 *
 * ```tsx
 * <AsgardThemeScope theme={chatbotTheme}>
 *   <FileExplorerPanel … />
 * </AsgardThemeScope>
 * ```
 *
 * It is only needed outside `<Chatbot>` — inside, the shell already scopes the tokens.
 */
export function AsgardThemeScope(
  props: PropsWithChildren<{
    /** Same shape as `<Chatbot theme>`; pass the same value to keep both surfaces in step. */
    theme?: Partial<AsgardThemeContextValue>;
    className?: string;
    style?: CSSProperties;
  }>,
): ReactNode {
  const { theme, className, style, children } = props;

  return (
    <AsgardThemeContextProvider theme={theme}>
      <ThemeScopeRoot className={className} style={style}>
        {children}
      </ThemeScopeRoot>
    </AsgardThemeContextProvider>
  );
}

/**
 * Inside the provider so it can read the merged theme — the token defaults come from the class, the
 * consumer's overrides ride in as inline custom properties, exactly as `ChatbotContainer` does it.
 */
function ThemeScopeRoot(props: PropsWithChildren<{ className?: string; style?: CSSProperties }>): ReactNode {
  const { className, style, children } = props;
  const { chatbot } = useAsgardThemeContext();
  const { style: rootStyle } = chatbot;

  return (
    <div className={clsx('asgard-theme-scope', styles.theme_scope, className)} style={{ ...rootStyle, ...style }}>
      {children}
    </div>
  );
}

export default AsgardThemeScope;
