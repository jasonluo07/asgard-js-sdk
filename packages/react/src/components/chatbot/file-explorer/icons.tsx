import { ReactNode } from 'react';

// F-021 — File Explorer glyphs, inlined (SDK convention: no lucide-react dep; icons inlined ~byte-identical
// to lucide-react 0.487.0, same as channel-title / subagent-list).

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
  label?: string;
}

function svgProps({ className, size, label }: IconProps): Record<string, unknown> {
  return {
    className,
    width: size,
    height: size,
    ...glyphSvgProps,
    role: label ? 'img' : undefined,
    'aria-label': label,
    'aria-hidden': label ? undefined : true,
  };
}

export function ArrowLeftIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export function CodeIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

export function EyeIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function LoaderCircleIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function CircleAlertIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

export function FolderIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export function FileIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps): ReactNode {
  return (
    <svg {...svgProps(props)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

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
