import { AsgardServiceClient, SandboxFsListResult } from '@asgard-js/core';
import { FsListDir } from './file-explorer-panel';
import { FsReadFile, FsSaveFile } from './types';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

function isImagePath(path: string): boolean {
  const i = path.lastIndexOf('.');

  return i > 0 && IMAGE_EXTS.has(path.slice(i + 1).toLowerCase());
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(String(reader.result));
    reader.onerror = (): void => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface SandboxFsProviders {
  listDir: FsListDir;
  readFile: FsReadFile;
  saveFile: FsSaveFile;
}

/**
 * Wire the core sandbox fs client methods into the `FileExplorerPanel` providers (F-021). Image files
 * resolve to a data URL (for `<img src>`); text files to their decoded string.
 */
export function createSandboxFsProviders(client: AsgardServiceClient): SandboxFsProviders {
  return {
    listDir: (sandboxName: string, path: string): Promise<SandboxFsListResult> =>
      client.sandboxFsList(sandboxName, path),
    readFile: async (sandboxName: string, path: string): Promise<string> => {
      const { content } = await client.sandboxFsRead(sandboxName, path);

      return isImagePath(path) ? blobToDataUrl(content) : content.text();
    },
    saveFile: async (sandboxName: string, path: string, text: string): Promise<void> => {
      await client.sandboxFsWrite(sandboxName, path, text);
    },
  };
}
