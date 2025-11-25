'use client';

import { ReactNode, useEffect, useState } from 'react';

interface StreamdownClientProps {
  children: string;
}

export function StreamdownClient({ children }: StreamdownClientProps): ReactNode {
  const [StreamdownComponent, setStreamdownComponent] = useState<React.ComponentType<{ children: string }> | null>(
    null,
  );
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const loadStreamdown = async (): Promise<void> => {
      try {
        const { Streamdown } = await import('streamdown');
        setStreamdownComponent(() => Streamdown);
      } catch {
        setError(true);
      }
    };

    loadStreamdown();
  }, []);

  if (error || !StreamdownComponent) {
    return children;
  }

  return <StreamdownComponent>{children}</StreamdownComponent>;
}
