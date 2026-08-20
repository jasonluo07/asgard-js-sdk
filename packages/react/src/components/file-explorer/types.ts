import { LaunchedSandbox, SandboxFsDirEntry } from '@asgard-js/core';

/**
 * A file-tree node in the File Explorer (F-021): a `fs/list` entry plus its absolute path (the list API
 * returns names relative to the queried dir; the panel composes the absolute path).
 */
export interface FsEntry extends SandboxFsDirEntry {
  /** Absolute path inside the source. */
  path: string;
}

/**
 * One file source the explorer can browse. A live sandbox is one kind; a Sindri directory volume is
 * another. The explorer itself never assumes which — it only needs an identity, a label, and a root.
 *
 * Paths flowing through the explorer (and through {@link FsProviders}) are **absolute under
 * `rootPath`**. That keeps the sandbox side — where `FsEntry.path` and `requestFile` have always been
 * absolute — unchanged; a source whose backing API speaks relative paths converts inside its provider.
 */
export interface FsSource {
  /** Identity key; every provider call locates the source by this. */
  id: string;
  /** Display label for the source picker. */
  label: string;
  /** The tree root — the explorer lists this path first and resolves everything else under it. */
  rootPath: string;
}

/** One page of a directory listing. */
export interface FsListResult {
  entries: SandboxFsDirEntry[];
  /** True when the backend capped the listing. */
  truncated: boolean;
}

/** List a directory (≈ `GET fs/list`). */
export type FsListDir = (sourceId: string, path: string) => Promise<FsListResult>;

/** Read a file's content (≈ `GET fs/file`). Images resolve to a data/object URL; text to the string body. */
export type FsReadFile = (sourceId: string, path: string) => Promise<string>;

/** Persist a file's content (≈ `PUT fs/file`). */
export type FsSaveFile = (sourceId: string, path: string, content: string) => Promise<void> | void;

/**
 * Subscribe to changes on one path (≈ `GET fs/watch` SSE) and return an unsubscribe (F-021 AC3). The
 * event payload is deliberately not surfaced: the view reloads from disk either way, so all a caller
 * needs is "it changed".
 *
 * **Optional on {@link FsProviders} by design.** The sandbox edge server has an SSE watch endpoint;
 * Sindri's directory volume API has no equivalent, so a source may legitimately not offer one. The
 * FileView degrades to load-once when it is absent.
 */
export type FsWatchFile = (sourceId: string, path: string, onChange: () => void) => () => void;

/** A directory mutation (mkdir / delete). */
export type FsMutatePath = (sourceId: string, path: string) => Promise<void>;

/** A src→dst mutation (copy / move / rename). */
export type FsMutateSrcDst = (sourceId: string, src: string, dst: string) => Promise<void>;

/** Upload a picked file into a directory. */
export type FsUpload = (sourceId: string, dirPath: string, file: File) => Promise<void>;

/**
 * The batch-capable upload capability (F-031). Called **once per file** by the shared upload queue,
 * which owns the concurrency, the back-off and the collision prompts — a batch endpoint does not
 * exist, so every file is its own request no matter who drives them.
 *
 * Three things it can express that {@link FsUpload} cannot, and which a batch needs:
 *
 * - `relPath` may span levels (`notes/sub/b.md`), relative to `dirPath`. The caller does **not**
 *   pre-create those levels: both backends' write paths create parent directories themselves.
 * - `createOnly` makes a collision fail loudly (`409`) instead of silently overwriting, which is what
 *   lets the explorer ask. A folder upload collides far too often to guess.
 * - `signal` makes cancellation real for requests already dispatched.
 */
export type FsUploadMany = (
  sourceId: string,
  dirPath: string,
  relPath: string,
  file: File,
  options: {
    createOnly: boolean;
    signal: AbortSignal;
    /**
     * The queue will not retry this file again whatever happens. A provider that counts failures to
     * decide a source is unreachable should count only these, since the queue retries exactly the
     * server errors such a counter looks for.
     */
    lastAttempt: boolean;
  },
) => Promise<void>;

/**
 * Everything the explorer can ask a source to do. Only `listDir` is required — each omitted capability
 * simply disables the actions that need it (the toolbar button and context-menu item go `disabled`),
 * which is how a read-only source is expressed.
 */
export interface FsProviders {
  listDir: FsListDir;
  readFile?: FsReadFile;
  saveFile?: FsSaveFile;
  watchFile?: FsWatchFile;
  mkdir?: FsMutatePath;
  /** Delete a file or directory — routed by `isDir` (the two often map to different endpoints). */
  remove?: (sourceId: string, path: string, isDir: boolean) => Promise<void>;
  copy?: FsMutateSrcDst;
  move?: FsMutateSrcDst;
  upload?: FsUpload;
  /**
   * Batch-capable upload (F-031). When present the explorer uploads many files — and whole folders —
   * through it. When only `upload` is given, batches still work but degrade to one file at a time,
   * with no collision prompt, because that signature carries neither `createOnly` nor `signal`.
   */
  uploadMany?: FsUploadMany;
  /** Download a file to the browser. */
  download?: (sourceId: string, path: string, name: string) => Promise<void>;
}

/**
 * A live sandbox as an {@link FsSource}. `sandboxBlueprintName` is the readable label; when more than one
 * sandbox is live the opaque `sandboxName` is appended to keep them apart.
 */
export function sandboxAsSource(sandbox: LaunchedSandbox, disambiguate = false): FsSource {
  const label = sandbox.sandboxBlueprintName || sandbox.sandboxName;

  return {
    id: sandbox.sandboxName,
    label: disambiguate ? `${label} · ${sandbox.sandboxName}` : label,
    rootPath: sandbox.workingDirectory,
  };
}

/** {@link sandboxAsSource} over a list, disambiguating labels only when there is more than one. */
export function sandboxesAsSources(sandboxes: LaunchedSandbox[]): FsSource[] {
  return sandboxes.map(s => sandboxAsSource(s, sandboxes.length > 1));
}
