import { ReactNode, useState } from 'react';
import clsx from 'clsx';
import { Subagent, SubagentStatus, SubagentToolCall } from '@asgard-js/core';
import { Locale, t } from '../../../i18n';
import { synthesizeToolCallLabel } from '../../templates';
import { Spinner } from '../../spinner';
import styles from './subagent-list.module.scss';

// F-012 — Subagent list: a docked tray stacked above the Task List (order: thread → Subagents →
// Tasks → seam → input). Shows which subagents are working and each one's child tools.
//
// Visibility: never-any → not rendered; all-terminal → auto-collapsed (header stays); any-running →
// expanded. Status glyph: running amber spinner / completed muted check / failed red alert /
// cancelled muted slash. Icons inlined byte-identical to lucide-react 0.487.0.

const glyphSvgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function CircleCheckIcon({ className, label }: { className?: string; label?: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps} role={label ? 'img' : undefined} aria-label={label}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CircleAlertIcon({ className, label }: { className?: string; label?: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps} role={label ? 'img' : undefined} aria-label={label}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function CircleSlashIcon({ className, label }: { className?: string; label?: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps} role={label ? 'img' : undefined} aria-label={label}>
      <circle cx="12" cy="12" r="10" />
      <line x1="9" x2="15" y1="15" y2="9" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps}>
      <path d="M12 8V4H8" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SubagentGlyph({ status, label }: { status: SubagentStatus; label: string }): ReactNode {
  if (status === 'running') {
    return <Spinner className={clsx(styles.glyph, styles['glyph--running'])} label={label} />;
  }

  if (status === 'failed') {
    return <CircleAlertIcon className={clsx(styles.glyph, styles['glyph--failed'])} label={label} />;
  }

  if (status === 'cancelled') {
    return <CircleSlashIcon className={clsx(styles.glyph, styles['glyph--cancelled'])} label={label} />;
  }

  return <CircleCheckIcon className={clsx(styles.glyph, styles['glyph--completed'])} label={label} />;
}

function ToolGlyph({ status }: { status: SubagentToolCall['status'] }): ReactNode {
  if (status === 'running') {
    return <Spinner className={clsx(styles.tool_glyph, styles['glyph--running'])} />;
  }

  if (status === 'error') {
    return <CircleAlertIcon className={clsx(styles.tool_glyph, styles['glyph--failed'])} />;
  }

  return <CircleCheckIcon className={clsx(styles.tool_glyph, styles['glyph--completed'])} />;
}

function currentRunningTool(tools: SubagentToolCall[]): SubagentToolCall | undefined {
  for (let i = tools.length - 1; i >= 0; i--) {
    if (tools[i].status === 'running') return tools[i];
  }

  return tools[tools.length - 1];
}

function SubagentItem({ sa, locale }: { sa: Subagent; locale: Locale }): ReactNode {
  const [open, setOpen] = useState(false);
  const running = sa.status === 'running';
  const hasTools = sa.tools.length > 0;
  const cur = running && hasTools ? currentRunningTool(sa.tools) : undefined;

  return (
    <li className={styles.row}>
      <button
        type="button"
        className={styles.row__button}
        onClick={(): void => {
          if (hasTools) setOpen(o => !o);
        }}
        aria-expanded={hasTools ? open : undefined}
      >
        <SubagentGlyph status={sa.status} label={t(locale, `subagent.${sa.status}`)} />
        <span className={styles.row__body}>
          <span className={clsx(styles.row__label, running && styles['row__label--running'])}>
            {sa.subagentType && <span className={styles.row__type}>{sa.subagentType} · </span>}
            <span className={running ? styles.row__desc_active : undefined}>{sa.description}</span>
          </span>
          {!open && cur && (
            <span className={styles.row__current}>
              ↳ {t(locale, 'subagent.activeTool', { tool: synthesizeToolCallLabel(cur, locale) })}
            </span>
          )}
        </span>
        <span className={styles.row__meta}>
          {!open && !running && hasTools && <span>{t(locale, 'subagent.toolCount', { n: sa.tools.length })}</span>}
          {hasTools &&
            (open ? (
              <ChevronDownIcon className={styles.row__chevron} />
            ) : (
              <ChevronRightIcon className={styles.row__chevron} />
            ))}
        </span>
      </button>
      {open && hasTools && (
        <ul className={styles.tools}>
          {sa.tools.map((tool, i) => (
            <li key={i} className={styles.tool}>
              <ToolGlyph status={tool.status} />
              <span className={styles.tool__label}>{synthesizeToolCallLabel(tool, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function SubagentList({ subagents, locale = 'en-US' }: { subagents: Subagent[]; locale?: Locale }): ReactNode {
  // `open === null` → auto: expanded while any subagent runs, collapsed once all are terminal. A user
  // click switches to explicit.
  const [open, setOpen] = useState<boolean | null>(null);

  if (subagents.length === 0) return null; // never had one → not rendered

  const anyRunning = subagents.some(s => s.status === 'running');
  const show = open ?? anyRunning;
  const doneCount = subagents.filter(s => s.status !== 'running').length;

  return (
    <section className={clsx('asgard-subagent-list', styles.subagent_list)} aria-label={t(locale, 'subagent.title')}>
      <button type="button" className={styles.header} onClick={(): void => setOpen(() => !show)} aria-expanded={show}>
        <BotIcon className={clsx(styles.header__icon, !anyRunning && styles['header__icon--idle'])} />
        <span className={styles.header__title}>{t(locale, 'subagent.title')}</span>
        <span className={styles.header__count}>
          <span>
            {doneCount}/{subagents.length}
          </span>
          {show ? (
            <ChevronDownIcon className={styles.header__chevron} />
          ) : (
            <ChevronRightIcon className={styles.header__chevron} />
          )}
        </span>
      </button>
      {show && (
        // `data-scrollable` — this list scrolls itself when the docked strip squeezes the card;
        // ChatbotContainer's wheel/touch handler preventDefaults on anything without the marker.
        <ul className={styles.list} data-scrollable="true">
          {subagents.map(sa => (
            <SubagentItem key={sa.parentToolUseId} sa={sa} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default SubagentList;
