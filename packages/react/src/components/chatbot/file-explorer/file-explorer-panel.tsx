import { ReactNode, useCallback, useEffect, useState } from 'react';
import { LaunchedSandbox, SandboxFsListResult } from '@asgard-js/core';
import { FileExplorerController } from '../../../hooks/use-file-explorer-controller';
import { FileView } from './file-view';
import { FsEntry, FsReadFile, FsSaveFile } from './types';
import { ChevronRightIcon, CircleAlertIcon, FileIcon, FolderIcon, LoaderCircleIcon, RefreshIcon } from './icons';
import styles from './file-explorer-panel.module.scss';

/** List a directory (≈ `GET fs/list`). */
export type FsListDir = (sandboxName: string, path: string) => Promise<SandboxFsListResult>;

export interface FileExplorerPanelProps {
  /** Live sandboxes (F-019 `launchedSandboxes$` snapshot) shown in the dropdown. */
  sandboxes: LaunchedSandbox[];
  /** Shared controller (F-021 AC7) — header toggle / open-file card / this panel all bind one. */
  controller: FileExplorerController;
  /** List a directory (≈ `GET fs/list`). */
  listDir: FsListDir;
  /** Read a file (≈ `GET fs/file`). */
  readFile?: FsReadFile;
  /** Save a file (≈ `PUT fs/file`). */
  saveFile?: FsSaveFile;
  /** Override the tree root (absolute path); the dropdown still shows the real `workingDirectory` (AC2). */
  basePath?: string;
}

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/$/, '')}/${name}`;
}

function labelOf(sandbox: LaunchedSandbox): string {
  return sandbox.sandboxBlueprintName || sandbox.sandboxName;
}

interface FsNodeProps {
  sandboxName: string;
  entry: FsEntry;
  depth: number;
  listDir: FsListDir;
  selectedPath: string | null;
  onOpenFile: (entry: FsEntry) => void;
}

/** One tree node; directories lazily list their children on first expand. */
function FsNode({ sandboxName, entry, depth, listDir, selectedPath, onOpenFile }: FsNodeProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<FsEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDir(sandboxName, entry.path);
      setChildren(result.entries.map(e => ({ ...e, path: joinPath(entry.path, e.name) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [listDir, sandboxName, entry.path]);

  const onClick = (): void => {
    if (!entry.isDir) {
      onOpenFile(entry);

      return;
    }

    const next = !open;
    setOpen(next);
    if (next && children === null) void loadChildren();
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.node} ${selectedPath === entry.path ? styles.selected : ''}`}
        style={{ paddingLeft: `${0.25 + depth * 0.85}rem` }}
        onClick={onClick}
        onDoubleClick={() => !entry.isDir && onOpenFile(entry)}
        title={entry.path}
      >
        {entry.isDir ? (
          <ChevronRightIcon size={14} className={`${styles.chevron} ${open ? styles.open : ''}`} />
        ) : (
          <span className={styles.chevronSpacer} />
        )}
        {entry.isDir ? (
          <FolderIcon size={15} className={styles.nodeIcon} />
        ) : (
          <FileIcon size={15} className={styles.nodeIcon} />
        )}
        <span className={styles.nodeName}>{entry.name}</span>
      </button>

      {entry.isDir && open && (
        <>
          {loading && (
            <div className={styles.status} style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}>
              <LoaderCircleIcon size={12} className={styles.spin} /> 載入中…
            </div>
          )}
          {error && (
            <div className={`${styles.status} ${styles.error}`} style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}>
              <CircleAlertIcon size={12} /> {error}
            </div>
          )}
          {children?.map(child => (
            <FsNode
              key={child.path}
              sandboxName={sandboxName}
              entry={child}
              depth={depth + 1}
              listDir={listDir}
              selectedPath={selectedPath}
              onOpenFile={onOpenFile}
            />
          ))}
        </>
      )}
    </>
  );
}

