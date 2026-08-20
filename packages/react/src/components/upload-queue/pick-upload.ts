/**
 * Turning "what the user picked" into a flat upload plan — the browser layer of batch upload
 * (F-031 / F-025). Deliberately free of any backend concept: it yields relative paths and `File`s,
 * and the caller decides what directory they land in.
 *
 * There are three entry points because the browser genuinely gives back different things:
 *
 * | Entry              | Mechanism                                | Yields                       | Cannot see    |
 * | ------------------ | ---------------------------------------- | ---------------------------- | ------------- |
 * | Upload files…      | `<input multiple>`                       | many files                   | folders       |
 * | Upload folder…     | `<input webkitdirectory>`                | every **file** in the tree   | empty folders |
 * | Drag from desktop  | `DataTransferItem.webkitGetAsEntry()`    | the tree, **incl. empties**  | —             |
 *
 * The middle row is why the upload button has to ask "files or folder?" instead of doing one thing:
 * a `webkitdirectory` FileList contains only files, and a directory holding no files appears in no
 * entry's path, so it simply is not in that input. The backend cannot help — nothing ever told it
 * such a directory exists. Keeping an empty folder therefore requires the drag path, and the
 * difference has to be visible in the UI rather than silently changing what gets created.
 *
 * Every `relPath` here is relative to the upload destination and may contain several levels
 * (`notes/sub/b.md`). Callers do **not** need to create those levels: both backends' write paths
 * `MkdirAll` the parent directory first. Only `emptyDirs` needs an explicit mkdir.
 */

/** One file to upload, at a path relative to the destination directory. */
export interface UploadPlanItem {
  relPath: string;
  file: File;
}

/** Which entry point produced a plan — decides whether to warn that empty folders are absent. */
export type UploadPlanSource = 'files' | 'directory' | 'drop';

export interface UploadPlan {
  items: UploadPlanItem[];
  /**
   * Directories that hold no files and so must be created explicitly. Only the drag path can ever
   * populate this; see the table above.
   */
  emptyDirs: string[];
  source: UploadPlanSource;
}

/** An empty plan, for a dismissed picker or a drop carrying nothing we can read. */
export function emptyUploadPlan(source: UploadPlanSource): UploadPlan {
  return { items: [], emptyDirs: [], source };
}

export function isUploadPlanEmpty(plan: UploadPlan): boolean {
  return plan.items.length === 0 && plan.emptyDirs.length === 0;
}

/**
 * Read a picked `FileList` into a plan.
 *
 * `webkitRelativePath` carries the path a folder pick came with (including the folder the user
 * chose), and is an empty string for a plain multi-file pick. Falling back to `file.name` matters:
 * a file arriving without a relative path must still upload rather than silently vanish.
 */
export function planFromFileList(files: FileList | readonly File[], source: UploadPlanSource): UploadPlan {
  return {
    items: Array.from(files).map(file => ({ relPath: file.webkitRelativePath || file.name, file })),
    emptyDirs: [],
    source,
  };
}

/** Is this drag carrying files, rather than selected text or an in-tree node? */
export function isFileDrag(dataTransfer: DataTransfer | null): boolean {
  return !!dataTransfer && Array.from(dataTransfer.types).includes('Files');
}

/**
 * Read every entry a directory holds.
 *
 * `readEntries` returns **one batch at a time** (Chromium: 100), not the whole listing, and signals
 * the end by returning an empty array. Reading it once looks like it works and silently drops
 * everything past the first batch — a loss that leaves no trace, so it reads as "the user dragged
 * fewer files than they thought". Hence the loop.
 */
function readAllEntries(directory: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = directory.createReader();
  const all: FileSystemEntry[] = [];

  return new Promise((resolve, reject) => {
    const readBatch = (): void => {
      reader.readEntries(batch => {
        if (batch.length === 0) {
          resolve(all);

          return;
        }

        all.push(...batch);
        readBatch();
      }, reject);
    };

    readBatch();
  });
}

function entryToFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function isDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
  return entry.isFile;
}

async function walkEntry(entry: FileSystemEntry, prefix: string, into: UploadPlan): Promise<void> {
  const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;

  if (isFileEntry(entry)) {
    into.items.push({ relPath, file: await entryToFile(entry) });

    return;
  }

  if (!isDirectoryEntry(entry)) return;

  const children = await readAllEntries(entry);

  if (children.length === 0) {
    // The only place an empty directory is ever observable. Record it so the caller can mkdir it;
    // otherwise dragging a folder in quietly loses part of its shape.
    into.emptyDirs.push(relPath);

    return;
  }

  for (const child of children) await walkEntry(child, relPath, into);
}

/**
 * Expand a drop into a plan, recursing through directories and keeping empty ones.
 *
 * `DataTransferItemList` is invalidated once the task yields, so every root entry is taken
 * **synchronously** before the first `await` — reading a second item after awaiting returns `null`
 * and drops that whole subtree.
 */
export async function planFromDataTransfer(dataTransfer: DataTransfer): Promise<UploadPlan> {
  const roots = Array.from(dataTransfer.items)
    .filter(item => item.kind === 'file')
    .map(item => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);

  // No entry API, or the drag did not come from a filesystem: `dataTransfer.files` still gives a
  // flat list of files, which is worth uploading even though folders are lost.
  if (roots.length === 0) return planFromFileList(dataTransfer.files, 'drop');

  const plan = emptyUploadPlan('drop');

  for (const root of roots) await walkEntry(root, '', plan);

  return plan;
}

/** Split a relative path into its directory part (may be empty) and its file name. */
export function splitRelPath(relPath: string): { dir: string; base: string } {
  const slash = relPath.lastIndexOf('/');

  return slash < 0 ? { dir: '', base: relPath } : { dir: relPath.slice(0, slash), base: relPath.slice(slash + 1) };
}

/** `report.txt` → `report (2).txt`; a name without an extension just gets the suffix appended. */
export function dedupeName(relPath: string, n: number): string {
  const { dir, base } = splitRelPath(relPath);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  const renamed = `${stem} (${n})${ext}`;

  return dir ? `${dir}/${renamed}` : renamed;
}
