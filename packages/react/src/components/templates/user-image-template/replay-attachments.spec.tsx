// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ConversationUserMessage, MessageBlob } from '@asgard-js/core';
import { AsgardTemplateContext } from '../../../context/asgard-template-context';
import { Locale } from '../../../i18n';
import { UserImageTemplate } from './user-image-template';

/**
 * asgard-js-sdk#448 — a user turn that carried attachments comes back from a GET rejoin with `blobIds` and
 * (on a current backend) `blobs`. It never comes back with `filePreviewUrls` / `documentNames`: those are
 * handed in by the consumer at `sendMessage` time and the preview URL is a browser-local object URL, dead
 * the moment the page reloads. So the replay path has to draw from the blob metadata alone, and the rows
 * written before the backend started snapshotting it — which are never backfilled — still have to produce
 * a bubble, or a pure-attachment turn stays invisible in the history.
 */

const DOC: MessageBlob = {
  blobId: '2091078155488989184',
  fileType: 'DOCUMENT',
  fileName: 'quarterly.txt',
  size: 39,
  mime: 'text/plain',
};
const UNNAMED_IMAGE: MessageBlob = {
  blobId: '2091078159192559616',
  fileType: 'IMAGE',
  fileName: null,
  size: 70,
  mime: 'image/png',
};

function userMessage(fields: Partial<ConversationUserMessage>): ConversationUserMessage {
  return {
    type: 'user',
    messageId: 'u-1',
    text: '',
    time: new Date(),
    ...fields,
  };
}

function mount(message: ConversationUserMessage, locale: Locale = 'en-US'): HTMLElement {
  const view = render(
    <AsgardTemplateContext.Provider value={{ locale }}>
      <UserImageTemplate message={{ type: 'user', message }} />
    </AsgardTemplateContext.Provider>,
  );

  return view.container;
}

function chips(container: HTMLElement): { label: string; kind: string | null }[] {
  return Array.from(container.querySelectorAll('[data-attachment-kind]')).map(node => ({
    label: node.textContent ?? '',
    kind: node.getAttribute('data-attachment-kind'),
  }));
}

describe('#448 replayed user attachments', () => {
  afterEach(cleanup);

  it('R2: draws one chip per blob, labelled with fileName', () => {
    const container = mount(userMessage({ blobIds: [DOC.blobId], blobs: [DOC] }));
    expect(chips(container)).toEqual([{ label: 'quarterly.txt', kind: 'file' }]);
  });

  it('R2: substitutes the file type label when fileName is null', () => {
    const container = mount(userMessage({ blobIds: [UNNAMED_IMAGE.blobId], blobs: [UNNAMED_IMAGE] }));
    expect(chips(container)).toEqual([{ label: 'Image', kind: 'image' }]);
  });

  // Found at the §3 boundary pass: the backend keeps `''` distinct from `null`, but a chip cannot show
  // either one — a glyph with a blank label beside it reads as broken, not as "this file has no name".
  it('R2: a blank fileName earns the stand-in too, not an empty label', () => {
    const empty: MessageBlob = { ...DOC, blobId: 'b-empty', fileName: '' };
    const spaces: MessageBlob = { ...DOC, blobId: 'b-spaces', fileName: '   ' };
    const container = mount(userMessage({ blobIds: ['b-empty', 'b-spaces'], blobs: [empty, spaces] }));
    expect(chips(container)).toEqual([
      { label: 'Document', kind: 'file' },
      { label: 'Document', kind: 'file' },
    ]);
  });

  it('R3: an IMAGE blob renders as a chip and fetches no bytes — Phase 1 carries no URL', () => {
    const container = mount(userMessage({ blobIds: [UNNAMED_IMAGE.blobId], blobs: [UNNAMED_IMAGE] }));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('R3: every non-image type falls to the file glyph, including one this SDK has never seen', () => {
    const video: MessageBlob = { ...DOC, blobId: 'b-v', fileType: 'VIDEO', fileName: 'clip.mp4' };
    const binary: MessageBlob = { ...DOC, blobId: 'b-b', fileType: 'BINARY', fileName: null };
    // Not a lie about the contract — the backend owns this enum and can add to it. The cast is the only way
    // to express "a value from a newer backend", and what is under test is that it renders instead of throwing.
    const future = { ...DOC, blobId: 'b-f', fileType: 'HOLOGRAM', fileName: null } as unknown as MessageBlob;
    const container = mount(userMessage({ blobIds: ['b-v', 'b-b', 'b-f'], blobs: [video, binary, future] }));
    expect(chips(container)).toEqual([
      { label: 'clip.mp4', kind: 'file' },
      { label: 'File', kind: 'file' },
      { label: 'File', kind: 'file' },
    ]);
  });

  it('R4: blobIds with no blobs — an un-backfilled row — still gets one neutral chip per id', () => {
    const container = mount(userMessage({ blobIds: ['b1', 'b2'] }));
    expect(chips(container)).toEqual([
      { label: 'Attachment', kind: 'unknown' },
      { label: 'Attachment', kind: 'unknown' },
    ]);
  });

  it('R5: the live send path is untouched — previews and document cards render, with no replay chip beside them', () => {
    const container = mount(
      userMessage({
        text: '看一下這兩個',
        blobIds: ['b1', 'b2'],
        filePreviewUrls: ['blob:http://localhost/preview-1'],
        documentNames: ['quarterly.txt'],
      }),
    );
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.textContent).toContain('quarterly.txt');
    expect(chips(container)).toEqual([]);
  });

  it('R5: a live send carrying only image previews draws no chip either', () => {
    const container = mount(userMessage({ blobIds: ['b1'], filePreviewUrls: ['blob:http://localhost/preview-1'] }));
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(chips(container)).toEqual([]);
  });

  it('blobs is authoritative when present — an id with no entry beside it is not drawn twice', () => {
    const container = mount(userMessage({ blobIds: [DOC.blobId, 'b-no-metadata'], blobs: [DOC] }));
    expect(chips(container)).toEqual([{ label: 'quarterly.txt', kind: 'file' }]);
  });

  it('R6: a pure-attachment turn (empty text) still renders a visible bubble', () => {
    const container = mount(userMessage({ text: '', blobIds: [DOC.blobId], blobs: [DOC] }));
    expect(container.textContent).toContain('quarterly.txt');
  });

  it('R7: the stand-in labels come from the catalog, in every locale', () => {
    const replayed = userMessage({ blobIds: [UNNAMED_IMAGE.blobId, 'b-legacy'], blobs: [UNNAMED_IMAGE] });
    expect(chips(mount(replayed, 'zh-TW')).map(chip => chip.label)).toEqual(['圖片']);
    expect(chips(mount(userMessage({ blobIds: ['b1'] }), 'zh-TW')).map(chip => chip.label)).toEqual(['附件']);
    expect(chips(mount(replayed, 'ja-JP')).map(chip => chip.label)).toEqual(['画像']);
    expect(chips(mount(userMessage({ blobIds: ['b1'] }), 'ja-JP')).map(chip => chip.label)).toEqual(['添付ファイル']);
  });
});
