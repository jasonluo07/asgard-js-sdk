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
  /** Override the tree root (absolute path); the dropdown + cwd still show the real `workingDirectory` (AC2). */
  basePath?: string;
}

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/$/, '')}/${name}`;
}

function labelOf(sandbox: LaunchedSandbox, multiple: boolean): string {
  const label = sandbox.sandboxBlueprintName || sandbox.sandboxName;

  return multiple ? `${label} · ${sandbox.sandboxName}` : label;
}

function baseName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

/** Dirs whose expansion reveals `filePath` under `root` (excludes root + the file itself) — for the AC9 reveal. */
function ancestorDirs(root: string, filePath: string): string[] {
  const normRoot = root.replace(/\/+$/, '');
  if (!filePath.startsWith(normRoot)) return [];

  const parts = filePath.slice(normRoot.length).split('/').filter(Boolean);
  parts.pop(); // drop the file name

  const dirs: string[] = [];
  let cur = normRoot;
  for (const part of parts) {
    cur = `${cur}/${part}`;
    dirs.push(cur);
  }

  return dirs;
}

/** Dirs first, then by name — a stable, predictable tree ordering (mirrors the prototype). */
function sortEntries(entries: FsEntry[]): FsEntry[] {
  return [...entries].sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
}

interface DirChildrenProps {
  sandboxName: string;
  dirPath: string;
  depth: number;
  listDir: FsListDir;
  refreshKey: number;
  expanded: Set<string>;
  selectedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (entry: FsEntry) => void;
  onOpen: (entry: FsEntry) => void;
}

/** One directory level; lazily lists its children, sorted dirs-first then by name. */
function DirChildren({
  sandboxName,
  dirPath,
  depth,
  listDir,
  refreshKey,
  expanded,
  selectedPath,
  onToggle,
  onSelect,
  onOpen,
}: DirChildrenProps): ReactNode {
  const [entries, setEntries] = useState<FsEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.resolve(listDir(sandboxName, dirPath))
      .then(result => {
        if (cancelled) return;

        setEntries(sortEntries(result.entries.map(e => ({ ...e, path: joinPath(dirPath, e.name) }))));
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return (): void => {
      cancelled = true;
    };
  }, [sandboxName, dirPath, refreshKey, listDir]);

  const pad = { paddingLeft: `${0.5 + depth * 0.85}rem` };

  if (loading) {
    return (
      <div className={styles.status} style={pad}>
        <LoaderCircleIcon size={12} className={styles.spin} /> 載入中…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.status} ${styles.error}`} style={pad}>
        <CircleAlertIcon size={12} /> {error}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className={styles.emptyDir} style={pad}>
        （空目錄）
      </div>
    );
  }

  return (
    <>
      {entries.map(entry => (
        <TreeNode
          key={entry.path}
          sandboxName={sandboxName}
          entry={entry}
          depth={depth}
          listDir={listDir}
          refreshKey={refreshKey}
          expanded={expanded}
          selectedPath={selectedPath}
          onToggle={onToggle}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}

interface TreeNodeProps extends Omit<DirChildrenProps, 'dirPath'> {
  entry: FsEntry;
}

/** A tree row: single-click selects (a dir also toggles); double-click opens a file in the FileView. */
function TreeNode({
  sandboxName,
  entry,
  depth,
  listDir,
  refreshKey,
  expanded,
  selectedPath,
  onToggle,
  onSelect,
  onOpen,
}: TreeNodeProps): ReactNode {
  const isOpen = entry.isDir && expanded.has(entry.path);
  const selected = selectedPath === entry.path;

  const onClick = (): void => {
    onSelect(entry);
    if (entry.isDir) onToggle(entry.path);
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.node} ${selected ? styles.selected : ''}`}
        style={{ paddingLeft: `${0.25 + depth * 0.85}rem` }}
        onClick={onClick}
        onDoubleClick={() => !entry.isDir && onOpen(entry)}
        title={entry.path}
      >
        {entry.isDir ? (
          <ChevronRightIcon size={14} className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
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

      {entry.isDir && isOpen && (
        <DirChildren
          sandboxName={sandboxName}
          dirPath={entry.path}
          depth={depth + 1}
          listDir={listDir}
          refreshKey={refreshKey}
          expanded={expanded}
          selectedPath={selectedPath}
          onToggle={onToggle}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      )}
    </>
  );
}

/**
 * The sandbox File Explorer panel (F-021, Cycle 1): a live-sandbox dropdown, a lazy file tree rooted at the
 * active sandbox's `workingDirectory` (overridable via `basePath`; the dropdown + cwd still show the real
 * `workingDirectory`), and a single-panel FileView on open. Single-click selects (a dir also toggles);
 * double-click / an open-file intent opens the file. Mutations / context menu / `fs/watch` are Cycle 2.
 */
export function FileExplorerPanel(props: FileExplorerPanelProps): ReactNode {
  const { sandboxes, controller, listDir, readFile, saveFile, basePath } = props;

  const activeSandboxName = controller.activeSandboxName ?? sandboxes[0]?.sandboxName ?? null;
  const activeSandbox = sandboxes.find(s => s.sandboxName === activeSandboxName) ?? null;

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openFile, setOpenFile] = useState<FsEntry | null>(null);

  // The tree root: `basePath` overrides it, but the dropdown + cwd still show the real workingDirectory (AC2).
  const rootPath = basePath ?? activeSandbox?.workingDirectory ?? null;

  const toggleExpand = useCallback((path: string): void => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);

      return next;
    });
  }, []);

  const onSelect = useCallback((entry: FsEntry): void => setSelectedPath(entry.path), []);

  // Reset tree state when the active sandbox changes.
  useEffect(() => {
    setExpanded(new Set());
    setSelectedPath(null);
    setOpenFile(null);
  }, [activeSandboxName]);

  // open-file intent (AC9): when the controller's requestedFile changes (nonce) for the active sandbox,
  // expand ancestor dirs + highlight + open it in the FileView.
  useEffect(() => {
    const rf = controller.requestedFile;
    if (!rf || rf.sandboxName !== activeSandboxName || !rootPath) return;

    setExpanded(prev => {
      const next = new Set(prev);
      ancestorDirs(rootPath, rf.absolutePath).forEach(d => next.add(d));

      return next;
    });
    setSelectedPath(rf.absolutePath);
    setOpenFile({
      name: baseName(rf.absolutePath),
      path: rf.absolutePath,
      isDir: false,
      sizeBytes: 0,
      mtimeUnix: 0,
      mode: 0,
    });
  }, [controller.requestedFile, activeSandboxName, rootPath]);

  if (sandboxes.length === 0 || !activeSandbox) {
    // Cycle-1 empty state (the Nudge button is Cycle 2, gated on `action=NUDGE`).
    return (
      <div className={styles.root}>
        <div className={styles.emptyState}>目前沒有執行中的 sandbox。</div>
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
              {labelOf(s, sandboxes.length > 1)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setRefreshKey(k => k + 1)}
          aria-label="重新整理"
          title="重新整理"
        >
          <RefreshIcon size={15} />
        </button>
      </div>

      {/* cwd always shows the sandbox's real workingDirectory, even when basePath overrides the tree root (AC2). */}
      <div className={styles.cwd} title={activeSandbox.workingDirectory}>
        {activeSandbox.workingDirectory}
      </div>

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
        ) : rootPath === null ? null : (
          <DirChildren
            key={`${activeSandboxName}:${rootPath}:${refreshKey}`}
            sandboxName={activeSandboxName as string}
            dirPath={rootPath}
            depth={0}
            listDir={listDir}
            refreshKey={refreshKey}
            expanded={expanded}
            selectedPath={selectedPath}
            onToggle={toggleExpand}
            onSelect={onSelect}
            onOpen={setOpenFile}
          />
        )}
      </div>
    </div>
  );
}

export default FileExplorerPanel;
