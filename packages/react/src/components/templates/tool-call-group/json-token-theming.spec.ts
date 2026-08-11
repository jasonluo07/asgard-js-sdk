import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * #415 — the JSON syntax-highlighting colours were the one surface in the theme system with no
 * override point at all: no CSS variable, no theme prop, and `renderToolCallGroup`'s
 * `renderDefaultContent` only accepts a `title` override, so a consumer wanting a different colour had
 * to re-implement the entire tool-call group. A light-theme consumer measured 1.48–2.95 contrast
 * against white (AA needs 4.5).
 *
 * Two things have to hold, and both are asserted against the stylesheet source because that is where
 * the contract lives — the values never reach a component, so there is nothing to render-test:
 *
 *   1. every token rule routes through `var(--asgard-json-token-*)`, so a value can be fed;
 *   2. every fallback is byte-identical to the literal it replaced, so existing consumers see no
 *      visual change whatsoever. That second one is the whole reason this is a safe change, and it is
 *      the one a careless edit would silently break.
 */

const STYLESHEET = join(__dirname, 'tool-call-group.module.scss');

/** The literals in place before #415 — the fallbacks must keep matching these exactly. */
const PREVIOUS_LITERALS: Record<string, string> = {
  key: '#9cdcfe',
  string: '#ce9178',
  number: '#b5cea8',
  boolean: '#569cd6',
  // `null` shared boolean's colour before #415 and shares its token now, by request.
  null: '#569cd6',
};

/** `.json_token--<name> { color: <declaration> }` — the declaration exactly as written. */
function colorDeclaration(css: string, token: string): string {
  const match = css.match(new RegExp(`\\.json_token--${token}\\s*\\{[^}]*?color:\\s*([^;]+);`));

  expect(match, `no color declaration found for .json_token--${token}`).toBeTruthy();

  return (match?.[1] ?? '').trim();
}

describe('#415 — JSON token colours are themeable', () => {
  const css = readFileSync(STYLESHEET, 'utf8');

  it('routes every token through a --asgard-json-token-* variable', () => {
    for (const token of [...Object.keys(PREVIOUS_LITERALS), 'punctuation']) {
      expect(colorDeclaration(css, token), `${token} is not overridable`).toMatch(/^var\(--asgard-json-token-[a-z]+,/);
    }
  });

  it('keeps every fallback byte-identical to the literal it replaced', () => {
    for (const [token, literal] of Object.entries(PREVIOUS_LITERALS)) {
      expect(colorDeclaration(css, token), `${token} fallback drifted`).toBe(
        `var(--asgard-json-token-${token === 'null' ? 'boolean' : token}, ${literal})`,
      );
    }

    expect(colorDeclaration(css, 'punctuation')).toBe('var(--asgard-json-token-punctuation, #d4d4d4)');
  });

  it('points null at boolean, so one knob moves both', () => {
    expect(colorDeclaration(css, 'null')).toContain('--asgard-json-token-boolean');
  });
});
