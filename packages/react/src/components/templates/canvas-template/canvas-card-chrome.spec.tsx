// @vitest-environment jsdom
import type { ConversationCanvasMessage } from '@asgard-js/core';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AsgardTemplateContext } from '../../../context';
import { t } from '../../../i18n';
import { CanvasTemplate } from './canvas-template';

/**
 * REVIEW-054 BLOCKER 1. The card chrome used to hang the drawing indicator inside the title guard,
 * but core sets `title` only on `canvas.complete` — the same event that sets `isDrawing: false`
 * (`conversation.ts` `onCanvasStart` / `onCanvasDelta` / `onCanvasComplete`). `title && isDrawing` is
 * therefore never true, so the indicator was unreachable and the card sat chrome-less for the whole
 * ~19s the user was waiting. F-030 AC8 states the two conditions independently: a title row when
 * `template.title` is set, **and** a drawing indication while streaming.
 */
function canvasMessage(overrides: Partial<ConversationCanvasMessage> = {}): ConversationCanvasMessage {
  return {
    type: 'canvas',
    messageId: 'canvas-1',
    html: '<style>#root{padding:12px}</style>',
    isDrawing: true,
    time: new Date('2026-08-13T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CanvasTemplate card chrome', () => {
  afterEach(cleanup);

  // The state core actually produces while a canvas streams: markup arriving, no title yet.
  it('shows the drawing indication while streaming, before any title exists', () => {
    render(<CanvasTemplate message={canvasMessage()} />);

    expect(screen.getByText(t('en-US', 'canvas.drawing'))).toBeTruthy();
  });

  // AC17: the title is only ever `template.title`. Once complete lands it replaces the state label.
  it('swaps the drawing label for the title once the canvas completes', () => {
    render(<CanvasTemplate message={canvasMessage({ isDrawing: false, title: '資料管線現況' })} />);

    expect(screen.getByText('資料管線現況')).toBeTruthy();
    expect(screen.queryByText(t('en-US', 'canvas.drawing'))).toBeNull();
  });

  // A completed canvas the backend never titled keeps its chrome off entirely rather than inventing one.
  it('renders no header for a completed canvas with no title', () => {
    const { container } = render(<CanvasTemplate message={canvasMessage({ isDrawing: false })} />);

    expect(screen.queryByText(t('en-US', 'canvas.drawing'))).toBeNull();
    expect(container.querySelector('iframe')).toBeTruthy();
  });

  // `canvas.drawing` was dead in all three locales while the indicator was unreachable.
  it('localizes the drawing indication', () => {
    render(
      <AsgardTemplateContext.Provider value={{ locale: 'zh-TW' }}>
        <CanvasTemplate message={canvasMessage()} />
      </AsgardTemplateContext.Provider>,
    );

    expect(screen.getByText(t('zh-TW', 'canvas.drawing'))).toBeTruthy();
  });
});
