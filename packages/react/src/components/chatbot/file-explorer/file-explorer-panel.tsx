import { MouseEvent as ReactMouseEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { LaunchedSandbox, SandboxFsListResult } from '@asgard-js/core';
import { FileExplorerController } from '../../../hooks/use-file-explorer-controller';
import { FileView } from './file-view';
import { ContextMenu, ContextMenuItem } from './context-menu';
import { FsEntry, FsReadFile, FsSaveFile } from './types';
import {
  ChevronRightIcon,
  CircleAlertIcon,
  ClipboardPasteIcon,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  FilePlusIcon,
  FolderIcon,
  FolderPlusIcon,
  LoaderCircleIcon,
  PencilIcon,
  RefreshIcon,
  ScissorsIcon,
  TrashIcon,
  UploadIcon,
} from './icons';
import styles from './file-explorer-panel.module.scss';

/** List a directory (≈ `GET fs/list`). */
export type FsListDir = (sandboxName: string, path: string) => Promise<SandboxFsListResult>;

/** F-021 Cycle 2 — optional fs mutation callbacks; when omitted the corresponding action is unavailable. */
export interface FileExplorerMutations {
  mkdir?: (sandboxName: string, path: string) => Promise<void>;
  remove?: (sandboxName: string, path: string, isDir: boolean) => Promise<void>;
  copy?: (sandboxName: string, src: string, dst: string) => Promise<void>;
  move?: (sandboxName: string, src: string, dst: string) => Promise<void>;
  upload?: (sandboxName: string, dirPath: string, file: File) => Promise<void>;
  download?: (sandboxName: string, path: string, name: string) => Promise<void>;
}

export interface FileExplorerPanelProps extends FileExplorerMutations {
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
  /** Nudge an idle sandbox back to life (F-021 AC4); when provided, the empty state shows a Nudge button. */
  onNudge?: () => void | Promise<void>;
}

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/$/, '')}/${name}`;
}

function baseName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

function parentDir(path: string): string {
  const norm = path.replace(/\/+$/, '');
  const i = norm.lastIndexOf('/');

  return i > 0 ? norm.slice(0, i) : '/';
}

function labelOf(sandbox: LaunchedSandbox, multiple: boolean): string {
  const label = sandbox.sandboxBlueprintName || sandbox.sandboxName;

  return multiple ? `${label} · ${sandbox.sandboxName}` : label;
}

/** Dirs whose expansion reveals `filePath` under `root` (excludes root + the file itself) — for the AC9 reveal. */
function ancestorDirs(root: string, filePath: string): string[] {
  const normRoot = root.replace(/\/+$/, '');
  if (!filePath.startsWith(normRoot)) return [];

  const parts = filePath.slice(normRoot.length).split('/').filter(Boolean);
  parts.pop();

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

type Clipboard = { op: 'copy' | 'cut'; entry: FsEntry } | null;
type MenuTarget = { kind: 'file' | 'dir'; entry: FsEntry } | { kind: 'background' };

interface DirChildrenProps {
  sandboxName: string;
  dirPath: string;
  depth: number;
  listDir: FsListDir;
  refreshKey: number;
  expanded: Set<string>;
  selectedPath: string | null;
  cutPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (entry: FsEntry) => void;
  onOpen: (entry: FsEntry) => void;
  onContext: (e: ReactMouseEvent, entry: FsEntry) => void;
}

/** One directory level; lazily lists its children, sorted dirs-first then by name. */
function DirChildren(props: DirChildrenProps): ReactNode {
  const { sandboxName, dirPath, depth, listDir, refreshKey } = props;
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
        <TreeNode key={entry.path} {...props} entry={entry} />
      ))}
    </>
  );
}

interface TreeNodeProps extends Omit<DirChildrenProps, 'dirPath'> {
  entry: FsEntry;
}

/** A tree row: single-click selects (a dir also toggles); double-click opens a file; right-click → menu. */
function TreeNode(props: TreeNodeProps): ReactNode {
  const { entry, depth, expanded, selectedPath, cutPath, onToggle, onSelect, onOpen, onContext } = props;
  const isOpen = entry.isDir && expanded.has(entry.path);
  const selected = selectedPath === entry.path;
  const isCut = cutPath === entry.path;

  const onClick = (): void => {
    onSelect(entry);
    if (entry.isDir) onToggle(entry.path);
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.node} ${selected ? styles.selected : ''} ${isCut ? styles.cut : ''}`}
        style={{ paddingLeft: `${0.25 + depth * 0.85}rem` }}
        onClick={onClick}
        onDoubleClick={() => !entry.isDir && onOpen(entry)}
        onContextMenu={e => onContext(e, entry)}
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

      {entry.isDir && isOpen && <DirChildren {...props} dirPath={entry.path} depth={depth + 1} />}
    </>
  );
}

