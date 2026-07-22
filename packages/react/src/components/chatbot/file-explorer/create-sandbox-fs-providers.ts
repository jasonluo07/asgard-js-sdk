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

/** A directory mutation (mkdir / delete). */
export type FsMutatePath = (sandboxName: string, path: string) => Promise<void>;
/** A src→dst mutation (copy / move / rename). */
export type FsMutateSrcDst = (sandboxName: string, src: string, dst: string) => Promise<void>;
/** Upload a picked file into a directory. */
export type FsUpload = (sandboxName: string, dirPath: string, file: File) => Promise<void>;

export interface SandboxFsProviders {
  listDir: FsListDir;
  readFile: FsReadFile;
  saveFile: FsSaveFile;
  // F-021 Cycle 2 — mutations.
  mkdir: FsMutatePath;
  /** Delete a file (`fs/item`) or directory (`fs/all`, recursive) — routed by `isDir`. */
  remove: (sandboxName: string, path: string, isDir: boolean) => Promise<void>;
  copy: FsMutateSrcDst;
  move: FsMutateSrcDst;
  upload: FsUpload;
  /** Download a file to the browser (`GET fs/file` → `<a download>`). */
  download: (sandboxName: string, path: string, name: string) => Promise<void>;
}

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
 * Wire the core sandbox fs client methods into the `FileExplorerPanel` providers (F-021). Image files
 * resolve to a data URL (for `<img src>`); text files to their decoded string. Cycle 2 adds the mutation
 * providers (mkdir / remove / copy / move / upload) over the fuller fs edge API.
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
    mkdir: (sandboxName: string, path: string): Promise<void> => client.sandboxFsMkdir(sandboxName, path),
    remove: (sandboxName: string, path: string, isDir: boolean): Promise<void> =>
      isDir ? client.sandboxFsRemoveAll(sandboxName, path) : client.sandboxFsRemove(sandboxName, path),
    copy: async (sandboxName: string, src: string, dst: string): Promise<void> => {
      await client.sandboxFsCopy(sandboxName, src, dst);
    },
    move: (sandboxName: string, src: string, dst: string): Promise<void> => client.sandboxFsMove(sandboxName, src, dst),
    upload: async (sandboxName: string, dirPath: string, file: File): Promise<void> => {
      const dst = `${dirPath.replace(/\/$/, '')}/${file.name}`;
      await client.sandboxFsWrite(sandboxName, dst, file);
    },
    download: async (sandboxName: string, path: string, name: string): Promise<void> => {
      const { content } = await client.sandboxFsRead(sandboxName, path);
      triggerBlobDownload(content, name);
    },
  };
}
