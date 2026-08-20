/**
 * Batch upload — the pieces both File Explorers share (F-031 owns them; F-025 consumes the same copy
 * for the SourceSet explorer rather than growing a second one).
 *
 * **Deliberately not re-exported from `components/index.ts`.** That barrel is `export *`-ed into the
 * package entry, so anything listed there becomes public API that §1.7 then only allows deprecating,
 * never removing. No consumer needs the raw queue today — they mount a whole explorer — so this stays
 * internal until something actually asks for it. Publishing later is easy; unpublishing is not.
 */
export { emptyUploadPlan, isFileDrag, isUploadPlanEmpty, planFromDataTransfer, planFromFileList } from './pick-upload';
export { dedupeName, splitRelPath } from './pick-upload';
export type { UploadPlan, UploadPlanItem, UploadPlanSource } from './pick-upload';

export { isRetryableUploadError, isUploadConflictError, useUploadQueue } from './use-upload-queue';
export type {
  UploadConflictAnswer,
  UploadConflictAsk,
  UploadConflictChoice,
  UploadItem,
  UploadQueue,
  UploadQueueOptions,
  UploadQueueState,
  UploadReason,
  UploadStatus,
  UploadWrite,
} from './use-upload-queue';

export { formatUploadSize } from './upload-labels';
export type { UploadLabels } from './upload-labels';

export { UploadProgress } from './upload-progress';
export type { UploadProgressProps } from './upload-progress';

export { UploadConflictDialog } from './upload-conflict-dialog';
export type { UploadConflictDialogProps } from './upload-conflict-dialog';
