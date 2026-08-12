import {
  createContext,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FileExplorerController, SourceViewState } from '../../hooks/use-file-explorer-controller';
import { useAsgardTemplateContext } from '../../context/asgard-template-context';
import { Locale, t } from '../../i18n';
import { useFileExplorerDialog } from './file-explorer-dialog';
import { ancestorDirs, baseName, joinPath, parentDir, uniqueName } from './paths';
import { FsEntry, FsProviders, FsSource } from './types';

export type Clipboard = { op: 'copy' | 'cut'; entry: FsEntry } | null;
export type MenuTarget = { kind: 'file' | 'dir'; entry: FsEntry } | { kind: 'background' };
export type OpenMenu = { x: number; y: number; target: MenuTarget } | null;

/**
 * Everything the File Explorer parts need. Holding it here — rather than inside one panel component —
 * is what lets a consumer assemble a different explorer (Sindri's directory tab has no source picker
 * and no sandbox nudge) while every behavior below stays shared and identical.
 */
export interface FileExplorerContextValue {
  // --- inputs ---
  sources: FsSource[];
  activeSource: FsSource | null;
  activeSourceId: string | null;
  /** The tree root for the active source (`basePath` override wins). `null` when there is no source. */
  rootPath: string | null;
  providers: FsProviders;
  controller: FileExplorerController;
  locale: Locale;
  onClose?: () => void;
  onNudge?: () => void | Promise<void>;
  nudgeDisabled?: boolean;

  // --- state ---
  expanded: Set<string>;
  selectedPath: string | null;
  selectedEntry: FsEntry | null;
  /** Bumped to force every mounted directory level to re-list. */
  refreshKey: number;
  openFile: FsEntry | null;
  clipboard: Clipboard;
  menu: OpenMenu;
  nudging: boolean;
  /** The directory actions target: the selected dir, else the root. */
  targetDir: string;
  /** Shared so the paste hint reads identically in the toolbar and both context-menu variants. */
  pasteLabel: string;

  // --- refs owned by <FileExplorerRoot> ---
  rootRef: RefObject<HTMLDivElement | null>;
  uploadInputRef: RefObject<HTMLInputElement | null>;

  // --- actions ---
  setOpenFile: (entry: FsEntry | null) => void;
  setClipboard: (clipboard: Clipboard) => void;
  closeMenu: () => void;
  openContext: (event: ReactMouseEvent, target: MenuTarget) => void;
  bumpRefresh: () => void;
  toggleExpand: (path: string) => void;
  onSelect: (entry: FsEntry) => void;
  actNewFile: (dir: string) => Promise<void>;
  actNewFolder: (dir: string) => Promise<void>;
  actRename: (entry: FsEntry) => Promise<void>;
  actDelete: (entry: FsEntry) => Promise<void>;
  actPaste: (dstDir: string) => Promise<void>;
  actUpload: (dir: string) => void;
  actDownload: (entry: FsEntry) => void;
  onUploadPicked: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleNudge: () => Promise<void>;

  /** The confirm / prompt dialog element; `<FileExplorerRoot>` always mounts it. */
  dialog: ReactNode;
}

const FileExplorerContext = createContext<FileExplorerContextValue | null>(null);

/**
 * Read the explorer's shared state. Throws outside a provider rather than falling back to defaults —
 * a part rendered in the wrong tree used to fail silently and cosmetically (Sindri once shipped a
 * light-on-dark panel and an English-only panel inside an otherwise translated app, both because a
 * context was quietly missing), which is far harder to notice than a thrown error.
 */
export function useFileExplorer(): FileExplorerContextValue {
  const value = useContext(FileExplorerContext);
  if (!value) {
    throw new Error('File Explorer parts must be rendered inside <FileExplorer.Provider>.');
  }

  return value;
}

export interface FileExplorerProviderProps {
  /** Browsable sources. The picker lists them; with one source there is nothing to pick. */
  sources: FsSource[];
  /** Shared controller — header toggle / open-file card / a consumer-placed panel all bind one. */
  controller: FileExplorerController;
  /** What this explorer can do against a source. Only `listDir` is required. */
  providers: FsProviders;
  /** Override the tree root (absolute path); the source's own `rootPath` still shows as the cwd (AC2). */
  basePath?: string;
  /** Nudge an idle sandbox back to life (F-021 AC4); when provided, the empty state shows a Nudge button. */
  onNudge?: () => void | Promise<void>;
  /** Greys out the Nudge button — pass the host's "a run already holds the channel" state (F-023 AC6). */
  nudgeDisabled?: boolean;
  /** When provided, the header shows a close (X) button. */
  onClose?: () => void;
  children: ReactNode;
}

