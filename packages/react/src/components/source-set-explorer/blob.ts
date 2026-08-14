// Blob plumbing between the volume client (which speaks bytes) and the file view (which wants a string).

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

/** Whether this filename should be read as an image — kept in step with the file view's own check. */
export function isImageName(name: string): boolean {
  const i = name.lastIndexOf('.');

  return i > 0 && IMAGE_EXTS.has(name.slice(i + 1).toLowerCase());
}

/** Read a blob as text. */
export function blobToText(blob: Blob): Promise<string> {
  return blob.text();
}

/**
 * Read a blob as a `data:` URL for `<img src>`.
 *
 * A data URL rather than `URL.createObjectURL`: an object URL has to be revoked or it leaks for the life
 * of the document, and the view that renders it has no teardown hook for a string it was merely handed.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(reader.error ?? new Error('Could not read file'));
    reader.onload = (): void => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/**
 * Hand a blob to the browser as a download named `name`.
 *
 * The object URL is revoked on the next task rather than immediately: revoking in the same tick can beat
 * the navigation the click starts, and the download silently does nothing.
 */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
