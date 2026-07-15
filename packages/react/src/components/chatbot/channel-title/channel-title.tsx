import { ReactNode } from 'react';
import clsx from 'clsx';
import { useAsgardContext } from '../../../context/asgard-service-context';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import styles from './channel-title.module.scss';

// F-017 — the channel-title row at the top of the chat thread. Pure presentation of F-016's
// `channelTitle` (from the service context); the seed / live-update source is the core `channelTitle$`
// store. Design authority: pinned prototype `ChannelTitle` (@ 5480a67) —
//   surface bg + border-b seam · muted MessageSquare icon · single-line truncate · unnamed → muted
//   placeholder (never a stale value) · 200ms ease-out fade-in on title change (honor reduced-motion) ·
//   purely neutral, no accent.
// Custom / hide via the template-context escape hatch: `renderTitle({ title, renderDefault })` replaces
// the row (return null to hide); `channelTitleHidden` is the hide shortcut.

const DEFAULT_UNTITLED_LABEL = '新對話';

// MessageSquare — inlined byte-identical to lucide-react 0.487.0.
function MessageSquareIcon(): ReactNode {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function ChannelTitle(): ReactNode {
  const { channelTitle } = useAsgardContext();
  const { renderTitle, untitledLabel, channelTitleHidden } = useAsgardTemplateContext();

  if (channelTitleHidden) return null;

  const isUntitled = channelTitle == null || channelTitle.trim() === '';
  const label = isUntitled ? untitledLabel ?? DEFAULT_UNTITLED_LABEL : channelTitle;

  const renderDefault = (): ReactNode => (
    <div className={clsx('asgard-channel-title', styles.channel_title)}>
      <MessageSquareIcon />
      <h2
        // Swap the key on title change so the fade-in replays (the "received a title.update" cue).
        key={isUntitled ? '__untitled__' : (channelTitle as string)}
        className={clsx(styles.title, isUntitled ? styles['title--untitled'] : styles['title--named'])}
        title={isUntitled ? undefined : (channelTitle as string)}
      >
        {label}
      </h2>
    </div>
  );

  const content = renderTitle ? renderTitle({ title: channelTitle, renderDefault }) : renderDefault();

  return content == null ? null : content;
}

export default ChannelTitle;
