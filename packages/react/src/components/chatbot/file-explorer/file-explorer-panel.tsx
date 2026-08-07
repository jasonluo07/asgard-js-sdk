import { MouseEvent as ReactMouseEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { LaunchedSandbox, SandboxFsListResult } from '@asgard-js/core';
import { FileExplorerController } from '../../../hooks/use-file-explorer-controller';
import { Spinner } from '../../spinner';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { t } from '../../../i18n';
import { useFileExplorerDialog } from './file-explorer-dialog';
import { FileView } from './file-view';
import { ContextMenu, ContextMenuItem } from './context-menu';
import { FsEntry, FsReadFile, FsSaveFile, FsWatchFile } from './types';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  ClipboardPasteIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  FilePlusIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  PackageOpenIcon,
  PencilIcon,
  RefreshIcon,
  ScissorsIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
  ZapIcon,
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
  /** Watch the open file (≈ `fs/watch` SSE) for the FileView's watch-and-reload (AC3). */
  watchFile?: FsWatchFile;
  /** Override the tree root (absolute path); the dropdown + cwd still show the real `workingDirectory` (AC2). */
  basePath?: string;
  /** Nudge an idle sandbox back to life (F-021 AC4); when provided, the empty state shows a Nudge button. */
  onNudge?: () => void | Promise<void>;
  /**
   * Greys out the Nudge button. Pass the host's "a run already holds the channel" state: a nudge is a
   * turn, so it is refused outright while one is in flight (F-023 AC6), and the empty state is on
   * screen during exactly that window — between the send and the sandbox coming up.
   */
  nudgeDisabled?: boolean;
  /** When provided, the header shows a close (X) button (the built-in aside passes `controller.closeExplorer`). */
  onClose?: () => void;
  /**
   * Chrome: `card` = a standalone card (rounded, fully bordered) for consumer-placed panels;
   * `flush` = the built-in aside split into the chat view (no radius, left divider only). Defaults to `card`.
   */
  chrome?: 'card' | 'flush';
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
  const { locale = 'en-US' } = useAsgardTemplateContext();
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
        <Spinner size={12} /> {t(locale, 'fileExplorer.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.status} ${styles.error}`} style={pad}>
        <CircleAlertIcon size={12} /> {t(locale, 'fileExplorer.loadError', { error })}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className={styles.emptyDir} style={pad}>
        {t(locale, 'fileExplorer.emptyDir')}
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
        style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
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
          isOpen ? (
            <FolderOpenIcon size={15} className={styles.nodeIcon} />
          ) : (
            <FolderIcon size={15} className={styles.nodeIcon} />
          )
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
    watchFile,
    basePath,
    mkdir,
    remove,
    copy,
    move,
    upload,
    download,
    onNudge,
    nudgeDisabled,
    onClose,
    chrome = 'card',
  } = props;

  const { locale = 'en-US' } = useAsgardTemplateContext();
  const { dialog, requestInput, requestConfirm } = useFileExplorerDialog(locale);

  const rootClass = `${styles.root} ${chrome === 'flush' ? styles.flush : ''}`;

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
    async (dir: string): Promise<void> => {
      if (!sandboxName || !saveFile) return;

      const name = await requestInput({ title: t(locale, 'fileExplorer.newFilePrompt'), defaultValue: 'untitled.txt' });
      if (!name) return;

      void run(saveFile(sandboxName, joinPath(dir, name), ''), dir);
    },
    [sandboxName, saveFile, run, requestInput, locale],
  );
  const actNewFolder = useCallback(
    async (dir: string): Promise<void> => {
      if (!sandboxName || !mkdir) return;

      const name = await requestInput({ title: t(locale, 'fileExplorer.newFolderPrompt'), defaultValue: 'new-folder' });
      if (!name) return;

      void run(mkdir(sandboxName, joinPath(dir, name)), dir);
    },
    [sandboxName, mkdir, run, requestInput, locale],
  );
  const actRename = useCallback(
    async (entry: FsEntry): Promise<void> => {
      if (!sandboxName || !move) return;

      const name = await requestInput({ title: t(locale, 'fileExplorer.renamePrompt'), defaultValue: entry.name });
      if (!name || name === entry.name) return;

      void run(move(sandboxName, entry.path, joinPath(parentDir(entry.path), name)), parentDir(entry.path));
    },
    [sandboxName, move, run, requestInput, locale],
  );
  const actDelete = useCallback(
    async (entry: FsEntry): Promise<void> => {
      if (!sandboxName || !remove) return;

      const confirmed = await requestConfirm({
        title: t(locale, entry.isDir ? 'fileExplorer.confirmDeleteDir' : 'fileExplorer.confirmDelete', {
          name: entry.name,
        }),
      });
      if (!confirmed) return;

      void run(remove(sandboxName, entry.path, entry.isDir), parentDir(entry.path));
    },
    [sandboxName, remove, run, requestConfirm, locale],
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
    if (!onNudge || nudging || nudgeDisabled) return;

    setNudging(true);
    try {
      await onNudge();
    } catch {
      // A nudge is refused outright while a run holds the channel (F-023 AC6), and the host may reject
      // for its own reasons. Nothing here can act on that, and this runs from a click handler — an
      // uncaught rejection would surface as an unhandled promise rejection rather than anything useful.
    } finally {
      setNudging(false);
    }
  }, [onNudge, nudging, nudgeDisabled]);

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
      <div className={rootClass} ref={rootRef}>
        {onClose && (
          <div className={styles.emptyClose}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label={t(locale, 'fileExplorer.close')}
              title={t(locale, 'header.close')}
            >
              <XIcon size={16} />
            </button>
          </div>
        )}
        <div className={styles.emptyState}>
          <PackageOpenIcon size={30} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>{t(locale, 'fileExplorer.noSandboxTitle')}</div>
          <div className={styles.emptyDesc}>{t(locale, 'fileExplorer.noSandboxDesc')}</div>
          {onNudge && (
            <button type="button" className={styles.nudgeBtn} onClick={handleNudge} disabled={nudging || nudgeDisabled}>
              {nudging ? (
                <>
                  <Spinner size={15} /> {t(locale, 'fileExplorer.waking')}
                </>
              ) : (
                <>
                  <ZapIcon size={15} /> {t(locale, 'fileExplorer.wakeSandbox')}
                </>
              )}
            </button>
          )}
        </div>

        {/*
          The dialog must render on this branch too. The sandbox list is repolled every 15s and drops
          idle-recycled entries, so a pending confirm can land here mid-flight; if the dialog only
          existed on the main branch it would vanish without unmounting the hook, leaving the awaiting
          action pending forever and re-appearing unprompted when a sandbox returns.
        */}
        {dialog}
      </div>
    );
  }

  const root = rootPath as string;
  const targetDir = selectedEntry?.isDir ? selectedEntry.path : root;

  // Shared by the context menu (both variants) and the toolbar button, so the clipboard hint reads
  // identically wherever paste is offered.
  const pasteLabel = clipboard
    ? t(locale, 'fileExplorer.pasteNamed', { name: clipboard.entry.name })
    : t(locale, 'fileExplorer.paste');

  function buildSections(target: MenuTarget): ContextMenuItem[][] {
    const refreshSec: ContextMenuItem[] = [
      {
        key: 'refresh',
        label: t(locale, 'fileExplorer.refresh'),
        icon: <RefreshIcon size={15} />,
        onSelect: bumpRefresh,
      },
    ];

    if (target.kind === 'file') {
      const e = target.entry;

      return [
        [
          {
            key: 'open',
            label: t(locale, 'fileExplorer.open'),
            icon: <EyeIcon size={15} />,
            onSelect: () => setOpenFile(e),
          },
          {
            key: 'download',
            label: t(locale, 'fileExplorer.download'),
            icon: <DownloadIcon size={15} />,
            onSelect: () => actDownload(e),
            disabled: !download,
          },
          {
            key: 'rename',
            label: t(locale, 'fileExplorer.rename'),
            icon: <PencilIcon size={15} />,
            onSelect: () => actRename(e),
            disabled: !move,
          },
        ],
        [
          {
            key: 'copy',
            label: t(locale, 'fileExplorer.copy'),
            icon: <CopyIcon size={15} />,
            onSelect: () => setClipboard({ op: 'copy', entry: e }),
          },
          {
            key: 'cut',
            label: t(locale, 'fileExplorer.cut'),
            icon: <ScissorsIcon size={15} />,
            onSelect: () => setClipboard({ op: 'cut', entry: e }),
          },
        ],
        [
          {
            key: 'delete',
            label: t(locale, 'fileExplorer.delete'),
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
      const isExpanded = expanded.has(e.path);

      return [
        [
          {
            key: 'toggle',
            label: t(locale, isExpanded ? 'fileExplorer.collapse' : 'fileExplorer.expand'),
            icon: isExpanded ? <ChevronDownIcon size={15} /> : <ChevronRightIcon size={15} />,
            onSelect: () => toggleExpand(e.path),
          },
        ],
        [
          {
            key: 'newfile',
            label: t(locale, 'fileExplorer.newFile'),
            icon: <FilePlusIcon size={15} />,
            onSelect: () => actNewFile(e.path),
            disabled: !saveFile,
          },
          {
            key: 'newfolder',
            label: t(locale, 'fileExplorer.newFolder'),
            icon: <FolderPlusIcon size={15} />,
            onSelect: () => actNewFolder(e.path),
            disabled: !mkdir,
          },
          {
            key: 'upload',
            label: t(locale, 'fileExplorer.upload'),
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
            label: t(locale, 'fileExplorer.rename'),
            icon: <PencilIcon size={15} />,
            onSelect: () => actRename(e),
            disabled: !move,
          },
          {
            key: 'copy',
            label: t(locale, 'fileExplorer.copy'),
            icon: <CopyIcon size={15} />,
            onSelect: () => setClipboard({ op: 'copy', entry: e }),
          },
          {
            key: 'cut',
            label: t(locale, 'fileExplorer.cut'),
            icon: <ScissorsIcon size={15} />,
            onSelect: () => setClipboard({ op: 'cut', entry: e }),
          },
        ],
        [
          {
            key: 'delete',
            label: t(locale, 'fileExplorer.delete'),
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
          label: t(locale, 'fileExplorer.newFile'),
          icon: <FilePlusIcon size={15} />,
          onSelect: () => actNewFile(root),
          disabled: !saveFile,
        },
        {
          key: 'newfolder',
          label: t(locale, 'fileExplorer.newFolder'),
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
    <div className={rootClass} ref={rootRef}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <label className={styles.selectWrap}>
            <span className={styles.selectCaret}>
              <ChevronRightIcon size={14} />
            </span>
            <select
              className={styles.select}
              value={activeSandboxName ?? ''}
              onChange={e => controller.selectSandbox(e.target.value)}
              aria-label={t(locale, 'fileExplorer.selectSandbox')}
            >
              {sandboxes.map(s => (
                <option key={s.sandboxName} value={s.sandboxName}>
                  {labelOf(s, sandboxes.length > 1)}
                </option>
              ))}
            </select>
          </label>
          {onClose && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label={t(locale, 'fileExplorer.close')}
              title={t(locale, 'header.close')}
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
        <div className={styles.cwd} title={activeSandbox.workingDirectory}>
          {activeSandbox.workingDirectory}
        </div>
      </div>

      {!openFile && (
        <div className={styles.toolbar} role="toolbar" aria-label={t(locale, 'fileExplorer.toolbar')}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => actNewFolder(targetDir)}
            disabled={!mkdir}
            aria-label={t(locale, 'fileExplorer.newFolder')}
            title={t(locale, 'fileExplorer.newFolder')}
          >
            <FolderPlusIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => actUpload(targetDir)}
            disabled={!upload}
            aria-label={t(locale, 'fileExplorer.upload')}
            title={t(locale, 'fileExplorer.upload')}
          >
            <UploadIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => selectedEntry && actDownload(selectedEntry)}
            disabled={!download || !selectedEntry || selectedEntry.isDir}
            aria-label={t(locale, 'fileExplorer.download')}
            title={t(locale, 'fileExplorer.download')}
          >
            <DownloadIcon size={16} />
          </button>
          <span className={styles.toolSep} aria-hidden />
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => selectedEntry && setClipboard({ op: 'copy', entry: selectedEntry })}
            disabled={!selectedEntry}
            aria-label={t(locale, 'fileExplorer.copy')}
            title={t(locale, 'fileExplorer.copy')}
          >
            <CopyIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => selectedEntry && setClipboard({ op: 'cut', entry: selectedEntry })}
            disabled={!selectedEntry}
            aria-label={t(locale, 'fileExplorer.cut')}
            title={t(locale, 'fileExplorer.cut')}
          >
            <ScissorsIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => actPaste(targetDir)}
            disabled={!clipboard}
            aria-label={t(locale, 'fileExplorer.paste')}
            title={pasteLabel}
          >
            <ClipboardPasteIcon size={16} />
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.toolDanger}`}
            onClick={() => selectedEntry && actDelete(selectedEntry)}
            disabled={!remove || !selectedEntry}
            aria-label={t(locale, 'fileExplorer.delete')}
            title={t(locale, 'fileExplorer.delete')}
          >
            <TrashIcon size={16} />
          </button>
          <span className={styles.toolSpacer} />
          <button
            type="button"
            className={styles.toolBtn}
            onClick={bumpRefresh}
            aria-label={t(locale, 'fileExplorer.refresh')}
            title={t(locale, 'fileExplorer.refresh')}
          >
            <RefreshIcon size={16} />
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
            watchFile={watchFile}
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

      {dialog}
    </div>
  );
}

export default FileExplorerPanel;
