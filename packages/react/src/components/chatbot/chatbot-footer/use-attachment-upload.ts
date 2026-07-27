import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IAsgardServiceClient } from '@asgard-js/core';
import {
  validateImageFiles,
  validateDocumentFiles,
  resolveImageMimeTypes,
  resolveDocumentMimeTypes,
  SUPPORTED_DOCUMENT_EXTENSIONS,
  SUPPORTED_DOCUMENT_TYPES,
  UploadStatus,
} from '../../../utils/file-validation';

const MAX_IMAGE_COUNT = 10;
const MAX_DOCUMENT_COUNT = 10;

/** Which upload lane a pending file belongs to — decides validation, preview and the per-kind cap. */
export type AttachmentKind = 'image' | 'document';

/**
 * A single pending attachment. BUILD-028 replaced the former `UploadableImage` / `UploadableDocument`
 * pair with one shape: the unified 📎 admits both kinds in a single pick, so they can no longer live in
 * separate lists (that split is what forced the old mutual-exclusion rule).
 */
export interface AttachmentItem {
  id: string;
  kind: AttachmentKind;
  file: File;
  status: UploadStatus;
  /** Set once the upload succeeds; only these reach `sendMessage`. */
  blobId?: string;
  /** Images only — an object URL for the thumbnail, revoked on removal / unmount. */
  previewUrl?: string;
  error?: string;
}

/** How many of each kind are already pending, so the caps apply across successive picks. */
export interface AttachmentCounts {
  image: number;
  document: number;
}

export interface AttachmentPlanOptions {
  enableImage: boolean;
  enableDocument: boolean;
  allowedImageMimeTypes?: string[];
  allowedDocumentMimeTypes?: string[];
  existing: AttachmentCounts;
}

export interface AttachmentPlan {
  accepted: { file: File; kind: AttachmentKind }[];
  errors: string[];
}

/**
 * Decide what a pick becomes: route each file to a lane, validate it, and trim to the per-kind cap.
 * Pure and side-effect free (no ids, no object URLs) so the R2 / R3 rules can be tested directly.
 *
 * Lane routing: an image goes to the image lane when it is enabled; otherwise, if documents are enabled,
 * it is offered as a document (the pre-BUILD-028 drop handler did the same). Files with no enabled lane
 * are dropped silently, as before.
 */
export function planAttachments(files: File[], options: AttachmentPlanOptions): AttachmentPlan {
  const { enableImage, enableDocument, allowedImageMimeTypes, allowedDocumentMimeTypes, existing } = options;

  const images: File[] = [];
  const documents: File[] = [];

  for (const file of files) {
    const isImage = file.type.startsWith('image/');

    if (isImage && enableImage) images.push(file);
    else if (enableDocument) documents.push(file);
  }

  const accepted: AttachmentPlan['accepted'] = [];
  const errors: string[] = [];

  const take = (
    candidates: File[],
    kind: AttachmentKind,
    validate: (input: File[]) => { validFiles: File[]; errors: string[] },
    cap: number,
    capMessage: (remaining: number) => string,
  ): void => {
    if (candidates.length === 0) return;

    const { validFiles, errors: validationErrors } = validate(candidates);

    errors.push(...validationErrors);

    if (validFiles.length === 0) return;

    const remaining = Math.max(0, cap - existing[kind]);

    if (validFiles.length > remaining) errors.push(capMessage(remaining));

    for (const file of validFiles.slice(0, remaining)) {
      accepted.push({ file, kind });
    }
  };

  take(
    images,
    'image',
    input => validateImageFiles(input, allowedImageMimeTypes),
    MAX_IMAGE_COUNT,
    remaining => `最多只能上傳 ${MAX_IMAGE_COUNT} 張圖片，已選擇前 ${remaining} 張`,
  );
  take(
    documents,
    'document',
    input => validateDocumentFiles(input, allowedDocumentMimeTypes),
    MAX_DOCUMENT_COUNT,
    remaining => `最多只能上傳 ${MAX_DOCUMENT_COUNT} 個檔案，已選擇前 ${remaining} 個`,
  );

  return { accepted, errors };
}

export interface UseAttachmentUploadOptions {
  /** Image lane enabled (resolved `enableUpload`). */
  enableImage: boolean;
  /** Document lane enabled (resolved `enableDocumentUpload`). */
  enableDocument: boolean;
  allowedImageMimeTypes?: string[];
  allowedDocumentMimeTypes?: string[];
  /** `null` while the channel has no client yet (preview mode / before init). */
  client?: IAsgardServiceClient | null;
  customChannelId?: string;
  /** Surface validation / cap messages. Defaults to `alert` (the pre-BUILD-028 behavior). */
  onError?: (message: string) => void;
}

