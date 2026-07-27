import { ReactNode, useState } from 'react';
import clsx from 'clsx';
import PaperclipSvg from '../../../icons/paperclip.svg?react';
import styles from './attachment-preview.module.scss';
import type { AttachmentItem } from './use-attachment-upload';

/** Human-readable size for a document chip. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentPreviewProps {
  items: AttachmentItem[];
  onRemove: (id: string) => void;
  removeLabel: string;
  /** Accessible label for the zoom modal's close button. */
  closeLabel: string;
}

function StatusOverlay({ status }: { status: AttachmentItem['status'] }): ReactNode {
  if (status === 'uploading') {
    return (
      <div className={styles.overlay}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={clsx(styles.overlay, styles.overlay__error)}>
        <svg
          className={styles.error_icon}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
    );
  }

  return null;
}

/**
 * Pending attachments, rendered inside the composer pill above the input row (BUILD-028 R5).
 * Images keep the thumbnail grid + zoom modal; documents are chips rather than the former 3:2 cards,
 * so a mixed selection stays compact.
 */
export function AttachmentPreview({ items, onRemove, removeLabel, closeLabel }: AttachmentPreviewProps): ReactNode {
  const [zoomed, setZoomed] = useState<AttachmentItem | null>(null);

  if (items.length === 0) return null;

  const images = items.filter(item => item.kind === 'image');
  const documents = items.filter(item => item.kind === 'document');

  return (
    <div className={styles.preview}>
      {images.length > 0 && (
        <div className={styles.thumbnails}>
          {images.map(item => (
            <div key={item.id} className={clsx(styles.thumbnail, item.status === 'error' && styles.thumbnail__error)}>
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className={styles.thumbnail_image}
                onClick={() => setZoomed(item)}
              />
              <StatusOverlay status={item.status} />
              <button
                type="button"
                className={styles.remove_button}
                aria-label={removeLabel}
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className={styles.chips}>
          {documents.map(item => (
            <span
              key={item.id}
              className={clsx(
                styles.chip,
                item.status === 'uploading' && styles.chip__uploading,
                item.status === 'error' && styles.chip__error,
              )}
              title={item.file.name}
            >
              <PaperclipSvg className={styles.chip_icon} />
              <span className={styles.chip_name}>{item.file.name}</span>
              <span className={styles.chip_size}>{formatFileSize(item.file.size)}</span>
              <button
                type="button"
                className={styles.chip_remove}
                aria-label={removeLabel}
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {zoomed?.previewUrl && (
        <div className={styles.modal} onClick={() => setZoomed(null)}>
          <img
            src={zoomed.previewUrl}
            alt={zoomed.file.name}
            className={styles.modal_image}
            onClick={event => event.stopPropagation()}
          />
          <button
            type="button"
            className={styles.modal_close}
            aria-label={closeLabel}
            onClick={event => {
              event.stopPropagation();
              setZoomed(null);
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
