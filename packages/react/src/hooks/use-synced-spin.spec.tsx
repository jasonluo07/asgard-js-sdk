// @vitest-environment jsdom
import { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncedSpin } from './use-synced-spin';

/**
 * BUG-007 — a CSS `animation` counts from the moment its own element mounts, so spinners that
 * appear at different times point their arc gaps in different directions and a screen of them
 * reads as wriggling. The fix hangs on one invariant: every spinner's animation is pinned to the
 * document timeline origin (`startTime = 0`), which makes phase a pure function of the clock
 * rather than of mount order.
 *
 * jsdom implements no Web Animations API, so the animation is stubbed here; the visual proof that
 * the arcs actually line up is the browser smoke check (BUILD-050 R7).
 */

interface StubAnimation {
  startTime: number | null;
  cancel: ReturnType<typeof vi.fn>;
}

let animations: StubAnimation[];
let animateCalls: KeyframeAnimationOptions[];

function installWebAnimations(): void {
  animations = [];
  animateCalls = [];

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: (_keyframes: Keyframe[], options: KeyframeAnimationOptions): StubAnimation => {
      const animation: StubAnimation = { startTime: null, cancel: vi.fn() };

      animateCalls.push(options);
      animations.push(animation);

      return animation;
    },
  });
}

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({ matches, media })),
  );
}

function Spun(): ReactNode {
  const ref = useSyncedSpin<SVGSVGElement>();

  return <svg ref={ref} data-testid="spun" />;
}

beforeEach(() => {
  installWebAnimations();
  stubReducedMotion(false);
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'animate');
  vi.unstubAllGlobals();
});

describe('useSyncedSpin', () => {
  it('pins spinners mounted at different times to the same time origin (R1)', () => {
    const first = render(<Spun />);

    // A second spinner appearing later is exactly the case that used to drift out of phase.
    render(<Spun />);

    expect(animations).toHaveLength(2);
    expect(animations.map(animation => animation.startTime)).toEqual([0, 0]);

    first.unmount();
  });

  it('runs one full turn per second, forever (R2)', () => {
    render(<Spun />);

    expect(animateCalls).toEqual([{ duration: 1000, iterations: Infinity }]);
  });

  it('does not animate under prefers-reduced-motion: reduce (R3)', () => {
    stubReducedMotion(true);

    render(<Spun />);

    expect(animations).toHaveLength(0);
  });

  it('renders without throwing when the runtime has no Web Animations API (R4)', () => {
    Reflect.deleteProperty(Element.prototype, 'animate');

    expect(() => render(<Spun />)).not.toThrow();
  });

  it('cancels the animation on unmount (R5)', () => {
    const { unmount } = render(<Spun />);

    expect(animations[0].cancel).not.toHaveBeenCalled();

    unmount();

    expect(animations[0].cancel).toHaveBeenCalledTimes(1);
  });
});
