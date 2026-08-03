import { KeyboardEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Locale, t } from '../../../i18n';
import styles from './file-explorer-dialog.module.scss';

/**
 * The File Explorer's replacement for `window.prompt` / `window.confirm`.
 *
 * The native dialogs were unusable here on three counts: they cannot be localized, they take OS
 * styling and so escape `AsgardThemeScope`, and they block the tab's JS outright — which froze the
 * page hard enough during Sindri F-028 acceptance that no CDP command could get through, so any
 * consumer running Playwright/CDP e2e hit it too (asgard-sdk-pm#49).
 *
 * The API is promise-based on purpose: call sites keep the shape they had with `window.prompt`
 * (`const name = await requestInput(...); if (!name) return;`), so the surrounding logic is untouched.
 */

type DialogRequest =
  | { mode: 'input'; title: string; defaultValue: string; resolve: (value: string | null) => void }
  | { mode: 'confirm'; title: string; resolve: (value: boolean) => void };

export interface FileExplorerDialogApi {
  /** Render this where the panel can overlay it. `null` while no dialog is open. */
  dialog: ReactNode;
  /** Resolves to the trimmed name, or `null` if dismissed / left empty. */
  requestInput: (options: { title: string; defaultValue?: string }) => Promise<string | null>;
  /** Resolves to `true` only on explicit confirmation. */
  requestConfirm: (options: { title: string }) => Promise<boolean>;
}

export function useFileExplorerDialog(locale: Locale): FileExplorerDialogApi {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // A dialog still open at unmount would leave its caller awaiting forever. Settle it as "dismissed"
  // so the awaiting action unwinds without mutating anything (R8).
  const requestRef = useRef<DialogRequest | null>(null);
  requestRef.current = request;
  useEffect(() => {
    return (): void => {
      const pending = requestRef.current;

      if (!pending) return;

      if (pending.mode === 'input') pending.resolve(null);
      else pending.resolve(false);
    };
  }, []);

  useEffect(() => {
    if (request?.mode === 'input') inputRef.current?.select();
  }, [request]);

  const requestInput = useCallback((options: { title: string; defaultValue?: string }): Promise<string | null> => {
    return new Promise<string | null>(resolve => {
      setValue(options.defaultValue ?? '');
      setRequest({ mode: 'input', title: options.title, defaultValue: options.defaultValue ?? '', resolve });
    });
  }, []);

  const requestConfirm = useCallback((options: { title: string }): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setRequest({ mode: 'confirm', title: options.title, resolve });
    });
  }, []);

  const settle = useCallback(
    (accepted: boolean): void => {
      if (!request) return;

      if (request.mode === 'input') {
        const name = value.trim();

        // Empty input is a no-op, matching what `window.prompt` returned on cancel (R8).
        request.resolve(accepted && name ? name : null);
      } else {
        request.resolve(accepted);
      }

      setRequest(null);
      setValue('');
    },
    [request, value],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        settle(false);
      } else if (event.key === 'Enter' && request?.mode === 'input') {
        event.preventDefault();
        settle(true);
      }
    },
    [request, settle],
  );

  const dialog = request ? (
    <div className={styles.backdrop} onKeyDown={onKeyDown} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={request.title}>
        <div className={styles.title}>{request.title}</div>
        {request.mode === 'input' && (
          <input
            ref={inputRef}
            className={styles.input}
            value={value}
            onChange={event => setValue(event.target.value)}
            autoFocus
          />
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={() => settle(false)}>
            {t(locale, 'fileExplorer.cancel')}
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={() => settle(true)}
            disabled={request.mode === 'input' && !value.trim()}
            autoFocus={request.mode === 'confirm'}
          >
            {t(locale, 'fileExplorer.confirm')}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { dialog, requestInput, requestConfirm };
}
