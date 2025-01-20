import { ReactNode, useEffect, useRef } from 'react';

interface ResizeObserverBoxProps {
  children: ReactNode;
  onResize: (width: number, height: number) => void;
}

export function ResizeObserverBox(props: ResizeObserverBoxProps): ReactNode {
  const { children, onResize } = props;
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        onResize(width, height);
      }
    });

    if (divRef.current) {
      resizeObserver.observe(divRef.current);
    }

    return (): void => {
      resizeObserver.disconnect();
    };
  }, [divRef, onResize]);

  return <div ref={divRef}>{children}</div>;
}
