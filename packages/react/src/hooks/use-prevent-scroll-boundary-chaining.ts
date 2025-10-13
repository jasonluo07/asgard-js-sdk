import { RefObject, useEffect, useCallback } from 'react';

/**
 * 找到最近的可滾動父元素
 */
function findScrollableParent(
  element: HTMLElement,
  container: HTMLElement
): HTMLElement | null {
  let current = element;

  while (current && current !== container) {
    if (current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement as HTMLElement;
  }

  return null;
}

/**
 * 檢查滾動元素是否在邊界且嘗試繼續滾動
 */
function shouldPreventScroll(
  scrollable: HTMLElement,
  isScrollingUp: boolean
): boolean {
  const { scrollTop, scrollHeight, clientHeight } = scrollable;
  const atTop = scrollTop === 0;
  const atBottom = scrollHeight - clientHeight - scrollTop < 1;

  return (atTop && isScrollingUp) || (atBottom && !isScrollingUp);
}

/**
 * 防止容器內的滾動穿透到外層
 */
export function usePreventScrollBoundaryChaining(
  containerRef: RefObject<HTMLElement>
): void {
  const handleScroll = useCallback(
    (e: WheelEvent | TouchEvent): void => {
      const container = containerRef.current;
      if (!container) return;

      const scrollable = findScrollableParent(
        e.target as HTMLElement,
        container
      );

      // 沒有可滾動區域（如 header/footer），直接阻止穿透
      if (!scrollable) {
        e.preventDefault();
        e.stopPropagation();

        return;
      }

      // 判斷滾動方向
      const isScrollingUp =
        e instanceof WheelEvent
          ? e.deltaY < 0
          : false; // touch 事件在邊界時直接阻止

      // 在邊界時阻止穿透
      if (
        e instanceof WheelEvent
          ? shouldPreventScroll(scrollable, isScrollingUp)
          : shouldPreventScroll(scrollable, true) ||
            shouldPreventScroll(scrollable, false)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [containerRef]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleScroll, { passive: false });
    container.addEventListener('touchmove', handleScroll, { passive: false });

    return (): void => {
      container.removeEventListener('wheel', handleScroll);
      container.removeEventListener('touchmove', handleScroll);
    };
  }, [containerRef, handleScroll]);
}
