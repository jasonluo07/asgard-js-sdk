import { RefObject, useLayoutEffect, useRef } from 'react';

/** One full turn per second — the single rotation period for every spinner in the SDK. */
const SPIN_DURATION_MS = 1000;

/**
 * Spins the element the returned ref is attached to, in phase with every other spinner on screen.
 *
 * A CSS `animation` counts from the moment its own element mounts, so spinners that appear at
 * different times end up at different phases and their arc gaps point every which way — a screen
 * of them reads as something wriggling (BUG-007). The Web Animations API lets the animation be
 * pinned to the document timeline origin instead, which makes phase a function of
 * `now % SPIN_DURATION_MS` alone, identical for every spinner regardless of mount order.
 *
 * Nothing rotates under `prefers-reduced-motion: reduce`; on runtimes without the Web Animations
 * API (jsdom) the element renders static rather than throwing.
 */
export function useSyncedSpin<T extends Element>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element || typeof element.animate !== 'function') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animation = element.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: SPIN_DURATION_MS,
      iterations: Infinity,
    });

    animation.startTime = 0;

    return (): void => animation.cancel();
  }, []);

  return ref;
}
