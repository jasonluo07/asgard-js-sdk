import { RefObject, useEffect } from 'react';

function findNearestScrollContainer(
  elem: HTMLElement
): HTMLElement | undefined {
  if (elem.scrollHeight > elem.offsetHeight) {
    return elem;
  }

  const parent = elem.parentElement;
  if (!parent) {
    return undefined;
  }

  return findNearestScrollContainer(parent);
}

export function usePreventOverScrolling(ref: RefObject<HTMLDivElement>): void {
  useEffect(() => {
    const elem = ref.current;

    if (!elem) return;

    let startTouch: Touch | undefined = undefined;

    function handleTouchStart(e: TouchEvent): void {
      if (e.touches.length !== 1) return;

      startTouch = e.touches[0];
    }

    function handleTouchMove(e: TouchEvent): void {
      if (e.touches.length !== 1 || !startTouch) return;

      const deltaY = startTouch.pageY - e.targetTouches[0].pageY;
      const deltaX = startTouch.pageX - e.targetTouches[0].pageX;

      if (Math.abs(deltaX) > Math.abs(deltaY)) return;

      const target = e.target as HTMLElement;
      const nearestScrollContainer = findNearestScrollContainer(target);

      if (!nearestScrollContainer) {
        e.preventDefault();

        return;
      }

      const isScrollingUp = deltaY < 0;
      const isAtTop = nearestScrollContainer.scrollTop === 0;
      if (isScrollingUp && isAtTop) {
        e.preventDefault();

        return;
      }

      const isAtBottom =
        nearestScrollContainer.scrollTop ===
        nearestScrollContainer.scrollHeight -
          nearestScrollContainer.clientHeight;

      if (!isScrollingUp && isAtBottom) {
        e.preventDefault();

        return;
      }
    }

    elem.addEventListener('touchstart', handleTouchStart);
    elem.addEventListener('touchmove', handleTouchMove);

    return (): void => {
      elem.removeEventListener('touchstart', handleTouchStart);
      elem.removeEventListener('touchmove', handleTouchMove);
    };
  }, [ref]);
}
