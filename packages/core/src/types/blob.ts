export interface BlobUploadResponse {
  isSuccess: boolean;
  data: BlobData[];
  error: string | null;
  errorCode: string | null;
}

export interface BlobData {
  channelId: string;
  blobId: string;
  fileType: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' | 'UNKNOWN';
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