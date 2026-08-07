// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentPreview } from './attachment-preview';
import type { AttachmentItem } from './use-attachment-upload';

/**
 * BUG-007 — the upload overlay is a CSS border ring rather than a glyph, so it is the one spinner
 * that cannot use the shared `Spinner` component and takes `useSyncedSpin` directly instead. It was
 * also the odd one out on timing (0.8s where everything else ran 1s). Both are checked here: the
 * ring really does get the shared animation, and it runs the shared period from the shared origin.
 */

interface StubAnimation {
  startTime: number | null;
  cancel: ReturnType<typeof vi.fn>;
}

let animateCalls: KeyframeAnimationOptions[];
let animations: StubAnimation[];

beforeEach(() => {
  animateCalls = [];
  animations = [];

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: (_keyframes: Keyframe[], options: KeyframeAnimationOptions): StubAnimation => {
      const animation: StubAnimation = { startTime: null, cancel: vi.fn() };

      animateCalls.push(options);
      animations.push(animation);

      return animation;
    },
  });

  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({ matches: false, media })),
  );
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'animate');
  vi.unstubAllGlobals();
});

// The ring only appears over an image thumbnail; document attachments render as chips instead.
function uploadingImage(): AttachmentItem {
  return {
    id: 'a1',
    kind: 'image',
    file: new File(['x'], 'photo.png', { type: 'image/png' }),
    status: 'uploading',
    previewUrl: 'blob:preview',
  };
}

describe('AttachmentPreview upload ring', () => {
  it('spins on the shared 1s timeline pinned to the document origin', () => {
    render(<AttachmentPreview items={[uploadingImage()]} onRemove={vi.fn()} removeLabel="Remove" closeLabel="Close" />);

    expect(animateCalls).toEqual([{ duration: 1000, iterations: Infinity }]);
    expect(animations.map(animation => animation.startTime)).toEqual([0]);
  });
});
