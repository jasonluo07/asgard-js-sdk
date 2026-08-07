// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './spinner';

/**
 * The glyph guard that used to live in `file-explorer/icons.spec.tsx` — BUG-007 moved
 * `loader-circle` out of the per-component icon files and into this one shared component, and the
 * geometry still has to be checked because nothing else in the toolchain reads path data (a
 * mistyped coordinate would ship silently). Geometry is lucide-react 0.487.0, the version the
 * chat-kit prototype pins; see BUILD-025 for why that pin is deliberate.
 */
const LOADER_CIRCLE_PATH = 'M21 12a9 9 0 1 1-6.219-8.56';

describe('Spinner', () => {
  it('draws lucide 0.487.0 `loader-circle`', () => {
    const { container } = render(<Spinner />);

    expect(container.querySelector('path')?.getAttribute('d')).toBe(LOADER_CIRCLE_PATH);
  });

  it('is announced when labelled and hidden when decorative', () => {
    const { container: labelled } = render(<Spinner label="Running" />);
    const { container: decorative } = render(<Spinner />);

    expect(labelled.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(labelled.querySelector('svg')?.getAttribute('aria-label')).toBe('Running');
    expect(labelled.querySelector('svg')?.getAttribute('aria-hidden')).toBeNull();
    expect(decorative.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
