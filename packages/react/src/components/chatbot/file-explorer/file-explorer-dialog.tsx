import { KeyboardEvent, MouseEvent, ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
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
 *
 * Dropping the blocking dialog does mean the panel keeps running underneath, so every path that could
 * previously never interleave now has to be handled explicitly — see `settlePending` (a second request
 * arriving before the first is answered) and `dialog` being rendered on *every* branch of the panel,
 * not just the one that happened to be on screen when the request was made.
 */

type DialogRequest =
  | { mode: 'input'; title: string; resolve: (value: string | null) => void }
  | { mode: 'confirm'; title: string; resolve: (value: boolean) => void };

/** Settle a request as dismissed, whichever mode it is. */
function dismiss(request: DialogRequest): void {
  if (request.mode === 'input') request.resolve(null);
  else request.resolve(false);
}

export interface FileExplorerDialogApi {
  /** Render this where the panel can overlay it — on every return branch. `null` while none is open. */
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
  const titleId = useId();

  // Mirrors `request` for the teardown paths below, which must not re-run when it changes.
  const requestRef = useRef<DialogRequest | null>(null);
  requestRef.current = request;

  // A dialog still open at unmount would leave its caller awaiting forever. Settle it as dismissed so
  // the awaiting action unwinds without mutating anything.
  useEffect(() => {
    return (): void => {
      if (requestRef.current) dismiss(requestRef.current);
    };
  }, []);

  // Replacing a live request would drop its `resolve` and leave that caller pending forever. The panel
  // stays interactive behind the backdrop, so this is reachable — e.g. Shift+Tab back to the toolbar
  // and press Enter while a dialog is open.
  const settlePending = useCallback((): void => {
    if (requestRef.current) dismiss(requestRef.current);
  }, []);

  useEffect(() => {
    if (request?.mode === 'input') inputRef.current?.select();
  }, [request]);

  const requestInput = useCallback(
    (options: { title: string; defaultValue?: string }): Promise<string | null> => {
      settlePending();

      return new Promise<string | null>(resolve => {
        setValue(options.defaultValue ?? '');
        setRequest({ mode: 'input', title: options.title, resolve });
      });
    },
    [settlePending],
  );

  const requestConfirm = useCallback(
    (options: { title: string }): Promise<boolean> => {
      settlePending();

      return new Promise<boolean>(resolve => {
        setRequest({ mode: 'confirm', title: options.title, resolve });
      });
    },
    [settlePending],
  );

  const settle = useCallback(
    (accepted: boolean): void => {
      if (!request) return;

      if (request.mode === 'input') {
        const name = value.trim();

        // Empty input is a no-op, matching what `window.prompt` returned on cancel.
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

        return;
      }

      // Enter confirms only from the text field. Without the target check it also fires while the
      // Cancel button holds focus — this handler sits on the backdrop and sees the keydown before the
      // button's click, so Cancel would confirm the rename instead of aborting it.
      if (event.key === 'Enter' && request?.mode === 'input' && event.target === inputRef.current) {
        event.preventDefault();
        if (value.trim()) settle(true);
      }
    },
    [request, settle, value],
  );

  // Clicking the dim area dismisses, matching the tool-call consent modal. Without it a keyboard user
  // whose focus has left the dialog has no way out, since the backdrop div cannot hold focus.
  const onBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (event.target === event.currentTarget) settle(false);
    },
    [settle],
  );

  const confirmDisabled = request?.mode === 'input' && !value.trim();

  const dialog = request ? (
    <div className={styles.backdrop} onKeyDown={onKeyDown} onClick={onBackdropClick} role="presentation">
      {/*
        Deliberately no `aria-modal`: the backdrop is absolutely positioned inside the panel, so the
        rest of the page stays reachable. Claiming modality would tell a screen reader that outside
        content is unavailable when it demonstrably is not.
      */}
      <div className={styles.dialog} role="dialog" aria-labelledby={titleId}>
        <div className={styles.title} id={titleId}>
          {request.title}
        </div>
        {request.mode === 'input' && (
          <input
            ref={inputRef}
            className={styles.input}
            value={value}
            onChange={event => setValue(event.target.value)}
            aria-label={request.title}
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
            disabled={confirmDisabled}
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