export function FileExplorerProvider(props: FileExplorerProviderProps): ReactNode {
  const { sources, controller, providers, basePath, onNudge, nudgeDisabled, onClose, children } = props;
  const { listDir, saveFile, mkdir, remove, copy, move, upload, download } = providers;

  const { locale = 'en-US' } = useAsgardTemplateContext();
  const { dialog, requestInput, requestConfirm } = useFileExplorerDialog(locale);

  const activeSourceId = controller.activeSourceId ?? sources[0]?.id ?? null;
  const activeSource = sources.find(s => s.id === activeSourceId) ?? null;

  // Which directories are unfolded / what is selected / which file is open lives on the controller,
  // keyed by source (F-027 AC8). Two consequences fall out of that one move: switching sources shows
  // that source's own history instead of a wiped tree, and a host that remounts the panel (Sindri
  // rebuilds its conversation subtree on every conversation switch) can hold the controller above the
  // remount and keep the view. Everything below reads and writes it exactly like local state.
  const { expanded, selectedPath, selectedEntry, openFile } = controller.sourceView(activeSourceId);
  const updateView = useCallback(
    (update: (prev: SourceViewState) => SourceViewState): void => {
      if (!activeSourceId) return;

      controller.updateSourceView(activeSourceId, update);
    },
    [controller, activeSourceId],
  );

  const [refreshKey, setRefreshKey] = useState(0);
  const [clipboard, setClipboard] = useState<Clipboard>(null);
  const [menu, setMenu] = useState<OpenMenu>(null);
  const [nudging, setNudging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const uploadDirRef = useRef<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const rootPath = basePath ?? activeSource?.rootPath ?? null;

  const bumpRefresh = useCallback((): void => setRefreshKey(k => k + 1), []);
  const closeMenu = useCallback((): void => setMenu(null), []);

  const toggleExpand = useCallback(
    (path: string): void => {
      updateView(prev => {
        const next = new Set(prev.expanded);
        if (next.has(path)) next.delete(path);
        else next.add(path);

        return { ...prev, expanded: next };
      });
    },
    [updateView],
  );
  const expand = useCallback(
    (path: string): void => updateView(prev => ({ ...prev, expanded: new Set(prev.expanded).add(path) })),
    [updateView],
  );

  const onSelect = useCallback(
    (entry: FsEntry): void => updateView(prev => ({ ...prev, selectedPath: entry.path, selectedEntry: entry })),
    [updateView],
  );

  const setOpenFile = useCallback(
    (entry: FsEntry | null): void => updateView(prev => ({ ...prev, openFile: entry })),
    [updateView],
  );

  // The context menu is per-interaction chrome, not part of a source's remembered view — a menu left
  // open while the source changes is stale in a way "where was I" state is not.
  useEffect(() => {
    setMenu(null);
  }, [activeSourceId]);

  // open-file intent (AC9): expand ancestors + highlight + open in the FileView.
  useEffect(() => {
    const rf = controller.requestedFile;
    if (!rf || rf.sourceId !== activeSourceId || !rootPath) return;

    updateView(prev => {
      const next = new Set(prev.expanded);
      ancestorDirs(rootPath, rf.absolutePath).forEach(d => next.add(d));

      return {
        ...prev,
        expanded: next,
        selectedPath: rf.absolutePath,
        openFile: {
          name: baseName(rf.absolutePath),
          path: rf.absolutePath,
          isDir: false,
          sizeBytes: 0,
          mtimeUnix: 0,
          mode: 0,
        },
      };
    });
  }, [controller.requestedFile, activeSourceId, rootPath, updateView]);

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
      if (!activeSourceId || !saveFile) return;

      const name = await requestInput({ title: t(locale, 'fileExplorer.newFilePrompt'), defaultValue: 'untitled.txt' });
      if (!name) return;

      void run(saveFile(activeSourceId, joinPath(dir, name), ''), dir);
    },
    [activeSourceId, saveFile, run, requestInput, locale],
  );
  const actNewFolder = useCallback(
    async (dir: string): Promise<void> => {
      if (!activeSourceId || !mkdir) return;

      const name = await requestInput({ title: t(locale, 'fileExplorer.newFolderPrompt'), defaultValue: 'new-folder' });
      if (!name) return;

      void run(mkdir(activeSourceId, joinPath(dir, name)), dir);
    },
    [activeSourceId, mkdir, run, requestInput, locale],
  );
  const actRename = useCallback(
    async (entry: FsEntry): Promise<void> => {
      if (!activeSourceId || !move) return;

      const name = await requestInput({ title: t(locale, 'fileExplorer.renamePrompt'), defaultValue: entry.name });
      if (!name || name === entry.name) return;

      void run(move(activeSourceId, entry.path, joinPath(parentDir(entry.path), name)), parentDir(entry.path));
    },
    [activeSourceId, move, run, requestInput, locale],
  );
  const actDelete = useCallback(
    async (entry: FsEntry): Promise<void> => {
      if (!activeSourceId || !remove) return;

      const confirmed = await requestConfirm({
        title: t(locale, entry.isDir ? 'fileExplorer.confirmDeleteDir' : 'fileExplorer.confirmDelete', {
          name: entry.name,
        }),
      });
      if (!confirmed) return;

      void run(remove(activeSourceId, entry.path, entry.isDir), parentDir(entry.path));
    },
    [activeSourceId, remove, run, requestConfirm, locale],
  );
  const actPaste = useCallback(
    async (dstDir: string): Promise<void> => {
      if (!activeSourceId || !clipboard) return;

      const { op, entry } = clipboard;
      // Cutting and pasting into the same folder is a no-op, not a collision — deduplicating it would
      // silently rename the item the user only meant to leave where it was.
      if (op === 'cut' && parentDir(entry.path) === dstDir) {
        setClipboard(null);

        return;
      }

      // Ask the destination what it already holds. If the listing fails, fall back to the plain name:
      // a 409 from the backend is a worse outcome than a wrong-looking suffix, but a failed *listing*
      // says nothing about whether the name is taken, so inventing a suffix would be the wrong guess.
      let name = entry.name;
      try {
        const listing = await listDir(activeSourceId, dstDir);
        name = uniqueName(new Set(listing.entries.map(e => e.name)), entry.name);
      } catch {
        name = entry.name;
      }

      const dst = joinPath(dstDir, name);
      if (op === 'copy') {
        if (copy) void run(copy(activeSourceId, entry.path, dst), dstDir);
      } else if (move) {
        void run(move(activeSourceId, entry.path, dst), dstDir);
        setClipboard(null);
      }
    },
    [activeSourceId, clipboard, copy, move, listDir, run],
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
      if (!file || !dir || !activeSourceId || !upload) return;

      void run(upload(activeSourceId, dir, file), dir);
    },
    [activeSourceId, upload, run],
  );
  const actDownload = useCallback(
    (entry: FsEntry): void => {
      if (activeSourceId && download) void download(activeSourceId, entry.path, entry.name);
    },
    [activeSourceId, download],
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

  const openContext = useCallback(
    (e: ReactMouseEvent, target: MenuTarget): void => {
      e.preventDefault();
      e.stopPropagation();
      const rect = rootRef.current?.getBoundingClientRect();
      setMenu({ x: rect ? e.clientX - rect.left : e.clientX, y: rect ? e.clientY - rect.top : e.clientY, target });
      if (target.kind !== 'background') {
        updateView(prev => ({ ...prev, selectedPath: target.entry.path, selectedEntry: target.entry }));
      }
    },
    [updateView],
  );

  const targetDir = selectedEntry?.isDir ? selectedEntry.path : rootPath ?? '/';
  const pasteLabel = clipboard
    ? t(locale, 'fileExplorer.pasteNamed', { name: clipboard.entry.name })
    : t(locale, 'fileExplorer.paste');

  const value = useMemo<FileExplorerContextValue>(
    () => ({
      sources,
      activeSource,
      activeSourceId,
      rootPath,
      providers,
      controller,
      locale,
      onClose,
      onNudge,
      nudgeDisabled,
      expanded,
      selectedPath,
      selectedEntry,
      refreshKey,
      openFile,
      clipboard,
      menu,
      nudging,
      targetDir,
      pasteLabel,
      rootRef,
      uploadInputRef,
      setOpenFile,
      setClipboard,
      closeMenu,
      openContext,
      bumpRefresh,
      toggleExpand,
      onSelect,
      actNewFile,
      actNewFolder,
      actRename,
      actDelete,
      actPaste,
      actUpload,
      actDownload,
      onUploadPicked,
      handleNudge,
      dialog,
    }),
    [
      sources,
      activeSource,
      activeSourceId,
      rootPath,
      providers,
      controller,
      locale,
      onClose,
      onNudge,
      nudgeDisabled,
      expanded,
      selectedPath,
      selectedEntry,
      refreshKey,
      openFile,
      setOpenFile,
      clipboard,
      menu,
      nudging,
      targetDir,
      pasteLabel,
      closeMenu,
      openContext,
      bumpRefresh,
      toggleExpand,
      onSelect,
      actNewFile,
      actNewFolder,
      actRename,
      actDelete,
      actPaste,
      actUpload,
      actDownload,
      onUploadPicked,
      handleNudge,
      dialog,
    ],
  );

  return <FileExplorerContext.Provider value={value}>{children}</FileExplorerContext.Provider>;
}
