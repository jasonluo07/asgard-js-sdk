import { ReactNode } from 'react';
import clsx from 'clsx';
import { LoaderIcon, MessageSquareIcon } from './icons';
import styles from './chat-header.module.scss';

// F-022 — the unified chat heading bar. One row at the top of the chat thread carrying three kinds of
// info: bot identity, channel title, and a first-class right-side `actions[]` API. It replaces the two
// former bars — the legacy bot-name header and the F-016/F-017 channel-title row (BUG-002: they used to
// stack). Design authority: pinned prototype `ChatHeader` (@ 7ad38e0), re-expressed in this repo's
// SCSS-module + theme-token conventions.
//
// Information hierarchy (UC-040):
//   botName present → main line = botName, channel title = muted subtitle beneath it;
//   botName blank   → main line = channel title itself (single line);
//   channel title unnamed → `untitledLabel` placeholder (never a stale value).
// The channel title stays F-016 first-class (seed + `title.update`); this component is pure presentation
// and replays a 200ms fade on value change (honoring reduced-motion via CSS).
//
// Customization ladder (UC-043), coarse → fine:
//   L1 props: botName / title / avatar / actions[].
//   L2 renderTitle: takes over the title text area only; avatar + actions stay default.
//   L3 renderHeader: takes over the whole bar (incl. actions); return null → hide the bar.
//   hidden: whole-bar hide shortcut. channelTitleHidden: hide the channel-title text only.

/** A single right-side action button. File Explorer toggle, reset, close, custom cells all go here. */
export interface ChatHeaderAction {
  /** Stable identity (React key, test hook, downstream override target). */
  id: string;
  /** Glyph (a React node). Replaced by a spinner while `busy`. */
  icon: ReactNode;
  /** Accessible label + hover tooltip (required — icon-only buttons must not omit it). */
  label: string;
  onClick?: () => void;
  /** Toggle "pressed" state (e.g. File Explorer open) → highlight + `aria-pressed`. */
  active?: boolean;
  /** Busy (e.g. reset in progress) → spinner + disabled. */
  busy?: boolean;
  disabled?: boolean;
  /**
   * Fully custom cell (non-standard content: a usage badge, a version dropdown…). When provided the
   * standard button rendering is skipped, but the cell still keeps its slot in the actions sequence.
   */
  render?: () => ReactNode;
}

/** Args for the L2 title-area renderer. */
export interface ChatHeaderTitleRendererArgs {
  botName: string | null;
  title: string | null;
  renderDefault: () => ReactNode;
}

/** Args for the L3 whole-bar renderer. */
export interface ChatHeaderRendererArgs {
  botName: string | null;
  title: string | null;
  actions: ChatHeaderAction[];
  renderDefault: () => ReactNode;
}

export interface ChatHeaderProps {
  /** Bot name: present → main text, `title` demoted to the subtitle; blank → `title` becomes the main text. */
  botName?: string | null;
  /** Current channel title; `null` / blank = unnamed (shows `untitledLabel`). */
  title: string | null;
  /** Placeholder shown when the channel title is unnamed. Defaults to `新對話`. */
  untitledLabel?: string;
  /** Leading avatar: `string` → `<img src>`; node → used as-is. Falls back to a bot initial, then a chat icon. */
  avatar?: string | ReactNode;
  /** Right-side action buttons (in order). */
  actions?: ChatHeaderAction[];
  /** Hide the whole bar (= `renderHeader` returning null). */
  hidden?: boolean;
  /** Hide the channel-title text only (keeps the bar, bot name, and actions). */
  channelTitleHidden?: boolean;
  /** L2 escape hatch: take over the title text area only. Return null → empty title area. */
  renderTitle?: (args: ChatHeaderTitleRendererArgs) => ReactNode;
  /** L3 escape hatch: take over the whole bar (incl. actions). Return null → hide the bar. */
  renderHeader?: (args: ChatHeaderRendererArgs) => ReactNode;
}

const DEFAULT_UNTITLED_LABEL = '新對話';

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

function Avatar({ avatar, botName }: { avatar?: string | ReactNode; botName: string | null }): ReactNode {
  if (typeof avatar === 'string') {
    return <img src={avatar} alt="" className={styles.avatar_img} />;
  }

  if (avatar) {
    return <span className={styles.avatar_slot}>{avatar}</span>;
  }

  if (!isBlank(botName)) {
    return (
      <span className={styles.avatar_initial} aria-hidden>
        {(botName as string).trim()[0]?.toUpperCase()}
      </span>
    );
  }

  return <MessageSquareIcon className={styles.avatar_icon} size={16} />;
}

function ActionButton({ action }: { action: ChatHeaderAction }): ReactNode {
  if (action.render) {
    return <div className={styles.action_slot}>{action.render()}</div>;
  }

  const { icon, label, onClick, active, busy, disabled } = action;
  const inert = disabled || busy;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inert}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={clsx(styles.action, active && styles['action--active'], inert && styles['action--disabled'])}
    >
      {busy ? <LoaderIcon className={styles.spinner} size={18} /> : icon}
    </button>
  );
}

export function ChatHeader(props: ChatHeaderProps): ReactNode {
  const {
    botName = null,
    title,
    untitledLabel = DEFAULT_UNTITLED_LABEL,
    avatar,
    actions = [],
    hidden,
    channelTitleHidden,
    renderTitle,
    renderHeader,
  } = props;

  if (hidden) return null;

  const bot = isBlank(botName) ? null : (botName as string).trim();
  const untitled = isBlank(title);
  const titleLabel = untitled ? untitledLabel : (title as string).trim();
  // The channel title is the bar's subtitle (with a bot name) or its main line (without). `channelTitleHidden`
  // suppresses that text: drop the subtitle, or leave the main line empty when there is no bot name.
  const showChannelTitle = !channelTitleHidden;

  // Title text area — two lines with a bot name, otherwise a single line. `key` bound to the value so the
  // fade-in replays on a `title.update`.
  const renderTitleDefault = (): ReactNode => {
    if (bot) {
      return (
        <div className={styles.title_area}>
          <div className={styles.bot_name} title={bot}>
            {bot}
          </div>
          {showChannelTitle && (
            <div
              key={untitled ? '__untitled__' : titleLabel}
              className={clsx(styles.subtitle, untitled ? styles['subtitle--untitled'] : styles['subtitle--named'])}
              title={untitled ? undefined : titleLabel}
            >
              {titleLabel}
            </div>
          )}
        </div>
      );
    }

    if (!showChannelTitle) {
      return <div className={styles.title_area} />;
    }

    return (
      <h2
        key={untitled ? '__untitled__' : titleLabel}
        className={clsx(
          styles.single_title,
          untitled ? styles['single_title--untitled'] : styles['single_title--named'],
        )}
        title={untitled ? undefined : titleLabel}
      >
        {titleLabel}
      </h2>
    );
  };

  const titleNode = renderTitle
    ? renderTitle({ botName: bot, title, renderDefault: renderTitleDefault })
    : renderTitleDefault();

  const renderHeaderDefault = (): ReactNode => (
    <div className={clsx('asgard-chat-header', styles.chat_header)}>
      <Avatar avatar={avatar} botName={bot} />
      {titleNode}
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map(action => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );

  const content = renderHeader
    ? renderHeader({ botName: bot, title, actions, renderDefault: renderHeaderDefault })
    : renderHeaderDefault();

  return content == null ? null : content;
}

export default ChatHeader;
