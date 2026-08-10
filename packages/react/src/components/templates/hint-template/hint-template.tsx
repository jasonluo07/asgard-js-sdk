import { ReactNode, useCallback, useState } from 'react';
import classes from './hint-template.module.scss';
import { formatTime } from '../../../utils';
import { ConversationErrorMessage, ConversationMessage, MessageTemplateType } from '@asgard-js/core';
import { useAsgardTemplateContext, useAsgardThemeContext } from '../../../context';
import { t } from '../../../i18n';
import clsx from 'clsx';

interface HintTemplateProps {
  message: ConversationMessage;
}

function ChevronIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/** Whether a value carries information — blank strings and all-blank objects do not. */
function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') return value.trim() !== '';

  if (typeof value === 'object') return Object.values(value).some(isPresent);

  return true;
}

// The run-terminal error bubble (`asgard.run.error`).
//
// The event's `message` is frequently the ONLY thing that tells the user what went wrong and what
// they can do about it — a Sandbox denied by asgard-kube-admission surfaces its quota /
// subscription reason there — so it is rendered verbatim rather than replaced by a fixed
// "Unexpected error" string (that stays as the fallback for an event with no message).
//
// Everything that is diagnostics rather than instruction (`code`, `traceId`, the raw upstream
// `inner`) hides behind a details toggle. Backend errors can be arbitrarily long, so the summary
// clamps to two lines and every expanded region scrolls inside its own height cap — the bubble's
// footprint stays bounded no matter what the server sends.
function ErrorHint({ message }: { message: ConversationErrorMessage }): ReactNode {
  const { locale = 'en-US', onErrorClick, errorMessageRenderer } = useAsgardTemplateContext();
  const [open, setOpen] = useState(false);

  const onErrorHintClick = useCallback(() => {
    onErrorClick?.(message);
  }, [message, onErrorClick]);

  // Matches the previous `errorMessageRenderer?.(message) ?? <default/>`: a renderer that returns
  // null/undefined falls through to the default UI rather than blanking the bubble.
  const custom = errorMessageRenderer?.(message);

  if (custom != null) return custom;

  const summary = message.error?.message?.trim() || t(locale, 'error.unexpected');
  // Dumped whole rather than field-by-field on purpose: this payload's shape is still moving (the
  // backend is filling in `code` / `inner` as it goes), and a hand-picked list would silently omit
  // whatever it adds next. Stringifying everything also gives an engineer one blob to copy into a
  // ticket. `traceId` rides on the message, not the error, so it is merged in.
  const details = { traceId: message.traceId, ...message.error };
  // `message` is excluded from the decision (not from the dump): it is already the summary above, so
  // an event carrying nothing else would otherwise offer a toggle that reveals what is on screen.
  // `location` arrives as a fully-blank object on most errors, hence the look inside.
  const hasDetails = Object.entries(details).some(([key, value]) => key !== 'message' && isPresent(value));

  return (
    <>
      <div className={classes.error_hint_title}>
        <span className={classes.time}>{formatTime(message.time)}</span>
        <span className={classes.error_hint_summary} title={summary}>
          {summary}
        </span>
      </div>
      {hasDetails && (
        <button
          type="button"
          className={classes.error_hint_toggle}
          onClick={() => setOpen(prev => !prev)}
          aria-expanded={open}
        >
          <ChevronIcon className={clsx(classes.error_hint_chevron, open && classes.error_hint_chevron__expanded)} />
          <span>{open ? t(locale, 'error.hideDetails') : t(locale, 'error.showDetails')}</span>
        </button>
      )}
      {open && hasDetails && (
        <div className={classes.error_details}>
          <span className={classes.error_detail_label}>{t(locale, 'error.detail')}</span>
          <pre className={classes.error_inner}>{JSON.stringify(details, null, 2)}</pre>
        </div>
      )}
      {onErrorClick && (
        <div className={classes.error_hint_message} onClick={onErrorHintClick}>
          Click <span>here</span> to view the report.
        </div>
      )}
    </>
  );
}

export function HintTemplate(props: HintTemplateProps): ReactNode {
  const { message } = props;

  const { template: themeTemplate } = useAsgardThemeContext();

  if (message.type === 'user') return null;

  if (message.type === 'error')
    return (
      <div className={clsx('asgard-hint-template asgard-hint-template--error', classes.hint_root)}>
        <ErrorHint message={message} />
      </div>
    );

  // Only bot messages have the message.template property
  if (message.type !== 'bot') return null;

  const template = message.message.template;

  if (template.type !== MessageTemplateType.HINT) return null;

  return (
    <div
      className={clsx('asgard-hint-template asgard-hint-template--hint', classes.hint_root)}
      style={themeTemplate?.HintMessageTemplate?.style}
    >
      <div className={classes.hint_text} style={themeTemplate?.HintMessageTemplate?.style}>
        {template.text}
      </div>
    </div>
  );
}
