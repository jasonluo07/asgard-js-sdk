import { AsgardServiceClient } from '@asgard-js/core';

const CWD_SCHEME = 'cwd://';

/**
 * 判斷 uri 是否為指向 channel sandbox 工作目錄的 cwd:// 連結。
 */
export function isCwdUri(uri: string | null | undefined): boolean {
  return typeof uri === 'string' && uri.startsWith(CWD_SCHEME);
}

/**
 * 把取回的 blob 透過 <a download> 觸發瀏覽器下載。
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 處理 cwd:// URI action：取出相對路徑、呼叫 Edge Server 取回檔案 binary、觸發瀏覽器下載。
 * 失敗時記錄錯誤而不向外拋，讓事件 handler 可安全地 `void` 它。
 */
export async function downloadCwdUri(client: AsgardServiceClient, customChannelId: string, uri: string): Promise<void> {
  try {
    const relativePath = uri.slice(CWD_SCHEME.length);
    const { blob, filename } = await client.downloadCwdFile(relativePath, customChannelId);

    triggerBlobDownload(blob, filename);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[asgard] cwd download failed:', error);
  }
}
