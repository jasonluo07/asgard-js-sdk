// F-021 — sandbox filesystem edge-API types (Cycle 1: list / read / write). Aligned to the asgard-core
// edgeserver contract (`internal/models/sandbox.go`). Mutations (mkdir / copy / move / delete) and
// `fs/watch` are Cycle 2, gated on backend endpoints that do not exist yet.

/** One directory entry from `fs/list`. */
export interface SandboxFsDirEntry {
  name: string;
  isDir: boolean;
  /** File size in bytes (0 for directories). */
  sizeBytes: number;
  /** Modification time, unix seconds. */
  mtimeUnix: number;
  /** Unix file mode (e.g. 420 = 0644). */
  mode: number;
}

/** `GET fs/list` result: `{ data: { entries, truncated } }`. */
export interface SandboxFsListResult {
  entries: SandboxFsDirEntry[];
  /** True when the backend capped the listing. */
  truncated: boolean;
}

/** Optional byte-range for `GET fs/file`. */
export interface SandboxFsReadOptions {
  offsetBytes?: number;
  limitBytes?: number;
}

/** `GET fs/file` result: the raw bytes plus the `X-Total-Bytes` / `X-Truncated` headers. */
export interface SandboxFsReadResult {
  content: Blob;
  /** Full file size in bytes (`X-Total-Bytes`), independent of any range limit. */
  totalBytes: number;
  /** Whether the returned body was truncated (`X-Truncated`). */
  truncated: boolean;
}

/** Options for `PUT fs/file`. */
export interface SandboxFsWriteOptions {
  /** Unix file mode in decimal (default 420 = 0644). */
  mode?: number;
  /** Fail with 409 if the file already exists. */
  createOnly?: boolean;
}

/** `PUT fs/file` result: `{ data: { bytesWritten } }`. */
export interface SandboxFsWriteResult {
  bytesWritten: number;
}
