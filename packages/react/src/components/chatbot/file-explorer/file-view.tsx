import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { StreamdownClient } from '../../templates/text-template/streamdown-client';
import { ArrowLeftIcon, CodeIcon, EyeIcon, LoaderCircleIcon, CircleAlertIcon, RefreshIcon } from './icons';
import { CodeEditor } from './code-editor';
import { FsEntry, FsReadFile, FsSaveFile } from './types';
import styles from './file-view.module.scss';

type FileKind = 'markdown' | 'image' | 'text';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

export interface FileViewProps {
  sandboxName: string;
  /** The opened file (`isDir: false`). */
  file: FsEntry;
  /** Read content (≈ `GET fs/file`; images resolve to a data/object URL). Absent → treated as empty. */
  readFile?: FsReadFile;
  /** Save content (≈ `PUT fs/file`); debounced by this component. */
  onSaveFile?: FsSaveFile;
  /** Report editing / unsaved-changes state so the host can guard mid-edit panel yanks (F-021 AC10). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Back to the file tree. */
  onBack: () => void;
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.');

  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

function kindOf(ext: string): FileKind {
  if (ext === 'md' || ext === 'markdown') return 'markdown';

  if (IMAGE_EXTS.has(ext)) return 'image';

  return 'text';
}

/**
 * Single-panel two-mode file view (F-021 AC3). Text and code run through CodeMirror 6 with the grammar
 * picked by extension — read-only in preview, editable in edit, so both modes share one highlighted
 * rendering. `.md` previews as rendered markdown and edits as source; images preview only. Save debounces
 * to `onSaveFile` (≈ `PUT fs/file`), and a manual refresh re-reads from disk. Reports dirty state (AC10).
 */
export function FileView({ sandboxName, file, readFile, onSaveFile, onDirtyChange, onBack }: FileViewProps): ReactNode {
  const ext = extOf(file.name);
  const kind = kindOf(ext);
  const canToggle = kind !== 'image';

  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  // AC3 keeps a manual refresh alongside any watch-driven reload; bumping this re-reads from disk.
  const [reloadKey, setReloadKey] = useState(0);

  // Load content. Keyed by sandbox + path, so switching files re-runs this.
  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    setDirty(false);

    Promise.resolve(readFile ? readFile(sandboxName, file.path) : '')
      .then(c => {
        if (!cancelled) setContent(c);
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });

    return (): void => {
      cancelled = true;
    };
  }, [sandboxName, file.path, readFile, reloadKey]);

  // Surface dirty state to the host (AC10) and clean it up on unmount.
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    return (): void => onDirtyChange?.(false);
  }, [onDirtyChange]);

  // Edit → debounced save (≈ PUT fs/file).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = (val: string): void => {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      void Promise.resolve(onSaveFile?.(sandboxName, file.path, val)).then(() => setDirty(false));
    }, 400);
  };

  useEffect(() => {
    return (): void => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const body = useMemo((): ReactNode => {
    if (content === null && !error) {
      return (
        <div className={styles.status}>
          <LoaderCircleIcon size={14} className={styles.spin} /> 載入中…
        </div>
      );
    }

    if (error) {
      return (
        <div className={`${styles.status} ${styles.error}`}>
          <CircleAlertIcon size={14} /> 無法載入：{error}
        </div>
      );
    }

    if (kind === 'image') {
      return (
        <div className={styles.imageWrap}>
          <img src={content ?? ''} alt={file.name} className={styles.image} />
        </div>
      );
    }

    if (kind === 'markdown' && mode === 'preview') {
      return (
        <div className={styles.markdown}>
          <StreamdownClient>{content ?? ''}</StreamdownClient>
        </div>
      );
    }

    return (
      <CodeEditor
        ext={ext}
        value={content ?? ''}
        editable={mode === 'edit'}
        onChange={val => {
          setContent(val);
          setDirty(true);
          scheduleSave(val);
        }}
      />
    );
  }, [content, error, kind, mode, file.name, ext]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <button type="button" onClick={onBack} className={styles.back} title="返回檔案樹">
          <ArrowLeftIcon size={15} />
          <span className={styles.name}>{file.name}</span>
        </button>
        {dirty && <span className={styles.dirty}>●</span>}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => setReloadKey(k => k + 1)}
            aria-label="重新載入檔案"
            title="重新載入"
            className={styles.actionBtn}
          >
            <RefreshIcon size={15} />
          </button>
          {canToggle && (
            <button
              type="button"
              onClick={() => setMode(m => (m === 'preview' ? 'edit' : 'preview'))}
              aria-label={mode === 'preview' ? '切換為編輯' : '切換為預覽'}
              title={mode === 'preview' ? '編輯' : '預覽'}
              className={styles.actionBtn}
            >
              {mode === 'preview' ? <CodeIcon size={15} /> : <EyeIcon size={15} />}
            </button>
          )}
        </div>
      </div>
      <div className={styles.body}>{body}</div>
    </div>
  );
}

export default FileView;
