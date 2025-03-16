import { useEffect, useState } from 'react';

function isKeyboardInput(elem: HTMLElement): boolean {
  return (
    (['INPUT', 'TEXTAREA'].includes(elem.tagName) &&
      !['button', 'submit', 'checkbox', 'file', 'image'].includes(
        (elem as HTMLInputElement).type
      )) ||
    elem.hasAttribute('contenteditable')
  );
}

export function useIsOnScreenKeyboardOpen(): boolean {
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    function handleFocusIn(e: FocusEvent): void {
      if (!e.target) return;

      const target = e.target as HTMLElement;

      if (isKeyboardInput(target)) setOpen(true);
    }

    function handleFocusOut(e: FocusEvent): void {
      if (!e.target) return;

      const target = e.target as HTMLElement;

      if (isKeyboardInput(target)) setOpen(false);
    }

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return (): void => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return isOpen;
}
