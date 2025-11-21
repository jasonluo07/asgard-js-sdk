import { useEffect, useState, RefObject } from 'react';

export function useIsAtBottom(
  ref: RefObject<HTMLElement>,
  threshold = 50
): boolean {
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    function handleScroll(): void {
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      const atBottom = scrollTop + clientHeight >= scrollHeight - threshold;

      setIsAtBottom(atBottom);
    }

    // 初始檢查
    handleScroll();

    element.addEventListener('scroll', handleScroll);

    return (): void => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [ref, threshold]);

  return isAtBottom;
}
