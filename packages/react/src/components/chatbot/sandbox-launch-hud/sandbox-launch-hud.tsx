import { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import { useAsgardContext } from '../../../context/asgard-service-context';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { useSandboxLaunch } from '../../../hooks';
import { t } from '../../../i18n';
import styles from './sandbox-launch-hud.module.scss';

// F-018 — the sandbox cold-start HUD. Fully independent of the RunningIndicator (which binds the whole
// run's connection): this one only surfaces "the sandbox is stuck cold-starting" and can appear at the
// same time. Design authority: pinned prototype `SandboxLaunchOverlay` (@ aa0899d), ported to this
// repo's SCSS-module + `--asg-color-*` token + i18n conventions.
//
// Deliberate break from the design-system loading idiom (the flat 1s line): a cold start is an
// uncommon, longer wait (provisioning a machine) that earns a weightier "system booting" moment. The
// guardrails on the break: single accent only (`--asg-color-primary`), only during a cold start (the 1s
// threshold in `useSandboxLaunch` already mutes warm starts), semi-transparent + `pointer-events:none`
// (passive HUD, never steals the flow), `position:absolute` scoped inside the chat view — never `fixed`,
// never intrudes on the host page — and honors `prefers-reduced-motion`.
//
// Grid variant only (product-decided: 4×4 chip-scan, closest to the design system). Self-contained:
// reads `sandboxPhase` (service context) + `locale` (template context); mounted once by the Chatbot.

const GRID_CELLS = Array.from({ length: 16 }, (_, i) => (i % 4) + Math.floor(i / 4)); // diagonal distance 0..6

export function SandboxLaunchHud(): ReactNode {
  const { sandboxPhase } = useAsgardContext();
  const { locale = 'en-US' } = useAsgardTemplateContext();
  const { stage, visible } = useSandboxLaunch(sandboxPhase);

  if (!visible) return null;

  const ready = stage === 'ready' || stage === 'leaving'; // leaving still shows "ready" content, just fading out
  const leaving = stage === 'leaving';
  const label = ready ? t(locale, 'sandbox.ready') : t(locale, 'sandbox.launching');

  return (
    <div className={clsx('asgard-sandbox-hud', styles.sandbox_hud)} role="status" aria-live="polite" aria-label={label}>
      <div className={clsx(styles.sandbox_hud__card, ready && styles.is_ready, leaving && styles.is_leaving)}>
        <div className={clsx(styles.sandbox_hud__canvas, ready && styles.is_ready)} aria-hidden>
          <div className={styles.sandbox_hud__grid}>
            {GRID_CELLS.map((d, i) => (
              <span key={i} className={styles.sandbox_hud__cell} style={{ '--sandbox-hud-d': d } as CSSProperties} />
            ))}
          </div>
          {/* Ready beat: a single ring expanding outward locks in "done". */}
          {ready && <span className={styles.sandbox_hud__ready_ring} />}
        </div>
        <span className={styles.sandbox_hud__label}>{label}</span>
      </div>
    </div>
  );
}

export default SandboxLaunchHud;
