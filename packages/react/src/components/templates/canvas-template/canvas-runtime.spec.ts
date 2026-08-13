import { describe, expect, it } from 'vitest';
import { buildCanvasSrcDoc } from './canvas-runtime';
import type { ResolvedCanvasTheme } from './resolve-canvas-theme';

// F-030 R2 / R4 / R11 — the srcdoc is the security boundary's payload, so its shape is asserted rather
// than eyeballed: the CSP that keeps the canvas off the network, the five palette names that are a
// contract with the backend's tool description, and a correctly closed script tag.

const THEME: ResolvedCanvasTheme = {
  fg: 'rgb(232, 234, 237)',
  bg: 'rgb(23, 26, 33)',
  accent: 'rgb(110, 168, 254)',
  muted: 'rgba(232, 234, 237, 0.62)',
  border: 'rgba(255, 255, 255, 0.14)',
  padding: '0.75rem',
  selection: 'rgba(110, 168, 254, 0.32)',
};

describe('buildCanvasSrcDoc', () => {
  it('R4: carries a default-src none CSP that only allows inline style/script and data: assets', () => {
    const doc = buildCanvasSrcDoc(THEME);

    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain("style-src 'unsafe-inline'");
    expect(doc).toContain("script-src 'unsafe-inline'");
    expect(doc).toContain('img-src data:');
    expect(doc).toContain('font-src data:');
    // No network origin may be allowed anywhere in the policy.
    expect(doc).not.toMatch(/(connect|default)-src[^;"]*https?:/);
  });

  it('R11: declares exactly the five palette names the backend tells the agent about', () => {
    const doc = buildCanvasSrcDoc(THEME);

    // These names are a contract with asgard-core#190 — renaming one silently unstyles every canvas.
    const NAMES = ['--canvas-fg', '--canvas-bg', '--canvas-accent', '--canvas-muted', '--canvas-border'];

    // They are declared twice on purpose: once in the initial <style id="theme">, and once inside the
    // runtime's themeCss(), which rewrites that block when the host switches theme. The two must stay
    // in sync — a name added to one and not the other loses its value on the first theme change.
    const initial = doc.slice(
      doc.indexOf('<style id="theme">'),
      doc.indexOf('</style>', doc.indexOf('<style id="theme">')),
    );
    const runtime = doc.slice(doc.indexOf('function themeCss'));

    NAMES.forEach(name => {
      expect(initial).toContain(`${name}:`);
      expect(runtime).toContain(`${name}:`);
    });
    expect(new Set(initial.match(/--canvas-[a-z]+/g)).size).toBe(5);
    expect(new Set(runtime.match(/--canvas-[a-z]+/g)).size).toBe(5);
  });

  it('R11: injects concrete resolved colors, never var() references', () => {
    const doc = buildCanvasSrcDoc(THEME);
    const palette = doc.slice(doc.indexOf(':root{'), doc.indexOf('}', doc.indexOf(':root{')));

    expect(palette).toContain('rgb(232, 234, 237)');
    // The host's custom properties do not cross the frame boundary, so a var() here would silently
    // fall back and paint near-white on white.
    expect(palette).not.toContain('var(--');
  });

  it('R2: states the background explicitly — an iframe without one is white', () => {
    expect(buildCanvasSrcDoc(THEME)).toContain('html,body{background:var(--canvas-bg);color:var(--canvas-fg);}');
  });

  it('closes the runtime script tag properly', () => {
    const doc = buildCanvasSrcDoc(THEME);

    expect(doc).toContain('</script>');
    // The source splits the closing tag to dodge a lint escape; the output must not leak the seam.
    expect(doc).not.toContain('${');
    expect(doc).not.toContain('<\\/script>');
  });

  it('embeds the runtime, which reports height and visibility back to the parent', () => {
    const doc = buildCanvasSrcDoc(THEME);

    expect(doc).toContain("__asgardCanvas: 'ready'");
    expect(doc).toContain("__asgardCanvas: 'height'");
    // Skeleton decided by node presence, never by height — #root has padding.
    expect(doc).toContain('function anyVisible()');
    expect(doc).toContain("n.nodeName !== 'STYLE'");
  });
});
