export interface BlobUploadResponse {
  isSuccess: boolean;
  data: BlobData[];
  error: string | null;
  errorCode: string | null;
}

export interface BlobData {
  channelId: string;  // 後端使用 string 防止 JS overflow
  blobId: string;     // 後端使用 string 防止 JS overflow
  fileType: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' | 'UNKNOWN';
  fileName: string | null;  // 可能為 null
  size: number;
  mime: string;
}

export interface FileAttachment {
  blobId: string;
  fileName: string;
  mime: string;
  size: number;
  url?: string; // 預覽 URL（如果有的話）
}