import { SandboxFsDirEntry } from '@asgard-js/core';

/**
 * A file-tree node in the File Explorer (F-021): a `fs/list` entry plus its absolute path (the list API
 * returns names relative to the queried dir; the panel composes the absolute path).
 */
export interface FsEntry extends SandboxFsDirEntry {
  /** Absolute path inside the sandbox. */
  path: string;
}

/** Read a file's content (≈ `GET fs/file`). Images resolve to a data/object URL; text to the string body. */
export type FsReadFile = (sandboxName: string, path: string) => Promise<string>;

/** Persist a file's content (≈ `PUT fs/file`). */
export type FsSaveFile = (sandboxName: string, path: string, content: string) => Promise<void> | void;

/**
 * Subscribe to changes on one path (≈ `GET fs/watch` SSE) and return an unsubscribe (F-021 AC3). The
 * event payload is deliberately not surfaced: the view reloads from disk either way, so all a caller
 * needs is "it changed".
 */
export type FsWatchFile = (sandboxName: string, path: string, onChange: () => void) => () => void;
