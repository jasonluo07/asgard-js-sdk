import { useCallback, useRef, useState } from 'react';

// F-021 — the shared File Explorer controller decouples *behavior* from *placement* (F-019 decision).
// Three sources can drive "is the explorer open / which sandbox / reveal which file": (1) the built-in
// header folder toggle, (2) an agent open-file `sandbox://` card, (3) a consumer-placed <FileExplorerPanel>
// in `fileExplorer="off"` mode. Binding all three to one controller means an open-file intent hits the
// panel wherever it lives — placement and behavior stay separate. Framework-light: pure state + actions.

/** One "reveal this file" request; the nonce lets a repeat request for the same file re-trigger the reveal. */
export interface RequestedFile {
  /**
   * The source this request targets. Always equal to {@link RequestedFile.sandboxName} — the explorer
   * generalized "which sandbox" to "which source" (a sandbox is one kind of source, a Sindri directory
   * volume another), and both names are kept so existing callers keep working.
   */
  sourceId: string;
  /** @deprecated Use {@link RequestedFile.sourceId}; kept as an alias so existing readers keep working. */
  sandboxName: string;
  absolutePath: string;
  nonce: number;
}

/** Options for {@link FileExplorerController.requestFile}. */
export interface RequestFileOptions {
  /** Also open the built-in aside (F-021 AC9 — "fire intent" and "open panel" are separate; default true). */
  reveal?: boolean;
}

export interface FileExplorerController {
  // --- state ---
  /** Whether the built-in right-side aside is expanded. Consumer-placed panels may ignore this. */
  open: boolean;
  /** Which source is being viewed (`null` = unset; the panel falls back to the first one). */
  activeSourceId: string | null;
  /** @deprecated Use {@link FileExplorerController.activeSourceId}; same value, kept as an alias. */
  activeSandboxName: string | null;
  /** The latest "reveal + select this file" request (the panel expands ancestors + highlights + previews). */
  requestedFile: RequestedFile | null;
  /** Whether a file is currently being edited with unsaved changes (F-021 AC10 — mid-edit guard). */
  isEditingDirty: boolean;

  // --- actions ---
  // open/close named openExplorer/closeExplorer to avoid clashing with the `open` boolean state key.
  openExplorer: () => void;
  closeExplorer: () => void;
  toggle: () => void;
  /** Switch which source the explorer is browsing. */
  selectSource: (sourceId: string) => void;
  /** @deprecated Use {@link FileExplorerController.selectSource}; same function, kept as an alias. */
  selectSandbox: (sandboxName: string) => void;
  /**
   * open-file card / deep-link entry: select the source + request a reveal of `absolutePath`. `reveal`
   * (default true) also opens the built-in aside; pass `reveal: false` to expose the intent without
   * yanking the panel (F-021 AC9 notify-not-force).
   */
  requestFile: (sourceId: string, absolutePath: string, options?: RequestFileOptions) => void;
  /** FileView reports its dirty state here so the arrival wiring can decline to yank mid-edit (AC10). */
  setEditingDirty: (dirty: boolean) => void;
}

export interface UseFileExplorerControllerOptions {
  /** Initial aside open state (default false). */
  open?: boolean;
  /** Initial active source (default null → panel falls back to the first one). */
  activeSourceId?: string | null;
  /** @deprecated Use {@link UseFileExplorerControllerOptions.activeSourceId}; kept as an alias. */
  activeSandboxName?: string | null;
}

export function useFileExplorerController({
  open: initialOpen = false,
  activeSourceId: initialActiveSource,
  activeSandboxName: initialActive = null,
}: UseFileExplorerControllerOptions = {}): FileExplorerController {
  const [open, setOpen] = useState(initialOpen);
  const [activeSourceId, setActiveSandboxName] = useState<string | null>(initialActiveSource ?? initialActive);
  const [requestedFile, setRequestedFile] = useState<RequestedFile | null>(null);
  const [isEditingDirty, setIsEditingDirty] = useState(false);
  const nonce = useRef(0);

  const openExplorer = useCallback((): void => setOpen(true), []);
  const closeExplorer = useCallback((): void => setOpen(false), []);
  const toggle = useCallback((): void => setOpen(v => !v), []);

  const selectSource = useCallback((sourceId: string): void => {
    setActiveSandboxName(sourceId);
    // Manual source switch → a reveal request aimed at another source is stale; clear it.
    setRequestedFile(rf => (rf && rf.sourceId !== sourceId ? null : rf));
  }, []);

  const requestFile = useCallback((sourceId: string, absolutePath: string, options?: RequestFileOptions): void => {
    nonce.current += 1;
    if (options?.reveal ?? true) setOpen(true);

    setActiveSandboxName(sourceId);
    setRequestedFile({ sourceId, sandboxName: sourceId, absolutePath, nonce: nonce.current });
  }, []);

  const setEditingDirty = useCallback((dirty: boolean): void => setIsEditingDirty(dirty), []);

  return {
    open,
    activeSourceId,
    activeSandboxName: activeSourceId,
    requestedFile,
    isEditingDirty,
    openExplorer,
    closeExplorer,
    toggle,
    selectSource,
    selectSandbox: selectSource,
    requestFile,
    setEditingDirty,
  };
}

export default useFileExplorerController;
