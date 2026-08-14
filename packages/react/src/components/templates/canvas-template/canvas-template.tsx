import { ReactNode, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ConversationCanvasMessage } from '@asgard-js/core';
import { t } from '../../../i18n';
import { useAsgardTemplateContext } from '../../../context';
import { buildCanvasSrcDoc } from './canvas-runtime';
import { ResolvedCanvasTheme, resolveCanvasTheme } from './resolve-canvas-theme';
import styles from './canvas-template.module.scss';

// F-030 — a canvas the agent drew, streamed in as it is written (a measured 2.3KB drawing arrives as
// 349 deltas). The isolation rationale lives in `canvas-runtime.ts`; this component owns the card
// chrome, the two postMessage channels, and the skeleton.

interface CanvasMessage {
  __asgardCanvas?: string;
  height?: number;
  visible?: boolean;
}

export interface CanvasTemplateProps {
  message: ConversationCanvasMessage;
  /** Height cap; past it the card scrolls rather than pushing the conversation aside. */
  maxHeight?: number;
  /** Overrides the resolved palette. Concrete color values, never `var(...)`. */
  theme?: Partial<ResolvedCanvasTheme>;
}

export function CanvasTemplate(props: CanvasTemplateProps): ReactNode {
  const { message, maxHeight = 520, theme } = props;
  const { html, title, isDrawing } = message;
  const { locale = 'en-US' } = useAsgardTemplateContext();

  const frameRef = useRef<HTMLIFrameElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(120);
  // False while the fragment has started arriving but holds nothing visible yet — reported from
  // inside the frame, because the host cannot see in.
  const [hasVisible, setHasVisible] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedCanvasTheme | null>(null);
  // Read through a ref inside the mount effect: the override is not a reactive input to srcdoc (which
  // is built exactly once), so this keeps the dependency list honest without an eslint-disable — and
  // a `react-hooks/*` disable would break the pre-commit hook, which runs ESLint from the repo root
  // where that plugin is not loaded.
  const themeRef = useRef(theme);

  themeRef.current = theme;
  const [srcDoc, setSrcDoc] = useState<string | undefined>(undefined);

  // A real canvas can be blank for a dozen seconds: the fragment is style-first by design (otherwise
  // a flash of unstyled markup), and the `<style>` is often more than half of it.
  const showSkeleton = isDrawing && !hasVisible;

  useEffect(() => {
    const host = hostRef.current;
    const first = resolveCanvasTheme(host, themeRef.current);

    setResolvedTheme(first);
    // Assembled once. Reassigning `srcdoc` would rebuild the document and wipe what is already drawn —
    // and, in a headed browser, would not re-navigate at all.
    setSrcDoc(buildCanvasSrcDoc(first));

    if (!host) return;

    // The theme class usually hangs on an inner container, not `documentElement`, so the whole
    // ancestor chain is observed.
    const observer = new MutationObserver(() => setResolvedTheme(resolveCanvasTheme(host, themeRef.current)));

    for (let element: HTMLElement | null = host; element; element = element.parentElement) {
      observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    }

    return (): void => observer.disconnect();
    // Mount-only: re-running would rebuild `srcdoc` and wipe the drawing. Live theme changes reach the
    // frame through the postMessage channel below instead.
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      // Opaque origin: `event.origin` is the string "null", so the source is the only usable check.
      if (event.source !== frameRef.current?.contentWindow) return;

      const data = event.data as CanvasMessage | null;

      if (data?.__asgardCanvas === 'ready') setReady(true);

      if (data?.__asgardCanvas === 'height' && typeof data.height === 'number') {
        setHeight(data.height);
        setHasVisible(Boolean(data.visible));
      }
    };

    window.addEventListener('message', onMessage);

    return (): void => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready || !resolvedTheme) return;

    frameRef.current?.contentWindow?.postMessage({ __asgardCanvas: 'theme', ...resolvedTheme }, '*');
  }, [ready, resolvedTheme]);

  // `ready` is a dependency because anything sent before the runtime is listening is dropped; on ready
  // the whole accumulated fragment is (re)sent once.
  useEffect(() => {
    if (!ready) return;

    frameRef.current?.contentWindow?.postMessage({ __asgardCanvas: 'content', html, final: !isDrawing }, '*');
  }, [html, isDrawing, ready]);

  const frameTitle = title ?? t(locale, 'canvas.untitled');

  return (
    <div ref={hostRef} className={styles.card} data-drawing={isDrawing ? 'true' : 'false'}>
      {/*
        Two independent conditions (AC8), not one: core sets `title` only on `canvas.complete`, the
        same event that ends the drawing, so nesting the indicator under `title` made it unreachable
        and the card sat chrome-less for the whole stream. The label slot carries the state while the
        canvas draws and the title once it lands — the same swap `thinking-block` does.
      */}
      {(title || isDrawing) && (
        <div className={styles.head}>
          <span className={styles.title}>{title ?? t(locale, 'canvas.drawing')}</span>
          {isDrawing && <span className={styles.pulse} aria-hidden />}
        </div>
      )}

      <div className={styles.body} style={{ height: Math.min(showSkeleton ? 96 : height, maxHeight), maxHeight }}>
        {showSkeleton && (
          <div className={styles.skeleton} aria-hidden>
            <span />
            <span />
            <span />
          </div>
        )}

        {/*
          Mounted only once `srcDoc` is final — never with a placeholder that is reassigned later. A
          headed browser does not re-navigate when `srcdoc` changes after mount, so the frame would sit
          on an empty `about:blank` forever. Headless navigates obediently, which is exactly why this
          defect survived nine passing headless scenarios in the prototype.
        */}
        {srcDoc && (
          <iframe
            ref={frameRef}
            // `allow-scripts` only. Adding `allow-same-origin` alongside it is equivalent to no sandbox.
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            title={frameTitle}
            className={clsx(styles.frame, showSkeleton && styles['frame--hidden'])}
          />
        )}
      </div>
    </div>
  );
}
