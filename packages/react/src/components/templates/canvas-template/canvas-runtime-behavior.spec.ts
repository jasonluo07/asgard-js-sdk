// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCanvasSrcDoc } from './canvas-runtime';
import type { ResolvedCanvasTheme } from './resolve-canvas-theme';

// F-030 R6 / R7 / R9 — the morph, the deferred script execution and the visibility signal all live
// *inside* the iframe, where the host cannot look. Browser verification can only observe their side
// effects indirectly, so the runtime is executed here against a jsdom document instead: the same
// source string the srcdoc ships, driven through the same postMessage protocol.

const THEME: ResolvedCanvasTheme = {
  fg: 'rgb(232, 234, 237)',
  bg: 'rgb(23, 26, 33)',
  accent: 'rgb(110, 168, 254)',
  muted: 'rgb(150, 150, 150)',
  border: 'rgb(60, 60, 60)',
  padding: '0.75rem',
  selection: 'rgba(110, 168, 254, 0.32)',
};

/** Pulls the runtime source back out of the srcdoc, so the test runs exactly what ships. */
function runtimeSource(): string {
  const doc = buildCanvasSrcDoc(THEME);
  const open = doc.indexOf('<script>') + '<script>'.length;

  return doc.slice(open, doc.indexOf('</script>', open));
}

interface Posted {
  __asgardCanvas?: string;
  height?: number;
  visible?: boolean;
}

let posted: Posted[] = [];
let send: (message: unknown) => void;
let sendFrom: (source: unknown, message: unknown) => void;

beforeEach(() => {
  posted = [];
  document.head.innerHTML = '<style id="theme"></style>';
  document.body.innerHTML = '<div id="root"></div>';

  // The runtime talks to `parent` and observes `document.documentElement`. jsdom has no
  // ResizeObserver; the runtime already guards on its presence, so leaving it undefined exercises the
  // no-observer path and keeps `report()` driven by explicit applies.
  const parentStub = { postMessage: (message: unknown): void => void posted.push(message as Posted) };
  const listeners: ((event: { source: unknown; data: unknown }) => void)[] = [];
  const windowStub = {
    addEventListener: (_type: string, handler: (event: { source: unknown; data: unknown }) => void): void => {
      listeners.push(handler);
    },
    ResizeObserver: undefined,
  };

  const run = new Function('window', 'parent', 'document', runtimeSource());

  run(windowStub, parentStub, document);

  sendFrom = (source: unknown, message: unknown): void => listeners.forEach(fn => fn({ source, data: message }));
  send = (message: unknown): void => sendFrom(parentStub, message);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const root = (): HTMLElement => document.getElementById('root') as HTMLElement;
const last = (kind: string): Posted | undefined => [...posted].reverse().find(p => p.__asgardCanvas === kind);

describe('canvas runtime', () => {
  it('announces itself so the host knows when content can be sent', () => {
    expect(posted[0]?.__asgardCanvas).toBe('ready');
  });

  it('R6: morph keeps untouched nodes identical across updates', () => {
    send({ __asgardCanvas: 'content', html: '<p id="a">one</p><p id="b">two</p>', final: false });

    const first = root().querySelector('#a');

    send({ __asgardCanvas: 'content', html: '<p id="a">one</p><p id="b">two</p><p id="c">three</p>', final: false });

    // Resetting innerHTML would replace every node — that is what makes a streaming canvas flicker and
    // restart its CSS animations. The morph must leave the already-drawn node in place.
    expect(root().querySelector('#a')).toBe(first);
    expect(root().querySelectorAll('p')).toHaveLength(3);
  });

  it('R6: morph updates only what changed', () => {
    send({ __asgardCanvas: 'content', html: '<p id="a">one</p>', final: false });

    const node = root().querySelector('#a') as HTMLElement;

    send({ __asgardCanvas: 'content', html: '<p id="a" class="hi">changed</p>', final: false });

    expect(root().querySelector('#a')).toBe(node);
    expect(node.textContent).toBe('changed');
    expect(node.getAttribute('class')).toBe('hi');
  });

  it('R6: morph removes nodes that disappeared', () => {
    send({ __asgardCanvas: 'content', html: '<p>one</p><p>two</p>', final: false });
    send({ __asgardCanvas: 'content', html: '<p>one</p>', final: false });

    expect(root().querySelectorAll('p')).toHaveLength(1);
  });

  // jsdom does not execute scripts, so these two assert the *mechanism* the runtime uses: a <script>
  // inserted via innerHTML never runs, so the runtime replaces each one with a freshly created node —
  // that replacement is both necessary and sufficient for execution, and is observable here. That the
  // script then actually runs is verified in the browser (a real canvas stamps `data-script-runs`).
  it('R7: the fragment script is left untouched while the canvas is still drawing', () => {
    send({ __asgardCanvas: 'content', html: '<div id="s"></div><script>void 0;</script>', final: false });

    const script = root().querySelector('script');

    send({ __asgardCanvas: 'content', html: '<div id="s"></div><script>void 0;</script>', final: false });

    // Still the original node: nothing was re-created, so nothing could have executed against the
    // half-built tree.
    expect(root().querySelector('script')).toBe(script);
  });

  it('R7: the fragment script is re-created exactly once, on the final apply', () => {
    const html = '<div id="s"></div><script>void 0;</script>';

    send({ __asgardCanvas: 'content', html, final: false });

    const streaming = root().querySelector('script');

    send({ __asgardCanvas: 'content', html, final: true });

    const executed = root().querySelector('script');

    expect(executed).not.toBe(streaming);

    // A later apply (a redundant complete) must not re-create it a second time.
    send({ __asgardCanvas: 'content', html, final: true });
    expect(root().querySelector('script')).toBe(executed);
  });

  it('R9: nothing is "visible" while only style/script have arrived', () => {
    send({ __asgardCanvas: 'content', html: '<style>.a{color:red}</style>', final: false });

    // The fragment is style-first by design, so this is the normal opening of every canvas — and the
    // reason the decision cannot use #root's height, which is non-zero from padding alone.
    expect(last('height')?.visible).toBe(false);
  });

  it('R9: visibility flips once a real node arrives', () => {
    send({ __asgardCanvas: 'content', html: '<style>.a{color:red}</style><div class="a">hi</div>', final: false });

    expect(last('height')?.visible).toBe(true);
  });

  it('R12: a theme message rewrites the palette without touching the drawing', () => {
    send({ __asgardCanvas: 'content', html: '<p id="a">one</p>', final: true });

    const node = root().querySelector('#a');

    send({ __asgardCanvas: 'theme', ...THEME, accent: 'rgb(1, 2, 3)' });

    expect(document.getElementById('theme')?.textContent).toContain('--canvas-accent:rgb(1, 2, 3)');
    // Rebuilding srcdoc would wipe this node; the theme channel exists precisely to avoid that.
    expect(root().querySelector('#a')).toBe(node);
  });

  it('drops messages that did not come from the parent', () => {
    send({ __asgardCanvas: 'content', html: '<p>legit</p>', final: false });

    const before = root().innerHTML;

    // Under an opaque origin `event.origin` is the string "null" and proves nothing, so `event.source`
    // is the only usable guard. Anything from another window must be ignored outright.
    sendFrom(
      { postMessage: (): void => undefined },
      { __asgardCanvas: 'content', html: '<p>hostile</p>', final: true },
    );

    expect(root().innerHTML).toBe(before);
    expect(root().innerHTML).not.toContain('hostile');
  });
});
