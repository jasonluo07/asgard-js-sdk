import { ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ConversationThinkingMessage } from '@asgard-js/core';
import { StreamdownClient } from '../text-template/streamdown-client';
import styles from './thinking-block.module.scss';

// F-001 — extended-thinking (reasoning) block. Two states:
//  - streaming (`isThinking`): auto-expanded, header "Thinking…". Reasoning renders in a
//    bottom-anchored auto-scrolling plain-text window — each delta appends at the end, the window
//    scrolls to the latest, an overflow shows a top gradient mask. Text never shifts horizontally
//    (no `…`+slice tail window) and there is no typewriter buffering. Plain text avoids half-open
//    markdown reflow. Scrolling is instant (reduced-motion safe).
//  - completed: collapses to the fixed summary "Thought for a moment" (no elapsed time), expandable
//    to full markdown reasoning with a leading preview + show more / less.

const PREVIEW_LIMIT = 160; // completed-state leading preview cap (chars, ~4 lines)
const COMPLETED_SUMMARY = 'Thought for a moment';
const STREAMING_LABEL = 'Thinking…';

function BrainIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// Streaming reasoning: bottom-anchored, auto-scrolls to the latest, top gradient mask on overflow.
// Plain text with stable character positions — only the window scrolls, text is never re-laid-out.
function StreamingReasoning({ text }: { text: string }): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [masked, setMasked] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    let cancelled = false;

    const measure = (): void => {
      const node = ref.current;

      if (cancelled || !node) return;

      node.scrollTop = node.scrollHeight; // anchor to latest (instant; reduced-motion safe)
      setMasked(node.scrollHeight > node.clientHeight + 2); // mask only when there is overflow
    };

    const id = requestAnimationFrame(measure);
    // Web fonts reflow after load and change the height → re-measure once ready.
    void document.fonts?.ready.then(measure);

    return (): void => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [text]);

  return (
    <div
      ref={ref}
      className={clsx(styles.thinking_block__streaming, masked && styles['thinking_block__streaming--masked'])}
    >
      {text}
    </div>
  );
}

export interface ThinkingBlockProps {
  message: ConversationThinkingMessage;
}

export function ThinkingBlock({ message }: ThinkingBlockProps): ReactNode {
  const streaming = message.isThinking;
  const [manualOpen, setManualOpen] = useState(false);
  const [showFull, setShowFull] = useState(false);

  // Streaming is always expanded; completed is collapsed until the user opens it.
  const open = streaming || manualOpen;

  // Completed-state expansion: leading preview + show more / less.
  const clamped = message.text.length > PREVIEW_LIMIT;
  const shown = !clamped || showFull ? message.text : `${message.text.slice(0, PREVIEW_LIMIT).trimEnd()}…`;

  return (
    <div className={styles.thinking_block}>
      <button
        type="button"
        className={styles.thinking_block__header}
        onClick={() => setManualOpen(prev => !prev)}
        disabled={streaming}
      >
        {!streaming && (
          <ChevronIcon
            className={clsx(styles.thinking_block__chevron, open && styles['thinking_block__chevron--expanded'])}
          />
        )}
        <BrainIcon
          className={clsx(styles.thinking_block__brain, streaming && styles['thinking_block__brain--streaming'])}
        />
        <span className={clsx(streaming && styles['thinking_block__label--streaming'])}>
          {streaming ? STREAMING_LABEL : COMPLETED_SUMMARY}
        </span>
      </button>
      {open && (
        <div className={styles.thinking_block__body}>
          {streaming ? (
            <StreamingReasoning text={message.text} />
          ) : (
            <div className={styles.thinking_block__reasoning}>
              <StreamdownClient>{shown}</StreamdownClient>
              {clamped && (
                <button
                  type="button"
                  className={styles.thinking_block__more}
                  onClick={() => setShowFull(prev => !prev)}
                >
                  {showFull ? '顯示較少' : '顯示更多'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
