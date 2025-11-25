import { ReactNode, lazy, Suspense } from 'react';

const StreamdownLazy = lazy(() => import('streamdown').then(mod => ({ default: mod.Streamdown })));

interface StreamdownWrapperProps {
  children: string;
}

export function StreamdownWrapper({ children }: StreamdownWrapperProps): ReactNode {
  return (
    <Suspense fallback={children}>
      <StreamdownLazy>{children}</StreamdownLazy>
    </Suspense>
  );
}
