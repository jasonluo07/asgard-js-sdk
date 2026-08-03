import { lazy, ReactNode, Suspense, useEffect, useState } from 'react';
import type { Extension } from '@codemirror/state';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { t } from '../../../i18n';
import { LoaderCircleIcon } from './icons';
import styles from './file-view.module.scss';

/**
 * CodeMirror 6 and its language packs load only when a file is actually opened (F-021 AC3). They are a
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

function Loading(): ReactNode {
  const { locale = 'en-US' } = useAsgardTemplateContext();

  return (
    <div className={styles.status}>
      <LoaderCircleIcon size={14} className={styles.spin} /> {t(locale, 'fileExplorer.loadingEditor')}
    </div>
  );
}

export interface CodeEditorProps {
  /** File extension (lowercase, no dot) — selects the language grammar. */
  ext: string;
  value: string;
  /** `false` renders read-only but still syntax-highlighted — AC3's preview side for code files. */
  editable: boolean;
  onChange: (value: string) => void;
}

/**
 * Syntax-highlighted source view / editor (F-021 AC3). Preview and edit share this one component, so both
 * modes get the same highlighted rendering; only `editable` differs.
 */
export function CodeEditor({ ext, value, editable, onChange }: CodeEditorProps): ReactNode {
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

  if (!extensions) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
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
