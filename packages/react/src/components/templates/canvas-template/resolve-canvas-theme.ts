/** The five names are a contract with the backend's `show_canvas` tool description (asgard-core#190). */
export interface ResolvedCanvasTheme {
  fg: string;
  bg: string;
  /** Emphasis: the data itself (bars, lines, highlights) and anything clickable. */
  accent: string;
  /** De-emphasized text: labels, captions, axes. */
  muted: string;
  /** Hairlines, card outlines, dividers. */
  border: string;
  padding: string;
  selection: string;
}

/**
 * Used only when there is no host element to read from (e.g. before mount in a non-DOM environment).
 * Never used to paper over a failed read — see `resolveCanvasTheme`.
 */
const FALLBACK_THEME: ResolvedCanvasTheme = {
  fg: '#e8eaed',
  bg: '#171a21',
  accent: '#6ea8fe',
  muted: 'rgba(232,234,237,0.62)',
  border: 'rgba(255,255,255,0.14)',
  padding: '0.75rem',
  selection: 'rgba(110,168,254,0.32)',
};

const TRANSPARENT = /^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/;

/**
 * `accent` / `muted` / `border` have no computed property of their own — they are not properties of
 * the card. So a hidden probe element is given a `var()` chain and the browser's **resolved** computed
 * color is read back.
 *
 * This does not contradict "never guess token names": the result is always something the browser
 * resolved, and when every candidate is absent the chain ends at `currentColor` rather than inventing
 * a color unrelated to the product.
 */
function probeColor(host: HTMLElement, expression: string, fallback: string): string {
  const probe = document.createElement('span');

  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color:${expression}`;
  host.appendChild(probe);

  const value = getComputedStyle(probe).color;

  probe.remove();

  return value || fallback;
}

/**
 * Resolves the host's actual colors into concrete values to hand to the iframe (F-030 AC14 / AC19).
 *
 * It reads the **computed `color` / `background-color` of real elements**, not custom properties.
 * That distinction was learned the expensive way in the prototype: the first version read `--fg` /
 * `--surface`, but that design system has no `--fg` (it is `--text-primary`), so the text color fell
 * back to near-white, while `--surface` resolved to `#ffffff` in light mode. Near-white text on a
 * white background — every pixel present, nothing visible, and readable by luck on a dark host.
 *
 * A computed color has none of those problems: it is always a resolved `rgb(...)`, always reflects the
 * theme in force, and requires no knowledge of what the host calls its tokens or what format they are
 * in (hex / hsl triplet / oklch all behave the same).
 *
 * The background walks up the ancestor chain: the card itself may be transparent, and an iframe with
 * no stated background is white.
 */
export function resolveCanvasTheme(
  host: HTMLElement | null,
  override?: Partial<ResolvedCanvasTheme>,
): ResolvedCanvasTheme {
  const base = { ...FALLBACK_THEME };

  if (host) {
    const fg = getComputedStyle(host).color;

    if (fg) base.fg = fg;

    for (let element: HTMLElement | null = host; element; element = element.parentElement) {
      const bg = getComputedStyle(element).backgroundColor;

      if (bg && !TRANSPARENT.test(bg)) {
        base.bg = bg;

        break;
      }
    }

    // The SDK's own tokens come first because they are known to exist here; the generic names follow
    // for consumers that theme the shell themselves. Every chain ends at `currentColor`.
    base.accent = probeColor(
      host,
      'var(--asg-color-primary, var(--primary, var(--accent, var(--brand, currentColor))))',
      base.accent,
    );
    base.muted = probeColor(
      host,
      'var(--asg-color-text-secondary, var(--text-secondary, var(--muted-foreground, currentColor)))',
      base.muted,
    );
    base.border = probeColor(host, 'var(--asg-color-border, var(--border, var(--divider, currentColor)))', base.border);
  }

  return { ...base, ...override };
}
