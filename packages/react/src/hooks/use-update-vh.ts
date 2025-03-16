import { RefObject, useCallback, useEffect, useLayoutEffect } from 'react';

const useBrowserLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : null;

export function useUpdateVh(ref: RefObject<HTMLDivElement>): void {
  const updateVh = useCallback(() => {
    const vh = window.innerHeight * 0.01;
    if (ref.current) {
      ref.current.style.setProperty('--vh', `${vh}px`);
    }
  }, [ref]);

  useBrowserLayoutEffect?.(updateVh, [updateVh]);

  useEffect(() => {
    function effectTwice(): void {
      updateVh();
      setTimeout(updateVh, 1000);
    }

    updateVh();

    window.addEventListener('resize', effectTwice);

    return (): void => {
      window.removeEventListener('resize', effectTwice);
    };
  }, [updateVh]);
}