export interface UseAttachmentUploadResult {
  items: AttachmentItem[];
  /** Single entry point for the file picker, drag-and-drop and clipboard paste. */
  addFiles: (files: FileList | File[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  isUploading: boolean;
  /** blobIds of successfully uploaded attachments, in insertion order. */
  blobIds: string[];
  documentNames: string[];
  imagePreviewUrls: string[];
  hasAttachment: boolean;
  /** `accept` for the unified file input — the union of both enabled lanes. */
  accept: string;
}

function defaultOnError(message: string): void {
  // Pre-existing behavior; an inline error surface is out of BUILD-028's scope.
  alert(message);
}

/**
 * Owns the composer's pending attachments end to end: split by kind → validate → cap → upload →
 * expose blobIds. Images and documents share this one path, which is what lets a single pick carry
 * both (BUILD-028 R3); the former per-kind hooks cleared each other.
 *
 * Kept free of React context so it can be unit-tested directly — `ChatComposer` reads `client` /
 * `customChannelId` from `useAsgardContext()` and passes them in.
 */
export function useAttachmentUpload({
  enableImage,
  enableDocument,
  allowedImageMimeTypes,
  allowedDocumentMimeTypes,
  client,
  customChannelId,
  onError = defaultOnError,
}: UseAttachmentUploadOptions): UseAttachmentUploadResult {
  const [items, setItems] = useState<AttachmentItem[]>([]);

  // Unmount cleanup needs the final list, but the effect must not re-run per keystroke — mirror it in a ref.
  const itemsRef = useRef<AttachmentItem[]>(items);
  itemsRef.current = items;

  useEffect(() => {
    return (): void => {
      for (const item of itemsRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const patch = useCallback((id: string, changes: Partial<AttachmentItem>): void => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const upload = useCallback(
    async (id: string, file: File): Promise<void> => {
      if (!client?.uploadFile || !customChannelId) {
        patch(id, { status: 'error', error: '上傳服務不可用' });

        return;
      }

      try {
        const response = await client.uploadFile(file, customChannelId);
        const blobId = response.data?.[0]?.blobId;

        patch(id, blobId ? { status: 'success', blobId } : { status: 'error', error: '上傳失敗' });
      } catch {
        patch(id, { status: 'error', error: '上傳失敗' });
      }
    },
    [client, customChannelId, patch],
  );

  const addFiles = useCallback(
    (files: FileList | File[]): void => {
      const picked = Array.from(files);

      if (picked.length === 0) return;

      const { accepted, errors } = planAttachments(picked, {
        enableImage,
        enableDocument,
        allowedImageMimeTypes,
        allowedDocumentMimeTypes,
        existing: {
          image: itemsRef.current.filter(item => item.kind === 'image').length,
          document: itemsRef.current.filter(item => item.kind === 'document').length,
        },
      });

      // One message for the whole pick — a mixed selection used to raise two separate alerts.
      if (errors.length > 0) onError(`檔案驗證錯誤:\n${errors.join('\n')}`);

      if (accepted.length === 0) return;

      const created: AttachmentItem[] = accepted.map(({ file, kind }) => ({
        id: crypto.randomUUID(),
        kind,
        file,
        status: 'uploading',
        previewUrl: kind === 'image' ? URL.createObjectURL(file) : undefined,
      }));

      setItems(prev => [...prev, ...created]);

      for (const item of created) {
        upload(item.id, item.file);
      }
    },
    [enableImage, enableDocument, allowedImageMimeTypes, allowedDocumentMimeTypes, onError, upload],
  );

  const remove = useCallback((id: string): void => {
    setItems(prev => {
      const target = prev.find(item => item.id === id);

      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);

      return prev.filter(item => item.id !== id);
    });
  }, []);

  /**
   * Called after a successful send. Deliberately does **not** revoke the preview URLs: they were just
   * handed to `sendMessage` as `filePreviewUrls` and the sent message renders from them, so revoking
   * here would blank the thumbnail the user just posted. The browser reclaims them on document unload.
   */
  const clear = useCallback((): void => {
    setItems([]);
  }, []);

  const accept = useMemo(() => {
    const types: string[] = [];

    if (enableImage) types.push(...resolveImageMimeTypes(allowedImageMimeTypes));

    if (enableDocument) {
      const constrained = resolveDocumentMimeTypes(allowedDocumentMimeTypes);

      types.push(...(constrained ?? [...SUPPORTED_DOCUMENT_TYPES, ...SUPPORTED_DOCUMENT_EXTENSIONS]));
    }

    return types.join(',');
  }, [enableImage, enableDocument, allowedImageMimeTypes, allowedDocumentMimeTypes]);

  const succeeded = useMemo(
    () =>
      items.filter((item): item is AttachmentItem & { blobId: string } => item.status === 'success' && !!item.blobId),
    [items],
  );

  return {
    items,
    addFiles,
    remove,
    clear,
    isUploading: items.some(item => item.status === 'uploading'),
    blobIds: succeeded.map(item => item.blobId),
    documentNames: succeeded.filter(item => item.kind === 'document').map(item => item.file.name),
    imagePreviewUrls: succeeded
      .filter(item => item.kind === 'image')
      .flatMap(item => (item.previewUrl ? [item.previewUrl] : [])),
    hasAttachment: items.length > 0,
    accept,
  };
}