/**
 * The sandbox File Explorer panel (F-021): dropdown + lazy tree rooted at `workingDirectory` (overridable
 * via `basePath`), a single-panel FileView on open, and (Cycle 2) a toolbar + right-click context menu +
 * copy/cut/paste clipboard wired to the fs mutation providers. Single-click selects (a dir toggles);
 * double-click / an open-file intent opens the file.
 */
export function FileExplorerPanel(props: FileExplorerPanelProps): ReactNode {
  const {
    sandboxes,
    controller,
    listDir,
    readFile,
    saveFile,
    basePath,
    mkdir,
    remove,
    copy,
    move,
    upload,
    download,
    onNudge,
  } = props;

  const activeSandboxName = controller.activeSandboxName ?? sandboxes[0]?.sandboxName ?? null;
  const activeSandbox = sandboxes.find(s => s.sandboxName === activeSandboxName) ?? null;

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<FsEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openFile, setOpenFile] = useState<FsEntry | null>(null);
  const [clipboard, setClipboard] = useState<Clipboard>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; target: MenuTarget } | null>(null);
  const [nudging, setNudging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const uploadDirRef = useRef<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const rootPath = basePath ?? activeSandbox?.workingDirectory ?? null;
  const sandboxName = activeSandboxName;
  const hasMutations = Boolean(mkdir || remove || copy || move || upload);

  const bumpRefresh = useCallback((): void => setRefreshKey(k => k + 1), []);
  const closeMenu = useCallback((): void => setMenu(null), []);

  const toggleExpand = useCallback((path: string): void => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);

      return next;
    });
  }, []);
  const expand = useCallback((path: string): void => setExpanded(prev => new Set(prev).add(path)), []);

  const onSelect = useCallback((entry: FsEntry): void => {
    setSelectedPath(entry.path);
    setSelectedEntry(entry);
  }, []);

  useEffect(() => {
    setExpanded(new Set());
    setSelectedPath(null);
    setSelectedEntry(null);
    setOpenFile(null);
    setMenu(null);
  }, [activeSandboxName]);

  // open-file intent (AC9): expand ancestors + highlight + open in the FileView.
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

  // --- actions (toolbar + context menu share these) ---
  const run = useCallback(
    async (p: Promise<void> | void, affectedDir?: string): Promise<void> => {
      try {
        await Promise.resolve(p);
        if (affectedDir) expand(affectedDir);

        bumpRefresh();
      } catch {
        // Surface via the tree's own error rows on refetch; nothing to roll back here.
        bumpRefresh();
      }
    },
    [expand, bumpRefresh],
  );

  const actNewFile = useCallback(
    (dir: string): void => {
      if (!sandboxName || !saveFile) return;

      const name = window.prompt('新檔名', 'untitled.txt');
      if (!name) return;

      void run(saveFile(sandboxName, joinPath(dir, name), ''), dir);
    },
    [sandboxName, saveFile, run],
  );
  const actNewFolder = useCallback(
    (dir: string): void => {
      if (!sandboxName || !mkdir) return;

      const name = window.prompt('新資料夾名稱', 'new-folder');
      if (!name) return;

      void run(mkdir(sandboxName, joinPath(dir, name)), dir);
    },
    [sandboxName, mkdir, run],
  );
  const actRename = useCallback(
    (entry: FsEntry): void => {
      if (!sandboxName || !move) return;

      const name = window.prompt('重新命名', entry.name);
      if (!name || name === entry.name) return;

      void run(move(sandboxName, entry.path, joinPath(parentDir(entry.path), name)), parentDir(entry.path));
    },
    [sandboxName, move, run],
  );
  const actDelete = useCallback(
    (entry: FsEntry): void => {
      if (!sandboxName || !remove) return;

      if (!window.confirm(`確定刪除「${entry.name}」?${entry.isDir ? '（含目錄下所有內容）' : ''}`)) return;

      void run(remove(sandboxName, entry.path, entry.isDir), parentDir(entry.path));
    },
    [sandboxName, remove, run],
  );
  const actPaste = useCallback(
    (dstDir: string): void => {
      if (!sandboxName || !clipboard) return;

      const dst = joinPath(dstDir, clipboard.entry.name);
      if (clipboard.op === 'copy') {
        if (copy) void run(copy(sandboxName, clipboard.entry.path, dst), dstDir);
      } else if (move) {
        void run(move(sandboxName, clipboard.entry.path, dst), dstDir);
        setClipboard(null);
      }
    },
    [sandboxName, clipboard, copy, move, run],
  );
  const actUpload = useCallback((dir: string): void => {
    uploadDirRef.current = dir;
    uploadInputRef.current?.click();
  }, []);
  const onUploadPicked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      const dir = uploadDirRef.current;
      e.target.value = '';
      if (!file || !dir || !sandboxName || !upload) return;

      void run(upload(sandboxName, dir, file), dir);
    },
    [sandboxName, upload, run],
  );
  const actDownload = useCallback(
    (entry: FsEntry): void => {
      if (sandboxName && download) void download(sandboxName, entry.path, entry.name);
    },
    [sandboxName, download],
  );

  const handleNudge = useCallback(async (): Promise<void> => {
    if (!onNudge || nudging) return;

    setNudging(true);
    try {
      await onNudge();
    } finally {
      setNudging(false);
    }
  }, [onNudge, nudging]);

  const openContext = useCallback((e: ReactMouseEvent, target: MenuTarget): void => {
    e.preventDefault();
    e.stopPropagation();
    const rect = rootRef.current?.getBoundingClientRect();
    setMenu({ x: rect ? e.clientX - rect.left : e.clientX, y: rect ? e.clientY - rect.top : e.clientY, target });
    if (target.kind !== 'background') {
      setSelectedPath(target.entry.path);
      setSelectedEntry(target.entry);
    }
  }, []);

  if (sandboxes.length === 0 || !activeSandbox) {
    return (
      <div className={styles.root}>
        <div className={styles.emptyState}>
          <p>目前沒有執行中的 sandbox。</p>
          {onNudge && (
            <button type="button" className={styles.nudgeBtn} onClick={handleNudge} disabled={nudging}>
              {nudging ? (
                <>
                  <LoaderCircleIcon size={14} className={styles.spin} /> 喚醒中…
                </>
              ) : (
                '喚醒 sandbox'
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  const root = rootPath as string;
  const targetDir = selectedEntry?.isDir ? selectedEntry.path : root;

  function buildSections(target: MenuTarget): ContextMenuItem[][] {
    const pasteLabel = clipboard ? `貼上「${clipboard.entry.name}」` : '貼上';
    const refreshSec: ContextMenuItem[] = [
      { key: 'refresh', label: '重新整理', icon: <RefreshIcon size={15} />, onSelect: bumpRefresh },
    ];

    if (target.kind === 'file') {
      const e = target.entry;

      return [
        [
          {
            key: 'download',
            label: '下載',
            icon: <DownloadIcon size={15} />,
            onSelect: () => actDownload(e),
            disabled: !download,
          },
          {
            key: 'rename',
            label: '重新命名',
            icon: <PencilIcon size={15} />,
            onSelect: () => actRename(e),
            disabled: !move,
          },
        ],
        [
          {
            key: 'copy',
            label: '複製',
            icon: <CopyIcon size={15} />,
            onSelect: () => setClipboard({ op: 'copy', entry: e }),
          },
          {
            key: 'cut',
            label: '剪下',
            icon: <ScissorsIcon size={15} />,
            onSelect: () => setClipboard({ op: 'cut', entry: e }),
          },
        ],
        [
          {
            key: 'delete',
            label: '刪除',
            icon: <TrashIcon size={15} />,
            danger: true,
            onSelect: () => actDelete(e),
            disabled: !remove,
          },
        ],
        refreshSec,
      ];
    }

    if (target.kind === 'dir') {
      const e = target.entry;

      return [
        [
          {
            key: 'newfile',
            label: '新增檔案',
            icon: <FilePlusIcon size={15} />,
            onSelect: () => actNewFile(e.path),
            disabled: !saveFile,
          },
          {
            key: 'newfolder',
            label: '新增資料夾',
            icon: <FolderPlusIcon size={15} />,
            onSelect: () => actNewFolder(e.path),
            disabled: !mkdir,
          },
          {
            key: 'upload',
            label: '上傳',
            icon: <UploadIcon size={15} />,
            onSelect: () => actUpload(e.path),
            disabled: !upload,
          },
          {
            key: 'paste',
            label: pasteLabel,
            icon: <ClipboardPasteIcon size={15} />,
            onSelect: () => actPaste(e.path),
            disabled: !clipboard,
          },
        ],
        [
          {
            key: 'rename',
            label: '重新命名',
            icon: <PencilIcon size={15} />,
            onSelect: () => actRename(e),
            disabled: !move,
          },
          {
            key: 'copy',
            label: '複製',
            icon: <CopyIcon size={15} />,
            onSelect: () => setClipboard({ op: 'copy', entry: e }),
          },
          {
            key: 'cut',
            label: '剪下',
            icon: <ScissorsIcon size={15} />,
            onSelect: () => setClipboard({ op: 'cut', entry: e }),
          },
        ],
        [
          {
            key: 'delete',
            label: '刪除',
            icon: <TrashIcon size={15} />,
            danger: true,
            onSelect: () => actDelete(e),
            disabled: !remove,
          },
        ],
        refreshSec,
      ];
    }

    return [
      [
        {
          key: 'newfile',
          label: '新增檔案',
          icon: <FilePlusIcon size={15} />,
          onSelect: () => actNewFile(root),
          disabled: !saveFile,
        },
        {
          key: 'newfolder',
          label: '新增資料夾',
          icon: <FolderPlusIcon size={15} />,
          onSelect: () => actNewFolder(root),
          disabled: !mkdir,
        },
        {
          key: 'paste',
          label: pasteLabel,
          icon: <ClipboardPasteIcon size={15} />,
          onSelect: () => actPaste(root),
          disabled: !clipboard,
        },
      ],
      refreshSec,
    ];
  }

  return (
    <div className={styles.root} ref={rootRef}>
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
        <button type="button" className={styles.iconBtn} onClick={bumpRefresh} aria-label="重新整理" title="重新整理">
          <RefreshIcon size={15} />
        </button>
      </div>

      <div className={styles.cwd} title={activeSandbox.workingDirectory}>
        {activeSandbox.workingDirectory}
      </div>

      {!openFile && hasMutations && (
        <div className={styles.toolbar} role="toolbar" aria-label="檔案操作">
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => actNewFolder(targetDir)}
            disabled={!mkdir}
            aria-label="新增資料夾"
            title="新增資料夾"
          >
            <FolderPlusIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => actUpload(targetDir)}
            disabled={!upload}
            aria-label="上傳"
            title="上傳"
          >
            <UploadIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => selectedEntry && actDownload(selectedEntry)}
            disabled={!download || !selectedEntry || selectedEntry.isDir}
            aria-label="下載"
            title="下載"
          >
            <DownloadIcon size={16} />
          </button>
          <span className={styles.toolSep} aria-hidden />
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => selectedEntry && setClipboard({ op: 'copy', entry: selectedEntry })}
            disabled={!selectedEntry}
            aria-label="複製"
            title="複製"
          >
            <CopyIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => selectedEntry && setClipboard({ op: 'cut', entry: selectedEntry })}
            disabled={!selectedEntry}
            aria-label="剪下"
            title="剪下"
          >
            <ScissorsIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => actPaste(targetDir)}
            disabled={!clipboard}
            aria-label="貼上"
            title={clipboard ? `貼上「${clipboard.entry.name}」` : '貼上'}
          >
            <ClipboardPasteIcon size={16} />
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.toolDanger}`}
            onClick={() => selectedEntry && actDelete(selectedEntry)}
            disabled={!remove || !selectedEntry}
            aria-label="刪除"
            title="刪除"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      )}

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
          <div className={styles.tree} onContextMenu={e => openContext(e, { kind: 'background' })}>
            <DirChildren
              key={`${activeSandboxName}:${rootPath}:${refreshKey}`}
              sandboxName={activeSandboxName as string}
              dirPath={rootPath}
              depth={0}
              listDir={listDir}
              refreshKey={refreshKey}
              expanded={expanded}
              selectedPath={selectedPath}
              cutPath={clipboard?.op === 'cut' ? clipboard.entry.path : null}
              onToggle={toggleExpand}
              onSelect={onSelect}
              onOpen={setOpenFile}
              onContext={(e, entry) => openContext(e, { kind: entry.isDir ? 'dir' : 'file', entry })}
            />
          </div>
        )}
      </div>

      {!openFile && menu && (
        <ContextMenu x={menu.x} y={menu.y} sections={buildSections(menu.target)} onClose={closeMenu} />
      )}

      <input ref={uploadInputRef} type="file" hidden onChange={onUploadPicked} />
    </div>
  );
}

export default FileExplorerPanel;
