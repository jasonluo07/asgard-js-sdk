import { RefObject, useEffect, useCallback } from 'react';

export function usePreventScrollChaining(
  containerRef: RefObject<HTMLElement>,
  scrollableSelector: string
): void {
  const preventScrollChaining = useCallback(
    (e: Event): void => {
      const target = e.target as HTMLElement;
      const scrollableElement = target.closest(scrollableSelector);

      if (!scrollableElement) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [scrollableSelector]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', preventScrollChaining, {
      passive: false,
    });
    container.addEventListener('touchmove', preventScrollChaining, {
      passive: false,
    });

    return (): void => {
      container.removeEventListener('wheel', preventScrollChaining);
      container.removeEventListener('touchmove', preventScrollChaining);
    };
  }, [containerRef, preventScrollChaining]);
}