/**
 * The sandbox File Explorer panel (F-021, Cycle 1): a live-sandbox dropdown, a lazy file tree rooted at the
 * active sandbox's `workingDirectory` (overridable via `basePath`), and a single-panel FileView on open.
 * Mutations / context menu / `fs/watch` are Cycle 2. Placement-agnostic: bind the shared `controller` and
 * an `open-file` intent hits this panel wherever it is rendered (AC7).
 */
export function FileExplorerPanel(props: FileExplorerPanelProps): ReactNode {
  const { sandboxes, controller, listDir, readFile, saveFile, basePath } = props;

  const activeSandboxName = controller.activeSandboxName ?? sandboxes[0]?.sandboxName ?? null;
  const activeSandbox = sandboxes.find(s => s.sandboxName === activeSandboxName) ?? null;

  const [root, setRoot] = useState<FsEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<FsEntry | null>(null);

  const rootPath = basePath ?? activeSandbox?.workingDirectory ?? null;

  const loadRoot = useCallback(async (): Promise<void> => {
    if (!activeSandboxName || !rootPath) return;

    setRoot(null);
    setError(null);
    try {
      const result = await listDir(activeSandboxName, rootPath);
      setRoot(result.entries.map(e => ({ ...e, path: joinPath(rootPath, e.name) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [activeSandboxName, rootPath, listDir]);

  // (Re)load the root whenever the active sandbox / root path changes.
  useEffect(() => {
    setOpenFile(null);
    void loadRoot();
  }, [loadRoot]);

  // open-file intent (AC9): when the controller's requestedFile changes (nonce), open it in the FileView —
  // provided it targets the active sandbox.
  useEffect(() => {
    const rf = controller.requestedFile;
    if (!rf || rf.sandboxName !== activeSandboxName) return;

    const name = rf.absolutePath.split('/').filter(Boolean).pop() ?? rf.absolutePath;
    setOpenFile({ name, path: rf.absolutePath, isDir: false, sizeBytes: 0, mtimeUnix: 0, mode: 0 });
  }, [controller.requestedFile, activeSandboxName]);

  if (sandboxes.length === 0) {
    // Cycle-1 empty state (the Nudge button is Cycle 2, gated on `action=NUDGE`).
    return (
      <div className={styles.root}>
        <div className={styles.empty}>目前沒有執行中的 sandbox。</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <select
          className={styles.select}
          value={activeSandboxName ?? ''}
          onChange={e => controller.selectSandbox(e.target.value)}
          aria-label="選擇 sandbox"
        >
          {sandboxes.map(s => (
            <option key={s.sandboxName} value={s.sandboxName}>
              {labelOf(s)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => void loadRoot()}
          aria-label="重新整理"
          title="重新整理"
        >
          <RefreshIcon size={15} />
        </button>
      </div>

      {activeSandbox && <div className={styles.cwd}>{rootPath}</div>}

      <div className={styles.body}>
        {openFile ? (
          <FileView
            sandboxName={activeSandboxName as string}
            file={openFile}
            readFile={readFile}
            onSaveFile={saveFile}
            onDirtyChange={controller.setEditingDirty}
            onBack={() => {
              controller.setEditingDirty(false);
              setOpenFile(null);
            }}
          />
        ) : error ? (
          <div className={`${styles.status} ${styles.error}`}>
            <CircleAlertIcon size={14} /> 無法載入：{error}
          </div>
        ) : root === null ? (
          <div className={styles.status}>
            <LoaderCircleIcon size={14} className={styles.spin} /> 載入中…
          </div>
        ) : (
          root.map(entry => (
            <FsNode
              key={entry.path}
              sandboxName={activeSandboxName as string}
              entry={entry}
              depth={0}
              listDir={listDir}
              selectedPath={openFile ? (openFile as FsEntry).path : null}
              onOpenFile={setOpenFile}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default FileExplorerPanel;
