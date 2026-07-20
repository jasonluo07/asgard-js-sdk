import { SandboxPhase } from '@asgard-js/core';
import { useEffect, useState } from 'react';

// F-018 — the sandbox cold-start "delay-before-spinner" latch. Core derives `SandboxPhase` from the
// last sandbox event (launch → launching, ready → ready, idle otherwise); this hook turns that phase
// into the HUD's display lifecycle. It stays fully independent of the RunningIndicator (which binds the
// whole run's connection) — this one only tracks "is the sandbox stuck cold-starting".
//
// Why the 1s threshold: a warm sandbox can go launch → ready in 100–300ms; flashing an animation then is
// just noise. The threshold mutes fast starts entirely — only a real cold-start wait gets feedback. Once
// ready arrives, the HUD doesn't vanish instantly: it plays a short "ready" beat (readyBeatMs) so the user
// sees "done", then fades out; if ready arrived before the threshold (never shown), the whole thing stays
// silent.

/** HUD display stage: `hidden` (unmounted) / `launching` (animation) / `ready` (ready beat) / `leaving` (fade out). */
export type SandboxStage = 'hidden' | 'launching' | 'ready' | 'leaving';

export interface UseSandboxLaunchOptions {
  /** How long the phase must stay `launching` before the HUD shows (mutes warm starts). Default 1000ms. */
  thresholdMs?: number;
  /** How long the "ready" beat lingers before the exit begins. Default 900ms. */
  readyBeatMs?: number;
  /** Fade-out duration; must match the component's leaving CSS. Default 600ms. */
  exitMs?: number;
}

export interface SandboxLaunchState {
  stage: SandboxStage;
  /** Convenience flag for `stage !== 'hidden'`. */
  visible: boolean;
}

/**
 * Map the core-derived `SandboxPhase` onto the HUD's display lifecycle. Every timer is cleaned up on
 * unmount / phase change (§1.5). Returns the current display `stage` and a `visible` convenience flag.
 */
export function useSandboxLaunch(
  phase: SandboxPhase,
  { thresholdMs = 1000, readyBeatMs = 900, exitMs = 600 }: UseSandboxLaunchOptions = {},
): SandboxLaunchState {
  const [stage, setStage] = useState<SandboxStage>('hidden');

  useEffect(() => {
    if (phase === 'launching') {
      // A fresh cold start: arm the threshold timer — only crossing it raises the animation.
      const threshold = window.setTimeout(() => setStage('launching'), thresholdMs);

      return (): void => window.clearTimeout(threshold);
    }

    if (phase === 'ready') {
      // ready arrived. If it beat the threshold (never shown), stay silent; otherwise play the ready beat.
      setStage(cur => (cur === 'launching' ? 'ready' : 'hidden'));

      return undefined;
    }

    // idle: the run started / ended / errored → collapse cleanly.
    setStage('hidden');

    return undefined;
  }, [phase, thresholdMs]);

  // Ready beat: linger for readyBeatMs, then hand off to the leaving fade (so the component animates out
  // instead of hard-unmounting).
  useEffect(() => {
    if (stage !== 'ready') return undefined;

    const done = window.setTimeout(() => setStage('leaving'), readyBeatMs);

    return (): void => window.clearTimeout(done);
  }, [stage, readyBeatMs]);

  // Leaving: unmount only after the fade-out has run.
  useEffect(() => {
    if (stage !== 'leaving') return undefined;

    const gone = window.setTimeout(() => setStage('hidden'), exitMs);

    return (): void => window.clearTimeout(gone);
  }, [stage, exitMs]);

  return { stage, visible: stage !== 'hidden' };
}

export default useSandboxLaunch;
