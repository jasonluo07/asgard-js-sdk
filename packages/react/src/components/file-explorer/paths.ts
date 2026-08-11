import { FsEntry } from './types';

export function joinPath(dir: string, name: string): string {
  return `${dir.replace(/\/$/, '')}/${name}`;
}

export function baseName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

export function parentDir(path: string): string {
  const norm = path.replace(/\/+$/, '');
  const i = norm.lastIndexOf('/');

  return i > 0 ? norm.slice(0, i) : '/';
}

/** Dirs whose expansion reveals `filePath` under `root` (excludes root + the file itself) — for the AC9 reveal. */
export function ancestorDirs(root: string, filePath: string): string[] {
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

/**
 * Dirs first, then by name — a stable, predictable tree ordering (mirrors the prototype).
 *
 * The explorer always sorts client-side and never relies on backend ordering: the sandbox edge server
 * and Sindri's directory volume API disagree (the latter returns byte-wise ASCII with directories
 * interleaved, so `Zeta.txt` precedes `a.txt` and folders are not grouped).
 */
export function sortEntries(entries: FsEntry[]): FsEntry[] {
  return [...entries].sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
}
