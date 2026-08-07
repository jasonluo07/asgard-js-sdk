import { ReactNode } from 'react';
import { useSyncedSpin } from '../../hooks/use-synced-spin';

// BUG-007 — the SDK's one loading spinner. Five components each carried their own copy of this
// glyph plus a private `@keyframes` spin, and each copy started counting from its own mount, so
// spinners appearing at different times drifted out of phase and their arc gaps pointed every
// which way. `useSyncedSpin` pins them all to the document timeline origin instead.
//
// The glyph is lucide `loader-circle` 0.487.0, inlined (SDK convention: no lucide-react dep, same
// as chat-header / subagent-list / file-explorer). Size and color stay with the caller's class so
// each call site keeps its own tokens.

const glyphSvgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export interface SpinnerProps {
  className?: string;
  size?: number;
  /** Announced to assistive tech; without it the glyph is decorative and hidden. */
  label?: string;
}

export function Spinner({ className, size, label }: SpinnerProps): ReactNode {
  const ref = useSyncedSpin<SVGSVGElement>();

  return (
    <svg
      ref={ref}
      className={className}
      width={size}
      height={size}
      {...glyphSvgProps}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
