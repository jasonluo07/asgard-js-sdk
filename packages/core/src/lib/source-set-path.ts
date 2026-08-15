// F-024 — path rules for a SourceSet volume.
//
// Volume paths are relative and the root is the **empty string**, not `/`. This is the opposite of the
// in-sandbox fs API, whose paths are container-absolute — so a path copied from that side reaches the
// backend and comes back 400. Checking here turns a round trip and an opaque status into an immediate,
// readable error, and keeps the rule in one place for `@asgard-js/react` to reuse.

/** The volume root. Only `list` / `listAll` accept it; every mutation needs a real path. */
export const SOURCE_SET_VOLUME_ROOT = '';

/** Segments the backend rejects: empty (a doubled slash) and the two relative-traversal forms. */
const INVALID_SEGMENTS: ReadonlySet<string> = new Set(['', '.', '..']);

/**
 * Validate a volume-relative path, returning it unchanged so it can be inlined into a query.
 *
 * @param path Volume-relative, e.g. `notes/todo.md`.
 * @param options `allowRoot` permits the empty-string root — set it only for listing.
 * @throws Error when the path has a leading or trailing slash, a doubled slash, or a `.` / `..` segment.
 */
export function assertVolumePath(path: string, options?: { allowRoot?: boolean }): string {
  if (path === SOURCE_SET_VOLUME_ROOT) {
    if (options?.allowRoot) {
      return path;
    }

    throw new Error(
      'SourceSet volume path must not be empty: the volume root is not a valid target for this operation.',
    );
  }

  if (path.startsWith('/')) {
    throw new Error(`SourceSet volume path must be relative, with no leading slash (the root is ""): "${path}".`);
  }

  if (path.endsWith('/')) {
    throw new Error(`SourceSet volume path must not end with a slash: "${path}".`);
  }

  if (path.split('/').some(segment => INVALID_SEGMENTS.has(segment))) {
    throw new Error(`SourceSet volume path must not contain empty, "." or ".." segments: "${path}".`);
  }

  return path;
}
