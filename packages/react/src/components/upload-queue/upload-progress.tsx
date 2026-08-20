import { ReactNode } from 'react';
import { CircleAlertIcon, CircleCheckIcon, FileWarningIcon, UploadIcon, XIcon } from '../file-explorer/icons';
import type { UploadPlanSource } from './pick-upload';
import type { UploadLabels } from './upload-labels';
import type { UploadItem } from './use-upload-queue';
import styles from './upload-queue.module.scss';

/**
 * The progress panel for a batch upload (F-031 / F-025).
 *
 * Why it looks like this:
 *
 * - **A count and a bar, not a spinner.** At 240 files a spinner conveys nothing; `12 / 240` does.
 * - **Only failures and skips are listed.** Everything that succeeded is visible in the tree, so
 *   repeating it is noise — the list is for the items that still need a decision.
 * - **A reduced ceiling is stated.** When AIMD slows down, silence reads as "why is this so slow".
 * - **The empty-folder caveat shows during the batch, not after.** Someone who wanted an empty
 *   directory needs to know before they go looking for it, and they will not read a doc afterwards.
 * - **It cannot be dismissed until the batch settles**, and it docks below the tree rather than over
 *   it, because browsing while an upload runs is the normal case.
 */
export interface UploadProgressProps {
  items: UploadItem[];
  running: boolean;
  cancelled: boolean;
  /** The ceiling AIMD currently honors; below `ceiling` means the server pushed back. */
  limit: number;
  ceiling: number;
  /** `'directory'` triggers the empty-folder caveat; `null` when no batch has run. */
  source: UploadPlanSource | null;
  labels: UploadLabels;
  onCancel: () => void;
  onRetryFailed: () => void;
  onDismiss: () => void;
}

export function UploadProgress({
  items,
  running,
  cancelled,
  limit,
  ceiling,
  source,
  labels,
  onCancel,
  onRetryFailed,
  onDismiss,
}: UploadProgressProps): ReactNode {
  if (items.length === 0) return null;

  const total = items.length;
  const done = items.filter(item => item.status === 'done').length;
  const failed = items.filter(item => item.status === 'failed');
  const skipped = items.filter(item => item.status === 'skipped');
  const settled = done + failed.length + skipped.length;
  const percent = total === 0 ? 0 : Math.round((settled / total) * 100);
  const needsAttention = [...failed, ...skipped];
  const throttled = running && limit < ceiling;
  // A file over the size cap is excluded: re-sending it cannot end any differently.
  const retryable = failed.filter(item => item.reason?.code !== 'too-large').length;

  const title = running
    ? labels.uploading
    : cancelled
    ? labels.cancelled
    : failed.length > 0
    ? labels.doneWithFailures
    : labels.done;

  return (
    <div className={styles.progress} role="region" aria-label={labels.region}>
      <div className={styles.progressHead}>
        <span className={styles.progressIcon}>
          {running ? (
            <UploadIcon size={14} />
          ) : failed.length > 0 ? (
            <CircleAlertIcon size={14} />
          ) : (
            <CircleCheckIcon size={14} />
          )}
        </span>
        <span className={styles.progressTitle}>{title}</span>
        <span className={styles.progressCount}>
          {done} / {total}
        </span>
        {running ? (
          <button type="button" className={styles.progressButton} onClick={onCancel}>
            {labels.cancel}
          </button>
        ) : (
          <>
            {retryable > 0 && (
              <button type="button" className={styles.progressButton} onClick={onRetryFailed}>
                {labels.retry(retryable)}
              </button>
            )}
            <button type="button" className={styles.progressClose} onClick={onDismiss} aria-label={labels.dismiss}>
              <XIcon size={14} />
            </button>
          </>
        )}
      </div>

      <div
        className={styles.progressBar}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          className={failed.length > 0 ? styles.progressFillPartial : styles.progressFill}
          style={{ width: `${percent}%` }}
        />
      </div>

      {throttled && <div className={styles.progressHint}>{labels.throttled(limit, ceiling)}</div>}

      {source === 'directory' && (
        <div className={styles.progressHint}>
          <FileWarningIcon size={12} />
          <span>{labels.emptyDirsHint}</span>
        </div>
      )}

      {needsAttention.length > 0 && (
        <ul className={styles.progressList}>
          {needsAttention.map(item => (
            <li key={item.id} className={item.status === 'failed' ? styles.rowFailed : styles.rowSkipped}>
              <span className={styles.rowPath} title={item.relPath}>
                {item.relPath}
              </span>
              <span className={styles.rowReason}>{item.reason ? labels.reason(item.reason) : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
