import { useCallback, useRef, useState } from 'react';

// F-021 — the shared File Explorer controller decouples *behavior* from *placement* (F-019 decision).
// Three sources can drive "is the explorer open / which sandbox / reveal which file": (1) the built-in
// header folder toggle, (2) an agent open-file `sandbox://` card, (3) a consumer-placed <FileExplorerPanel>
// in `fileExplorer="off"` mode. Binding all three to one controller means an open-file intent hits the
// panel wherever it lives — placement and behavior stay separate. Framework-light: pure state + actions.

/** One "reveal this file" request; the nonce lets a repeat request for the same file re-trigger the reveal. */
export interface RequestedFile {
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
  /** Which sandbox is being viewed (`null` = unset; the panel falls back to the first live one). */
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
  selectSandbox: (sandboxName: string) => void;
  /**
   * open-file card / deep-link entry: select the sandbox + request a reveal of `absolutePath`. `reveal`
   * (default true) also opens the built-in aside; pass `reveal: false` to expose the intent without
   * yanking the panel (F-021 AC9 notify-not-force).
   */
  requestFile: (sandboxName: string, absolutePath: string, options?: RequestFileOptions) => void;
  /** FileView reports its dirty state here so the arrival wiring can decline to yank mid-edit (AC10). */
  setEditingDirty: (dirty: boolean) => void;
}

export interface UseFileExplorerControllerOptions {
  /** Initial aside open state (default false). */
  open?: boolean;
  /** Initial active sandbox (default null → panel falls back to the first live one). */
  activeSandboxName?: string | null;
}

export function useFileExplorerController({
  open: initialOpen = false,
  activeSandboxName: initialActive = null,
}: UseFileExplorerControllerOptions = {}): FileExplorerController {
  const [open, setOpen] = useState(initialOpen);
  const [activeSandboxName, setActiveSandboxName] = useState<string | null>(initialActive);
  const [requestedFile, setRequestedFile] = useState<RequestedFile | null>(null);
  const [isEditingDirty, setIsEditingDirty] = useState(false);
  const nonce = useRef(0);

  const openExplorer = useCallback((): void => setOpen(true), []);
  const closeExplorer = useCallback((): void => setOpen(false), []);
  const toggle = useCallback((): void => setOpen(v => !v), []);

  const selectSandbox = useCallback((sandboxName: string): void => {
    setActiveSandboxName(sandboxName);
    // Manual sandbox switch → a reveal request aimed at another sandbox is stale; clear it.
    setRequestedFile(rf => (rf && rf.sandboxName !== sandboxName ? null : rf));
  }, []);

  const requestFile = useCallback((sandboxName: string, absolutePath: string, options?: RequestFileOptions): void => {
    nonce.current += 1;
    if (options?.reveal ?? true) setOpen(true);

    setActiveSandboxName(sandboxName);
    setRequestedFile({ sandboxName, absolutePath, nonce: nonce.current });
  }, []);

  const setEditingDirty = useCallback((dirty: boolean): void => setIsEditingDirty(dirty), []);

  return {
    open,
    activeSandboxName,
    requestedFile,
    isEditingDirty,
    openExplorer,
    closeExplorer,
    toggle,
    selectSandbox,
    requestFile,
    setEditingDirty,
  };
}

export default useFileExplorerController;
