import { describe, it, expect } from 'vitest';
import Conversation from './conversation';
import { EventType, MessageTemplateType } from '../constants/enum';
import type { CanvasMessageTemplate, ConversationCanvasMessage, SseResponse } from '../types';

// F-030 (AC3–AC7) — folding `asgard.message.canvas.{start,delta,complete}` into conversation state.
//
// Three rules carry the weight, each blocking a concrete failure:
//   1. deltas accumulate (same semantics as a text delta);
//   2. `complete` **replaces** — it carries the backend's authoritative fragment, and a rejoin replays
//      only the complete, so appending here streams fine and comes back empty after a reload;
//   3. `complete` with no template means the backend could not draw it — discard the whole card rather
//      than presenting half a document as finished.
// Plus the F-011 terminal guard and the BUG-001 `parentToolUseId` drop.

type CanvasEventType =
  | EventType.MESSAGE_CANVAS_START
  | EventType.MESSAGE_CANVAS_DELTA
  | EventType.MESSAGE_CANVAS_COMPLETE;

const FACT_KEY: Record<CanvasEventType, string> = {
  [EventType.MESSAGE_CANVAS_START]: 'messageCanvasStart',
  [EventType.MESSAGE_CANVAS_DELTA]: 'messageCanvasDelta',
  [EventType.MESSAGE_CANVAS_COMPLETE]: 'messageCanvasComplete',
};

function canvasEvent(
  eventType: CanvasEventType,
  messageId: string,
  text: string,
  options: { template?: CanvasMessageTemplate; parentToolUseId?: string } = {},
): SseResponse<EventType> {
  return {
    eventType,
    requestId: 'req-1',
    traceId: 'trace-1',
    namespace: 'ns',
    botProviderName: 'bp',
    customChannelId: 'c-1',
    fact: {
      [FACT_KEY[eventType]]: {
        message: {
          messageId,
          replyToCustomMessageId: '',
          text,
          payload: null,
          isDebug: false,
          idx: null,
          template: options.template ?? null,
          parentToolUseId: options.parentToolUseId,
        },
      },
    },
  } as unknown as SseResponse<EventType>;
}

function canvasTemplate(html: string, title?: string): CanvasMessageTemplate {
  return { type: MessageTemplateType.CANVAS, title, canvas: { html }, quickReplies: [] };
}

function canvasOf(conversation: Conversation, messageId: string): ConversationCanvasMessage | undefined {
  const message = conversation.messages?.get(messageId);

  return message?.type === 'canvas' ? message : undefined;
}

/** Folds a sequence the way the SSE layer would. */
function fold(events: SseResponse<EventType>[]): Conversation {
  return events.reduce(
    (conversation, event) => conversation.onMessage(event),
    new Conversation({ messages: new Map() }),
  );
}

const START = EventType.MESSAGE_CANVAS_START;
const DELTA = EventType.MESSAGE_CANVAS_DELTA;
const COMPLETE = EventType.MESSAGE_CANVAS_COMPLETE;

const FRAGMENT = '<style>#a{color:red}</style><div id="a">hi</div>';

