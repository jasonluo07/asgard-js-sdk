import { lazy, ReactNode, Suspense, useEffect, useState } from 'react';
import type { Extension } from '@codemirror/state';
import { type Locale, t } from '../../i18n';
import { Spinner } from '../spinner';
import styles from './file-view.module.scss';

/**
 * CodeMirror 6 and its language packs load only when a file is actually opened (F-025). They are a
 * large chunk and this package bundles its dependencies rather than externalising them, so loading them
 * eagerly would charge every consumer for a surface most never open.
 */
const CodeMirror = lazy(() => import('@uiw/react-codemirror'));

/** Blend into the panel surface: no chrome of its own, monospace, no focus ring. */
async function surfaceTheme(): Promise<Extension> {
  const { EditorView } = await import('@uiw/react-codemirror');

  return EditorView.theme({
    '&': { backgroundColor: 'transparent', height: '100%', fontSize: '12px' },
    '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
    '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
    '&.cm-focused': { outline: 'none' },
  });
}

/** Language by extension (AC3); unmapped extensions render as plain text. */
async function languageExtension(ext: string): Promise<Extension | null> {
  switch (ext) {
    case 'ts':
      return (await import('@codemirror/lang-javascript')).javascript({ typescript: true });
    case 'tsx':
      return (await import('@codemirror/lang-javascript')).javascript({ typescript: true, jsx: true });
    case 'jsx':
      return (await import('@codemirror/lang-javascript')).javascript({ jsx: true });
    case 'js':
    case 'mjs':
    case 'cjs':
      return (await import('@codemirror/lang-javascript')).javascript();
    case 'json':
      return (await import('@codemirror/lang-json')).json();
    case 'html':
    case 'htm':
      return (await import('@codemirror/lang-html')).html();
    case 'css':
      return (await import('@codemirror/lang-css')).css();
    case 'py':
      return (await import('@codemirror/lang-python')).python();
    case 'md':
    case 'markdown':
      return (await import('@codemirror/lang-markdown')).markdown();
    default:
      return null;
  }
}

/** Cached per extension so re-opening the same file type does not re-import. */
const extensionCache = new Map<string, Promise<Extension[]>>();

function extensionsFor(ext: string): Promise<Extension[]> {
  const cached = extensionCache.get(ext);
  if (cached) return cached;

  const pending = Promise.all([surfaceTheme(), languageExtension(ext)]).then(([theme, lang]) =>
    lang ? [theme, lang] : [theme],
  );
  extensionCache.set(ext, pending);

  return pending;
}

function Loading({ locale }: { locale: Locale }): ReactNode {
  return (
    <div className={styles.status}>
      <Spinner size={14} /> {t(locale, 'sourceSetExplorer.loadingEditor')}
    </div>
  );
}

export interface CodeEditorProps {
  /** File extension (lowercase, no dot) — selects the language grammar. */
  ext: string;
  value: string;
  /** `false` renders read-only but still syntax-highlighted — the preview side for code files. */
  editable: boolean;
  onChange: (value: string) => void;
  /** Passed in rather than read from a context: this explorer mounts without a Chatbot (F-025 R3). */
  locale: Locale;
}

/**
 * Syntax-highlighted source view / editor. Preview and edit share this one component, so both modes get
 * the same highlighted rendering; only `editable` differs.
 *
 * Copied from `file-explorer/code-editor.tsx` under F-025's "先在本票內複製一份" rule (F-027 folds them
 * back together).
 */
export function CodeEditor({ ext, value, editable, onChange, locale }: CodeEditorProps): ReactNode {
  const [extensions, setExtensions] = useState<Extension[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void extensionsFor(ext).then(resolved => {
      if (!cancelled) setExtensions(resolved);
    });

    return (): void => {
      cancelled = true;
    };
  }, [ext]);

  if (!extensions) return <Loading locale={locale} />;

  return (
    <Suspense fallback={<Loading locale={locale} />}>
      <CodeMirror
        value={value}
        theme="dark"
        extensions={extensions}
        editable={editable}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: editable }}
        onChange={onChange}
        height="100%"
        className={styles.codemirror}
      />
    </Suspense>
  );
}

export default CodeEditor;
