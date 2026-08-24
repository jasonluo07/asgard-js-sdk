import { CSSProperties, ReactNode } from 'react';
import type { BlobFileType, ConversationUserMessage, MessageBlob } from '@asgard-js/core';
import clsx from 'clsx';
import DocumentSvg from '../../../icons/document.svg?react';
import GallerySvg from '../../../icons/gallery.svg?react';
import PaperclipSvg from '../../../icons/paperclip.svg?react';
import { Locale, t } from '../../../i18n';
import styles from './user-image-template.module.scss';

// asgard-js-sdk#448 — the chips a *replayed* user turn draws. The live send path has richer material
// (a local object URL per image, a name per document) and keeps its own two blocks in the template; this
// one runs on what survives a reload: the blob metadata the frame snapshotted, or — for rows written
// before the backend started snapshotting it, which are never backfilled — nothing but an id.

/** Which glyph a chip carries: a picture, a file, or "an attachment, and that is all we know". */
export type UserAttachmentKind = 'image' | 'file' | 'unknown';

export interface UserAttachmentChipData {
  /** Stable per attachment — the blob id, which is unique within a turn. */
  key: string;
  label: string;
  kind: UserAttachmentKind;
}

/**
 * Stand-in label per file type, used when `fileName` is `null` (the upload carried no name).
 * `Partial` on purpose: the backend owns this enum and can add to it, so an unseen value has to fall
 * through to the generic label rather than render `undefined`.
 */
const FILE_TYPE_LABEL_KEY: Partial<Record<BlobFileType, string>> = {
  IMAGE: 'attachment.image',
  VIDEO: 'attachment.video',
  AUDIO: 'attachment.audio',
  DOCUMENT: 'attachment.document',
  BINARY: 'attachment.file',
  UNKNOWN: 'attachment.file',
};

function chipFromBlob(blob: MessageBlob, locale: Locale): UserAttachmentChipData {
  const labelKey = FILE_TYPE_LABEL_KEY[blob.fileType] ?? 'attachment.file';

  // The backend distinguishes `null` (the upload carried no name) from `''` so the renderer can decide.
  // For a chip the decision is the same either way: a blank label is a glyph with nothing beside it,
  // which reads as a broken chip rather than as a nameless file. Anything blank earns the stand-in.
  const name = blob.fileName?.trim();

  return {
    key: blob.blobId,
    label: name ? name : t(locale, labelKey),
    kind: blob.fileType === 'IMAGE' ? 'image' : 'file',
  };
}

/**
 * The chips to draw for a user message whose attachments were not accompanied by live previews.
 *
 * `blobs` is authoritative when present — the backend snapshots every attachment of the turn, so an id
 * with no entry beside it is not a second attachment and must not become a second chip. With no `blobs`
 * at all, each id still earns a neutral chip: the alternative is a turn whose text is empty rendering as
 * nothing, which is how "my file is gone" turns into "my message is gone".
 */
export function resolveReplayAttachmentChips(
  message: Pick<ConversationUserMessage, 'blobs' | 'blobIds'>,
  locale: Locale,
): UserAttachmentChipData[] {
  if (message.blobs?.length) return message.blobs.map(blob => chipFromBlob(blob, locale));

  return (message.blobIds ?? []).map(blobId => ({
    key: blobId,
    label: t(locale, 'attachment.generic'),
    kind: 'unknown',
  }));
}

interface UserAttachmentChipProps {
  chip: UserAttachmentChipData;
  style?: CSSProperties;
}

export function UserAttachmentChip({ chip, style }: UserAttachmentChipProps): ReactNode {
  const Glyph = chip.kind === 'image' ? GallerySvg : chip.kind === 'file' ? DocumentSvg : PaperclipSvg;

  return (
    <div
      className={clsx(styles.document_card, 'asgard-user-attachment')}
      data-attachment-kind={chip.kind}
      style={style}
    >
      <Glyph className={styles.document_icon} />
      <span className={styles.document_name} title={chip.label}>
        {chip.label}
      </span>
    </div>
  );
}
