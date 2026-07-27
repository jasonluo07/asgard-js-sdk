import { describe, expect, it } from 'vitest';
import { planAttachments } from './use-attachment-upload';

/**
 * BUILD-028 R2 / R3 — the composer's single 📎 accepts images and documents in one pick, so the routing,
 * validation and per-kind caps all run through `planAttachments`. Before BUILD-028 the two kinds lived in
 * separate lists and each pick cleared the other; these tests pin the replacement behavior.
 */

function file(name: string, type: string, size = 1024): File {
  const blob = new File([new Uint8Array(size)], name, { type });

  // jsdom derives size from the parts; assert the intent for the oversize case below.
  Object.defineProperty(blob, 'size', { value: size });

  return blob;
}

const BOTH_LANES = { enableImage: true, enableDocument: true, existing: { image: 0, document: 0 } };

describe('planAttachments', () => {
  it('keeps images and documents from a single pick together (no mutual exclusion)', () => {
    const { accepted, errors } = planAttachments(
      [file('shot.png', 'image/png'), file('spec.pdf', 'application/pdf')],
      BOTH_LANES,
    );

    expect(errors).toEqual([]);
    expect(accepted.map(item => [item.file.name, item.kind])).toEqual([
      ['shot.png', 'image'],
      ['spec.pdf', 'document'],
    ]);
  });

  it('caps each kind independently, counting what is already pending', () => {
    const { accepted, errors } = planAttachments(
      [file('a.png', 'image/png'), file('b.png', 'image/png'), file('c.pdf', 'application/pdf')],
      { enableImage: true, enableDocument: true, existing: { image: 9, document: 0 } },
    );

    // One image slot left, documents untouched by the image cap.
    expect(accepted.map(item => item.file.name)).toEqual(['a.png', 'c.pdf']);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('10 張圖片');
  });

  it('routes images into the document lane when only documents are enabled', () => {
    const { accepted } = planAttachments([file('shot.png', 'image/png')], {
      enableImage: false,
      enableDocument: true,
      existing: { image: 0, document: 0 },
      // An image MIME is not in the default document list, so the lane must be opened explicitly.
      allowedDocumentMimeTypes: ['image/png'],
    });

    expect(accepted).toEqual([{ file: expect.objectContaining({ name: 'shot.png' }), kind: 'document' }]);
  });

  it('drops files that have no enabled lane', () => {
    const { accepted, errors } = planAttachments([file('spec.pdf', 'application/pdf')], {
      enableImage: true,
      enableDocument: false,
      existing: { image: 0, document: 0 },
    });

    expect(accepted).toEqual([]);
    expect(errors).toEqual([]);
  });

  it('collects validation failures from both lanes into one list', () => {
    const { accepted, errors } = planAttachments(
      [file('huge.png', 'image/png', 21 * 1024 * 1024), file('weird.xyz', 'application/x-unknown')],
      BOTH_LANES,
    );

    expect(accepted).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('huge.png');
    expect(errors[1]).toContain('weird.xyz');
  });
});
