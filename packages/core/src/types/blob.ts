export interface BlobUploadResponse {
  isSuccess: boolean;
  data: BlobData[];
  error: string | null;
  errorCode: string | null;
}

/**
 * How the backend classifies an uploaded blob. `BINARY` is what it returns for anything it cannot place;
 * `UNKNOWN` predates it and is kept so an older response still types. Treat the union as advisory when
 * branching — a value this SDK has not seen yet must fall to the generic path, never throw.
 */
export type BlobFileType = 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' | 'BINARY' | 'UNKNOWN';

export interface BlobData {
  channelId: string;
  blobId: string;
  fileType: BlobFileType;
  fileName: string | null;
  size: number;
  mime: string;
}

/**
 * One attachment as a `asgard.message.user` frame describes it — the backend's `ContextBlob` shape, the
 * same one `context.prevBlobs` carries. Snapshotted into the transcript when the turn is written, so a
 * GET rejoin can name what was attached without joining back to a blob that may since be soft-deleted.
 *
 * **There is deliberately no URL.** A presigned link expires, often while the page that would use it is
 * still open, so it cannot be part of a durable record; fetching bytes needs a link minted at render
 * time, which is a separate backend capability (asgard-ai-platform/asgard-sindri-pm#206, Phase 2).
 *
 * `fileName` is `null` when the upload carried no name — distinct from `''`, so a renderer can tell
 * "never had a name" from "named empty" and substitute its own label.
 */
export interface MessageBlob {
  blobId: string;
  fileType: BlobFileType;
  fileName: string | null;
  size: number;
  mime: string;
}

export interface FileAttachment {
  blobId: string;
  fileName: string;
  mime: string;
  size: number;
  url?: string;
}
