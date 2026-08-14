import { CSSProperties, MouseEvent, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { AsgardSourceSetClient } from '@asgard-js/core';
import { ContextMenu, type ContextMenuItem } from '../file-explorer/context-menu';
import { type Locale, t } from '../../i18n';
import { Spinner } from '../spinner';
import { SourceSetFileView } from './file-view';
import { SourceSetTree } from './tree';
import { useSourceSetDialog } from './dialog';
import {
  ClipboardPasteIcon,
  CircleAlertIcon,
  CopyIcon,
  DownloadIcon,
  FilePlusIcon,
  FolderPlusIcon,
  PencilIcon,
  RefreshIcon,
  ScissorsIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from './icons';
import { useSourceSetExplorer } from './use-source-set-explorer';
import styles from './source-set-explorer.module.scss';

/**
 * Overrides for the tokens this component paints with.
 *
 * Deliberately the same `--asg-*` tokens the in-sandbox explorer uses, so the two look identical wherever
 * a host mounts both (F-025 R16). Every one has a `var()` fallback in the stylesheet, so a host that sets
 * nothing still gets a fully painted component rather than a transparent box.
 */
export interface SourceSetExplorerTheme {
  surface?: string;
  textPrimary?: string;
  textSecondary?: string;
  border?: string;
  primary?: string;
  error?: string;
  fontFamily?: string;
  fontFamilyMono?: string;
}

export interface SourceSetFileExplorerProps {
  /**
   * The volume endpoint, e.g. `{EDGE}/ns/{ns}/source-set/{name}/volume` or a BFF relay such as
   * `{PLATFORM_API}/v1/source-set/{id}/volume`.
   */
  sourceSetEndpoint: string;
  /** Sent as `X-API-KEY`. Omit against a BFF relay — the relay holds the volume key. */
  apiKey?: string;
  /** Merged into every request, e.g. `{ Authorization: 'Bearer …' }`. */
  customHeaders?: Record<string, string>;
  /** Lock the tree to a subtree of the volume. Defaults to the volume root. */
  rootPath?: string;
  /** Expand to, and select, this path on mount. */
  initialPath?: string;
  /** Hide every mutating action, including the file view's edit entry point. */
  readOnly?: boolean;
  locale?: Locale;
  theme?: SourceSetExplorerTheme;
  /** Ceiling on one directory's auto-paging walk (F-026). */
  maxEntries?: number;
  onError?: (error: unknown) => void;
}

interface ExplorerAction {
  key: string;
  labelKey: string;
  label?: string;
  icon: ReactNode;
  run: () => void;
  disabled: boolean;
  /**
   * Whether this action changes the volume. `readOnly` drops every one of them (R10).
   *
   * Copy and cut count even though neither writes on its own: their only purpose is to feed paste, so
   * leaving them behind on a read-only volume offers a gesture that can never complete.
   */
  mutating: boolean;
  danger?: boolean;
}

function themeStyle(theme?: SourceSetExplorerTheme): CSSProperties {
  if (!theme) return {};

  const vars: Record<string, string> = {};
  const set = (name: string, value?: string): void => {
    if (value) vars[name] = value;
  };

  set('--asg-color-surface', theme.surface);
  set('--asg-color-text-primary', theme.textPrimary);
  set('--asg-color-text-secondary', theme.textSecondary);
  set('--asg-color-border', theme.border);
  set('--asg-color-primary', theme.primary);
  set('--asg-color-error', theme.error);
  set('--asg-font-family', theme.fontFamily);
  set('--asg-font-family-mono', theme.fontFamilyMono);

  return vars as CSSProperties;
}

/**
 * A File Explorer mounted directly on a SourceSet volume (F-025).
 *
 * Nothing here knows about chat: no `useAsgardContext`, no sandbox, no channel, no Nudge. Give it an
 * endpoint and either an `apiKey` or `customHeaders` and it renders — which is what lets the same
 * component serve Platform's SourceSet and SkillSet screens and Agent Hub's Directory screen on props
 * alone.
 *
 * There is no watch: a volume is served by several replicas and exposes no change stream, so freshness
 * comes from the refresh button rather than a subscription.
 */
export function SourceSetFileExplorer(props: SourceSetFileExplorerProps): ReactNode {
  const {
    sourceSetEndpoint,
    apiKey,
    customHeaders,
    rootPath = '',
    initialPath,
    readOnly = false,
    locale = 'en-US',
    theme,
    maxEntries,
    onError,
  } = props;

  // `customHeaders` is almost always an object literal at the call site, so identity alone would rebuild
  // the client — and the whole tree with it — on every host render.
  const headerKey = customHeaders ? JSON.stringify(customHeaders) : '';
  const client = useMemo(
    () =>
      new AsgardSourceSetClient({
        sourceSetEndpoint,
        apiKey,
        customHeaders: headerKey ? (JSON.parse(headerKey) as Record<string, string>) : undefined,
      }),
    [sourceSetEndpoint, apiKey, headerKey],
  );

  const { dialog, requestInput, requestConfirm } = useSourceSetDialog(locale);
  const explorer = useSourceSetExplorer({
    client,
    rootPath,
    initialPath,
    locale,
    maxEntries,
    readOnly,
    onError,
    requestInput,
    requestConfirm,
  });

  const fileInput = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const { selected, clipboard, openFile } = explorer;
  const hasSelection = selected != null;
  const selectedIsFile = hasSelection && !selected.isDir;

  /**
   * The one action table (R5). The toolbar and the context menu both render *this*, so the two cannot
   * drift apart into different sets or different disabled rules — the parity is structural rather than
   * something two call sites have to keep agreeing on.
   */
  const actions = useMemo((): ExplorerAction[] => {
    const all: ExplorerAction[] = [
      {
        key: 'newFile',
        labelKey: 'sourceSetExplorer.newFile',
        icon: <FilePlusIcon size={15} />,
        run: () => void explorer.newFile(),
        disabled: false,
        mutating: true,
      },
      {
        key: 'newFolder',
        labelKey: 'sourceSetExplorer.newFolder',
        icon: <FolderPlusIcon size={15} />,
        run: () => void explorer.newFolder(),
        disabled: false,
        mutating: true,
      },
      {
        key: 'upload',
        labelKey: 'sourceSetExplorer.upload',
        icon: <UploadIcon size={15} />,
        run: () => fileInput.current?.click(),
        disabled: false,
        mutating: true,
      },
      {
        key: 'download',
        labelKey: 'sourceSetExplorer.download',
        icon: <DownloadIcon size={15} />,
        run: () => void explorer.download(),
        disabled: !selectedIsFile,
        mutating: false,
      },
      {
        key: 'copy',
        labelKey: 'sourceSetExplorer.copy',
        icon: <CopyIcon size={15} />,
        run: explorer.copy,
        disabled: !hasSelection,
        mutating: true,
      },
      {
        key: 'cut',
        labelKey: 'sourceSetExplorer.cut',
        icon: <ScissorsIcon size={15} />,
        run: explorer.cut,
        disabled: !hasSelection,
        mutating: true,
      },
      {
        key: 'paste',
        labelKey: 'sourceSetExplorer.paste',
        label: clipboard ? t(locale, 'sourceSetExplorer.pasteNamed', { name: clipboard.entry.name }) : undefined,
        icon: <ClipboardPasteIcon size={15} />,
        run: () => void explorer.paste(),
        disabled: clipboard == null,
        mutating: true,
      },
      {
        key: 'rename',
        labelKey: 'sourceSetExplorer.rename',
        icon: <PencilIcon size={15} />,
        run: () => void explorer.rename(),
        disabled: !hasSelection,
        mutating: true,
      },
      {
        key: 'delete',
        labelKey: 'sourceSetExplorer.delete',
        icon: <TrashIcon size={15} />,
        run: () => void explorer.remove(),
        disabled: !hasSelection,
        mutating: true,
        danger: true,
      },
      {
        key: 'refresh',
        labelKey: 'sourceSetExplorer.refresh',
        icon: <RefreshIcon size={15} />,
        run: explorer.refresh,
        disabled: false,
        mutating: false,
      },
    ];

    return readOnly ? all.filter(action => !action.mutating) : all;
  }, [explorer, readOnly, hasSelection, selectedIsFile, clipboard, locale]);

  const labelOf = useCallback((action: ExplorerAction): string => action.label ?? t(locale, action.labelKey), [locale]);

  const openMenu = useCallback((event: MouseEvent): void => {
    event.preventDefault();
    const host = event.currentTarget.closest<HTMLElement>(`.${styles.root}`);
    const bounds = host?.getBoundingClientRect();
    setMenu({ x: event.clientX - (bounds?.left ?? 0), y: event.clientY - (bounds?.top ?? 0) });
  }, []);

  const closeMenu = useCallback((): void => setMenu(null), []);

  // Grouping only — the menu carries exactly the actions the toolbar does.
  const menuSections = useMemo((): ContextMenuItem[][] => {
    const group = (keys: string[]): ContextMenuItem[] =>
      actions
        .filter(action => keys.includes(action.key))
        .map(action => ({
          key: action.key,
          label: labelOf(action),
          icon: action.icon,
          disabled: action.disabled,
          danger: action.danger,
          onSelect: action.run,
        }));

    return [
      group(['newFile', 'newFolder', 'upload']),
      group(['download', 'copy', 'cut', 'paste']),
      group(['rename', 'delete']),
      group(['refresh']),
    ].filter(section => section.length > 0);
  }, [actions, labelOf]);

  return (
    <div className={styles.root} style={themeStyle(theme)}>
      <div className={styles.toolbar} role="toolbar" aria-label={t(locale, 'sourceSetExplorer.toolbar')}>
        {actions.map(action => (
          <button
            key={action.key}
            type="button"
            className={`${styles.toolBtn} ${action.danger ? styles.toolBtnDanger : ''}`}
            // R5: an action that needs a selection goes inert, it does not disappear — a toolbar whose
            // buttons come and go makes the user hunt for the one they just used.
            disabled={action.disabled}
            aria-label={labelOf(action)}
            title={labelOf(action)}
            onClick={action.run}
          >
            {action.icon}
          </button>
        ))}
        {explorer.busy && <Spinner size={13} />}
      </div>

      {explorer.error && (
        <div className={styles.errorBar} role="alert">
          <CircleAlertIcon size={13} />
          <span className={styles.errorText}>{explorer.error}</span>
          <button
            type="button"
            className={styles.errorDismiss}
            aria-label={t(locale, 'sourceSetExplorer.dismissError')}
            onClick={explorer.dismissError}
          >
            <XIcon size={13} />
          </button>
        </div>
      )}

      <div className={styles.body}>
        {openFile ? (
          <SourceSetFileView
            // Keyed on the refresh token so the toolbar's refresh re-reads the open file too (R8).
            key={`${openFile.path}:${explorer.refreshToken}`}
            file={openFile}
            readFile={explorer.readFile}
            onSaveFile={explorer.saveFile}
            editable={!readOnly}
            onDownload={() => void explorer.download()}
            onBack={explorer.closeFile}
            locale={locale}
          />
        ) : (
          <SourceSetTree
            listings={explorer.listings}
            expanded={explorer.expanded}
            selected={selected}
            rootPath={rootPath}
            locale={locale}
            onSelect={explorer.select}
            onToggle={explorer.toggleExpand}
            onOpen={explorer.open}
            onContextMenu={openMenu}
          />
        )}
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} sections={menuSections} onClose={closeMenu} />}

      <input
        ref={fileInput}
        type="file"
        multiple
        className={styles.fileInput}
        onChange={event => {
          const picked = event.target.files;
          if (picked && picked.length > 0) void explorer.upload(picked);

          // Reset so picking the same file twice in a row still fires `change`.
          event.target.value = '';
        }}
      />

      {dialog}
    </div>
  );
}
