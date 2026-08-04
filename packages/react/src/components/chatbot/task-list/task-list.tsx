import { ReactNode, useState } from 'react';
import clsx from 'clsx';
import { Task, TaskStatus } from '@asgard-js/core';
import { Locale, t } from '../../../i18n';
import styles from './task-list.module.scss';

// F-010 — Task Check List: a docked tray at the thread↔input seam, above the RunningIndicator. Shows
// the current list folded by `reduceTaskEvents` (run-level chrome, not a message block). Empty → hidden.
//
// Tri-state (checklist idiom — completed needs a "done" signal, unlike tool-calls):
//   in_progress = amber spinner + bright label (the only accent — "what's happening now")
//   completed   = muted check (settles, yields attention)
//   pending     = hollow dim circle
// label: in_progress shows `activeForm`; otherwise `subject`. Icons inlined byte-identical to
// lucide-react 0.487.0 (LoaderCircle / CircleCheck / Circle / ListTodo / ChevronDown / ChevronRight).

const glyphSvgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function LoaderCircleIcon({ className, label }: { className?: string; label: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps} role="img" aria-label={label}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CircleCheckIcon({ className, label }: { className?: string; label: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps} role="img" aria-label={label}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CircleIcon({ className, label }: { className?: string; label: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps} role="img" aria-label={label}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function ListTodoIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg className={className} {...glyphSvgProps}>
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="m3 17 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
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

function StatusGlyph({ status, label }: { status: TaskStatus; label: string }): ReactNode {
  if (status === 'in_progress') {
    return (
      <LoaderCircleIcon
        className={clsx(styles.glyph, styles.glyph__spin, styles['glyph--in_progress'])}
        label={label}
      />
    );
  }

  if (status === 'completed') {
    return <CircleCheckIcon className={clsx(styles.glyph, styles['glyph--completed'])} label={label} />;
  }

  // pending or any unknown status → neutral hollow circle (never crash; enum pending EXT-002).
  return <CircleIcon className={clsx(styles.glyph, styles['glyph--pending'])} label={label} />;
}

function TaskRow({ task, locale }: { task: Task; locale: Locale }): ReactNode {
  const [open, setOpen] = useState(false);
  const active = task.status === 'in_progress';
  const done = task.status === 'completed';
  const label = active ? task.activeForm || task.subject : task.subject;
  const hasDesc = !!task.description;

  return (
    <li className={styles.row}>
      <button
        type="button"
        className={styles.row__button}
        onClick={(): void => {
          if (hasDesc) setOpen(o => !o);
        }}
        aria-expanded={hasDesc ? open : undefined}
      >
        <StatusGlyph status={task.status} label={t(locale, `task.${task.status}`)} />
        <span
          className={clsx(
            styles.row__label,
            active && styles['row__label--active'],
            done && styles['row__label--done'],
            !active && !done && styles['row__label--pending'],
          )}
        >
          {label}
        </span>
        {hasDesc &&
          (open ? (
            <ChevronDownIcon className={styles.row__chevron} />
          ) : (
            <ChevronRightIcon className={styles.row__chevron} />
          ))}
      </button>
      {open && hasDesc && <p className={styles.row__description}>{task.description}</p>}
    </li>
  );
}

export function TaskList({ tasks, locale = 'en-US' }: { tasks: Task[]; locale?: Locale }): ReactNode {
  const [open, setOpen] = useState(true);

  if (tasks.length === 0) return null; // empty → not rendered (yields space)

  const doneCount = tasks.filter(x => x.status === 'completed').length;
  const allDone = doneCount === tasks.length;

  return (
    <section className={clsx('asgard-task-list', styles.task_list)} aria-label={t(locale, 'task.title')}>
      <button type="button" className={styles.header} onClick={(): void => setOpen(o => !o)} aria-expanded={open}>
        <ListTodoIcon className={clsx(styles.header__icon, allDone && styles['header__icon--done'])} />
        <span className={styles.header__title}>{t(locale, 'task.title')}</span>
        <span className={styles.header__count}>
          <span>
            {doneCount}/{tasks.length}
          </span>
          {open ? (
            <ChevronDownIcon className={styles.header__chevron} />
          ) : (
            <ChevronRightIcon className={styles.header__chevron} />
          )}
        </span>
      </button>
      {open && (
        // `data-scrollable` — same as the SubagentList: this list is the scroll box once the docked
        // strip squeezes the card, and the container's wheel handler only yields to marked elements.
        <ul className={styles.list} data-scrollable="true">
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default TaskList;