describe('canvas stream', () => {
  it('R2: start opens an empty canvas that is still drawing', () => {
    const canvas = canvasOf(fold([canvasEvent(START, 'c1', '')]), 'c1');

    expect(canvas).toBeDefined();
    expect(canvas?.html).toBe('');
    expect(canvas?.isDrawing).toBe(true);
  });

  it('R3: deltas accumulate onto the fragment', () => {
    const canvas = canvasOf(
      fold([
        canvasEvent(START, 'c1', ''),
        canvasEvent(DELTA, 'c1', '<style>#a{'),
        canvasEvent(DELTA, 'c1', 'color:red}</style>'),
        canvasEvent(DELTA, 'c1', '<div id="a">hi</div>'),
      ]),
      'c1',
    );

    expect(canvas?.html).toBe(FRAGMENT);
    expect(canvas?.isDrawing).toBe(true);
  });

  it('R3: a delta with no preceding start opens the block instead of dropping the markup', () => {
    // Joining a stream mid-flight. Discarding here would silently lose the beginning of the drawing.
    const canvas = canvasOf(fold([canvasEvent(DELTA, 'c1', '<div>partial</div>')]), 'c1');

    expect(canvas?.html).toBe('<div>partial</div>');
    expect(canvas?.isDrawing).toBe(true);
  });

  it('R4: complete replaces the accumulation rather than extending it', () => {
    const canvas = canvasOf(
      fold([
        canvasEvent(START, 'c1', ''),
        canvasEvent(DELTA, 'c1', '<style>#a{'),
        canvasEvent(COMPLETE, 'c1', '', { template: canvasTemplate(FRAGMENT, 'Flow') }),
      ]),
      'c1',
    );

    expect(canvas?.html).toBe(FRAGMENT);
    expect(canvas?.title).toBe('Flow');
    expect(canvas?.isDrawing).toBe(false);
  });

  it('R4: a complete-only transcript equals the fully streamed one — the rejoin guarantee', () => {
    // History replays only completes. If `complete` appended, this canvas would come back empty and the
    // defect would be invisible while streaming.
    const streamed = canvasOf(
      fold([
        canvasEvent(START, 'c1', ''),
        canvasEvent(DELTA, 'c1', '<style>#a{color:red}</style>'),
        canvasEvent(DELTA, 'c1', '<div id="a">hi</div>'),
        canvasEvent(COMPLETE, 'c1', '', { template: canvasTemplate(FRAGMENT) }),
      ]),
      'c1',
    );
    const replayed = canvasOf(fold([canvasEvent(COMPLETE, 'c1', '', { template: canvasTemplate(FRAGMENT) })]), 'c1');

    expect(replayed?.html).toBe(streamed?.html);
    expect(replayed?.isDrawing).toBe(false);
  });

  it('R5: complete with no template discards the whole card', () => {
    const conversation = fold([
      canvasEvent(START, 'c1', ''),
      canvasEvent(DELTA, 'c1', '<div>half drawn'),
      canvasEvent(COMPLETE, 'c1', ''),
    ]);

    expect(conversation.messages?.has('c1')).toBe(false);
  });

  it('R5: complete with a template carrying no html also discards the card', () => {
    const empty = { type: MessageTemplateType.CANVAS, canvas: { html: '' }, quickReplies: [] };
    const conversation = fold([
      canvasEvent(START, 'c1', ''),
      canvasEvent(DELTA, 'c1', '<div>half drawn'),
      canvasEvent(COMPLETE, 'c1', '', { template: empty as CanvasMessageTemplate }),
    ]);

    expect(conversation.messages?.has('c1')).toBe(false);
  });

  it('R5: a no-template complete for an unknown id is a no-op, not an empty card', () => {
    const conversation = fold([canvasEvent(COMPLETE, 'ghost', '')]);

    expect(conversation.messages?.has('ghost')).toBe(false);
    expect(conversation.messages?.size ?? 0).toBe(0);
  });

  it('R6: a late start after complete does not reopen the finished canvas', () => {
    const canvas = canvasOf(
      fold([
        canvasEvent(COMPLETE, 'c1', '', { template: canvasTemplate(FRAGMENT, 'Flow') }),
        canvasEvent(START, 'c1', ''),
      ]),
      'c1',
    );

    expect(canvas?.html).toBe(FRAGMENT);
    expect(canvas?.isDrawing).toBe(false);
  });

  it('R6: a late delta after complete does not revert to the in-flight prefix', () => {
    const canvas = canvasOf(
      fold([
        canvasEvent(COMPLETE, 'c1', '', { template: canvasTemplate(FRAGMENT) }),
        canvasEvent(DELTA, 'c1', '<div>stale'),
      ]),
      'c1',
    );

    expect(canvas?.html).toBe(FRAGMENT);
    expect(canvas?.isDrawing).toBe(false);
  });

  it('R7: canvas frames carrying parentToolUseId stay out of the main conversation', () => {
    const conversation = fold([
      canvasEvent(START, 'sub', '', { parentToolUseId: 'tool-1' }),
      canvasEvent(DELTA, 'sub', '<div>subagent</div>', { parentToolUseId: 'tool-1' }),
      canvasEvent(COMPLETE, 'sub', '', {
        template: canvasTemplate(FRAGMENT),
        parentToolUseId: 'tool-1',
      }),
    ]);

    expect(conversation.messages?.has('sub')).toBe(false);
  });

  it('R2: two canvases in one run stay independent', () => {
    const conversation = fold([
      canvasEvent(DELTA, 'c1', '<div>one</div>'),
      canvasEvent(DELTA, 'c2', '<div>two</div>'),
      canvasEvent(COMPLETE, 'c1', '', { template: canvasTemplate('<div>ONE</div>') }),
    ]);

    expect(canvasOf(conversation, 'c1')?.html).toBe('<div>ONE</div>');
    expect(canvasOf(conversation, 'c1')?.isDrawing).toBe(false);
    expect(canvasOf(conversation, 'c2')?.html).toBe('<div>two</div>');
    expect(canvasOf(conversation, 'c2')?.isDrawing).toBe(true);
  });
});
