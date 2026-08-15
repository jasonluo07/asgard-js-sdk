import { MouseEvent, ReactNode } from 'react';
import type { FsEntry } from '../file-explorer/types';
import { type Locale, t } from '../../i18n';
import { Spinner } from '../spinner';
import { ChevronDownIcon, ChevronRightIcon, CircleAlertIcon, FileIcon, FolderIcon, FolderOpenIcon } from './icons';
import type { DirListing } from './use-source-set-explorer';
import styles from './source-set-explorer.module.scss';

export interface SourceSetTreeProps {
  listings: Readonly<Record<string, DirListing>>;
  expanded: ReadonlySet<string>;
  selected: FsEntry | null;
  rootPath: string;
  locale: Locale;
  onSelect: (entry: FsEntry) => void;
  onToggle: (entry: FsEntry) => void;
  onOpen: (entry: FsEntry) => void;
  /** Right-click anywhere in the tree; the row handler selects its entry first. */
  onContextMenu: (event: MouseEvent) => void;
}

const INDENT_REM = 0.85;

/**
 * The lazy file tree (F-025 R4). A directory lists on first expand and keeps its listing until something
 * invalidates it; nothing is fetched for a branch the user never opens.
 *
 * Every node also carries F-026's answer to "is this all of it?" — a directory is spinning while its
 * walk pages, and a walk that stopped short says by how much instead of quietly showing fewer files.
 */
export function SourceSetTree(props: SourceSetTreeProps): ReactNode {
  const { listings, expanded, selected, rootPath, locale, onSelect, onToggle, onOpen, onContextMenu } = props;

  function renderDirBody(path: string, depth: number): ReactNode {
    const listing = listings[path];

    if (!listing || listing.status === 'loading') {
      return (
        <div className={styles.nodeStatus} style={{ paddingLeft: `${depth * INDENT_REM}rem` }}>
          <Spinner size={12} /> {t(locale, 'sourceSetExplorer.loading')}
        </div>
      );
    }

    if (listing.status === 'error') {
      return (
        <div
          className={`${styles.nodeStatus} ${styles.nodeError}`}
          style={{ paddingLeft: `${depth * INDENT_REM}rem` }}
          role="alert"
        >
          <CircleAlertIcon size={12} /> {listing.error}
        </div>
      );
    }

    if (listing.entries.length === 0) {
      return (
        <div className={styles.nodeStatus} style={{ paddingLeft: `${depth * INDENT_REM}rem` }}>
          {t(locale, 'sourceSetExplorer.emptyDir')}
        </div>
      );
    }

    return (
      <>
        {listing.entries.map(entry => renderNode(entry, depth))}
        {!listing.complete && (
          <div
            className={`${styles.nodeStatus} ${styles.nodeShortfall}`}
            style={{ paddingLeft: `${depth * INDENT_REM}rem` }}
          >
            {listing.total > listing.entries.length
              ? t(locale, 'sourceSetExplorer.moreNotLoaded', { n: listing.total - listing.entries.length })
              : t(locale, 'sourceSetExplorer.moreNotLoadedUnknown')}
          </div>
        )}
      </>
    );
  }

  function renderNode(entry: FsEntry, depth: number): ReactNode {
    const isOpen = entry.isDir && expanded.has(entry.path);
    const isSelected = selected?.path === entry.path;

    return (
      <div key={entry.path} className={styles.node}>
        <div
          className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
          style={{ paddingLeft: `${depth * INDENT_REM}rem` }}
          role="treeitem"
          aria-selected={isSelected}
          aria-expanded={entry.isDir ? isOpen : undefined}
          tabIndex={0}
          onClick={() => {
            onSelect(entry);
            if (entry.isDir) onToggle(entry);
          }}
          onDoubleClick={() => onOpen(entry)}
          onContextMenu={event => {
            onSelect(entry);
            onContextMenu(event);
          }}
          onKeyDown={event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            event.preventDefault();
            onSelect(entry);
            if (entry.isDir) onToggle(entry);
            else onOpen(entry);
          }}
        >
          <span className={styles.chevron}>
            {entry.isDir ? isOpen ? <ChevronDownIcon size={13} /> : <ChevronRightIcon size={13} /> : null}
          </span>
          <span className={styles.icon}>
            {entry.isDir ? isOpen ? <FolderOpenIcon size={14} /> : <FolderIcon size={14} /> : <FileIcon size={14} />}
          </span>
          <span className={styles.label}>{entry.name}</span>
        </div>
        {isOpen && renderDirBody(entry.path, depth + 1)}
      </div>
    );
  }

  return (
    <div className={styles.tree} role="tree" onContextMenu={onContextMenu}>
      {renderDirBody(rootPath, 0)}
    </div>
  );
}
