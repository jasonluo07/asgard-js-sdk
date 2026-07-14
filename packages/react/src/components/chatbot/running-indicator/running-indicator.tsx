import { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './running-indicator.module.scss';

// F-003 — the run-in-progress indicator lives at the thread↔input seam, bound to the whole POST /sse
// connection (`isConnecting`), not the per-message lifecycle. The seam is always present (it is the
// body↔footer separator); during a run it comes alive as a `--primary` indeterminate progress line.
// Honors `prefers-reduced-motion` (a static state instead of the sweeping animation).
interface RunningIndicatorProps {
  running: boolean;
}

export function RunningIndicator({ running }: RunningIndicatorProps): ReactNode {
  return (
    <div
      className={styles.running_indicator}
      role={running ? 'status' : undefined}
      aria-label={running ? 'Generating response' : undefined}
    >
      {/* Always-present seam: the body↔footer separator. */}
      <div className={styles.running_indicator__seam} />
      {/* Running: a primary segment sweeps across — an on-system indeterminate progress line. */}
      {running && <div className={clsx(styles.running_indicator__segment)} />}
    </div>
  );
}

export default RunningIndicator;
