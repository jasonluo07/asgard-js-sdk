import { useCallback, useEffect, useState, useLayoutEffect } from 'react';

const useBrowserLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : null;

type Width = number;
type Height = number;
type Size = [Width, Height];

function getViewportSize(): Size {
  return window.visualViewport
    ? [window.visualViewport.width, window.visualViewport.height]
    : [window.innerWidth, window.innerHeight];
}

export function useViewportSize(): Size | undefined {
  const [viewportSize, setViewportSize] = useState<Size | undefined>();

  const updateViewportSize = useCallback(() => {
    const viewportSize = getViewportSize();

    setViewportSize((oldViewportSize) =>
      oldViewportSize &&
      oldViewportSize[0] === viewportSize[0] &&
      oldViewportSize[1] === viewportSize[1]
        ? oldViewportSize
        : viewportSize
    );
  }, []);

  useBrowserLayoutEffect?.(updateViewportSize, [updateViewportSize]);

  useEffect(() => {
    function effectTwice(): void {
      updateViewportSize();
      setTimeout(updateViewportSize, 1000);
    }

    window.addEventListener('resize', effectTwice);
    window.addEventListener('orientationchange', effectTwice);
    window.visualViewport?.addEventListener('resize', effectTwice);

    return (): void => {
      window.removeEventListener('resize', effectTwice);
      window.removeEventListener('orientationchange', effectTwice);
      window.visualViewport?.removeEventListener('resize', effectTwice);
    };
  }, [updateViewportSize]);

  return viewportSize;
}
