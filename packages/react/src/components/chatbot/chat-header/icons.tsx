import { ReactNode } from 'react';

// F-022 — ChatHeader glyphs, inlined (SDK convention: no lucide-react dep; icons inlined ~byte-identical
// to lucide-react 0.487.0, same as channel-title / subagent-list / file-explorer).

const glyphSvgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

interface IconProps {
  className?: string;
  size?: number;
}

function svgProps({ className, size }: IconProps): Record<string, unknown> {
  return {
    className,
    width: size,
    height: size,
    ...glyphSvgProps,
    'aria-hidden': true,
  };
}

/** lucide `message-square` — leading fallback glyph when there is no avatar / bot name. */
export function MessageSquareIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** lucide `refresh-cw` — the default reset action glyph. */
export function RefreshIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

/** lucide `download` — the Export History action glyph (moved here from the footer under BUILD-028). */
export function DownloadIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

/** lucide `x` — the default close action glyph. */
export function XIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
