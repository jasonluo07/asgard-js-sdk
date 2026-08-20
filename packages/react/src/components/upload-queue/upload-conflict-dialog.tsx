import { KeyboardEvent, MouseEvent, ReactNode, useId } from 'react';
import type { UploadLabels } from './upload-labels';
import type { UploadConflictAnswer, UploadConflictAsk, UploadConflictChoice } from './use-upload-queue';
import styles from './upload-queue.module.scss';

/**
 * Asked when an upload collides with something already at the destination (F-031 / F-025).
 *
 * Writes go out with `create_only`, so a collision surfaces as a `409` and stops here. The backend
 * default is a silent overwrite, and a folder upload collides far too often to accept that.
 *
 * Three choices, because there are three real intentions: skip it, keep both, overwrite it. Keep both
 * renames — and keeps writing with `create_only`, since renaming is not permission to overwrite
 * whatever sits at the new name either.
 *
 * The second row applies one choice to every remaining item. Asking about two hundred files
 * individually is the same as not asking. It is three plain buttons rather than a checkbox plus a
 * confirm: one less click, and no "did I tick it?" to wonder about afterwards.
 *
 * This is its own dialog rather than a `requestConfirm`, which is binary and cannot hold six
 * actions — but it stays in `file-explorer-dialog`'s visual family, and is emphatically not a
 * `window.confirm` (those cannot be localized, escape the theme scope, and block the tab hard enough
 * to freeze CDP-driven e2e — see `asgard-sdk-pm#49`).
 */
export interface UploadConflictDialogProps {
  ask: UploadConflictAsk;
  labels: UploadLabels;
  /** `null` cancels the whole batch. */
  onAnswer: (answer: UploadConflictAnswer | null) => void;
}

export function UploadConflictDialog({ ask, labels, onAnswer }: UploadConflictDialogProps): ReactNode {
  const titleId = useId();
  const answer = (choice: UploadConflictChoice, applyToAll: boolean): void => onAnswer({ choice, applyToAll });

  // Esc and a backdrop click cancel the batch — the same escape the other explorer dialogs offer, and
  // the only way out for a keyboard user whose focus has left the dialog, since the backdrop cannot
  // hold focus. Cancelling is safe: nothing already written is rolled back.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape') return;

    event.stopPropagation();
    onAnswer(null);
  };

  const onBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onAnswer(null);
  };

  return (
    <div className={styles.backdrop} onKeyDown={onKeyDown} onClick={onBackdropClick} role="presentation">
      {/*
        No `aria-modal`, matching `file-explorer-dialog`: the backdrop is positioned inside the panel,
        so the rest of the page really does stay reachable and claiming otherwise would misinform a
        screen reader.
      */}
      <div className={styles.dialog} role="dialog" aria-labelledby={titleId}>
        <div className={styles.dialogTitle} id={titleId}>
          {labels.conflictTitle}
        </div>
        <div className={styles.dialogPath} title={ask.relPath}>
          {ask.relPath}
        </div>

        <div className={styles.dialogActions}>
          <button type="button" className={styles.dialogChoice} onClick={() => answer('skip', false)}>
            {labels.skip}
          </button>
          <button type="button" className={styles.dialogChoice} onClick={() => answer('keep-both', false)}>
            {labels.keepBoth}
          </button>
          <button
            type="button"
            className={styles.dialogChoicePrimary}
            onClick={() => answer('overwrite', false)}
            autoFocus
          >
            {labels.overwrite}
          </button>
        </div>

        {ask.remaining > 0 && (
          <div className={styles.dialogApplyAll}>
            <span>{labels.applyToRest(ask.remaining)}</span>
            <button type="button" className={styles.dialogApplyAllButton} onClick={() => answer('skip', true)}>
              {labels.allSkip}
            </button>
            <button type="button" className={styles.dialogApplyAllButton} onClick={() => answer('keep-both', true)}>
              {labels.allKeepBoth}
            </button>
            <button type="button" className={styles.dialogApplyAllButton} onClick={() => answer('overwrite', true)}>
              {labels.allOverwrite}
            </button>
          </div>
        )}

        <button type="button" className={styles.dialogCancelBatch} onClick={() => onAnswer(null)}>
          {labels.cancelBatch}
        </button>
      </div>
    </div>
  );
}
