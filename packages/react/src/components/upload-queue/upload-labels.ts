import type { UploadReason } from './use-upload-queue';

/**
 * Every string the batch upload UI shows, supplied by the caller.
 *
 * Copy is injected rather than built in because one component serves two explorers that do not share
 * a catalog: F-025 requires the SourceSet explorer to use its own `sourceSetExplorer.*` namespace
 * instead of reusing `fileExplorer.*`. A component that reached for either namespace itself would be
 * wrong for the other consumer, and it will be mounted in both.
 *
 * `reason` takes the structured code the queue reports and renders it — which is also why the queue
 * never produces prose of its own.
 */
export interface UploadLabels {
  /** Accessible name of the progress region. */
  region: string;
  uploading: string;
  cancelled: string;
  doneWithFailures: string;
  done: string;
  cancel: string;
  /** e.g. `Retry 3` */
  retry: (count: number) => string;
  dismiss: string;
  /** e.g. `Server busy — slowed to 1 at a time (max 3)` */
  throttled: (limit: number, ceiling: number) => string;
  /** Shown for the whole batch when the source is the folder picker, which cannot see empty folders. */
  emptyDirsHint: string;
  reason: (reason: UploadReason) => string;

  conflictTitle: string;
  skip: string;
  keepBoth: string;
  overwrite: string;
  /** e.g. `Apply to the remaining 237:` */
  applyToRest: (count: number) => string;
  allSkip: string;
  allKeepBoth: string;
  allOverwrite: string;
  cancelBatch: string;
}

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;

/**
 * Render a byte count the way a size limit is talked about — `8.0 MB`, or `12 KB` below a megabyte.
 * Digits only, so it belongs to the shared layer rather than to either catalog.
 */
export function formatUploadSize(bytes: number): string {
  if (bytes >= BYTES_PER_MB) return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;

  return `${Math.max(1, Math.round(bytes / BYTES_PER_KB))} KB`;
}
