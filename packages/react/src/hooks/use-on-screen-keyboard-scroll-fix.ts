import { useEffect } from 'react';

export function useOnScreenKeyboardScrollFix(isOnScreenKeyboardOpen: boolean): void {
  useEffect(() => {
    if (!isOnScreenKeyboardOpen) return;

    function handleScroll(): void {
      window.scrollTo(0, 0);
    }

    window.addEventListener('scroll', handleScroll);

    return (): void => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOnScreenKeyboardOpen]);
}
