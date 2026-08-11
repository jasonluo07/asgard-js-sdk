import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * #415 (follow-through) — the details region added by #412 shipped its own hardcoded colours with no
 * override point, which is the exact defect #415 was filed about. They are wrapped on the same terms:
 * `var(--asgard-*, <previous literal>)`, so a consumer can feed a value and one that does not sees no
 * change.
 *
 * Only the declarations #412 introduced are covered. `.hint_root` and the "view the report" row
 * predate it and are left alone — #412's spec explicitly asked for that row to stay as it was.
 */

const STYLESHEET = join(__dirname, 'hint-template.module.scss');

/** Selector → the exact declaration expected, with the pre-#415 literal as the fallback. */
const EXPECTED: { selector: string; property: string; declaration: string }[] = [
  {
    selector: 'error_hint_toggle',
    property: 'color',
    declaration: 'var(--asgard-error-toggle, rgba(200, 200, 200, 1))',
  },
  {
    selector: 'error_details',
    property: 'background',
    declaration: 'var(--asgard-error-details-bg, rgba(0, 0, 0, 0.25))',
  },
  {
    selector: 'error_details',
    property: 'color',
    declaration: 'var(--asgard-error-details-text, rgba(220, 220, 220, 1))',
  },
  {
    selector: 'error_detail_label',
    property: 'color',
    declaration: 'var(--asgard-error-details-label, rgba(150, 150, 150, 1))',
  },
  {
    selector: 'error_inner',
    property: 'color',
    declaration: 'var(--asgard-error-details-text, rgba(220, 220, 220, 1))',
  },
];

/** The `<property>: <value>;` inside `.<selector> { … }`, as written. */
function declaration(css: string, selector: string, property: string): string {
  const block = css.match(new RegExp(`\\.${selector}\\s*\\{([\\s\\S]*?)\\n  \\}`));

  expect(block, `no rule found for .${selector}`).toBeTruthy();

  const match = (block?.[1] ?? '').match(new RegExp(`(?<![-a-z])${property}:\\s*([^;]+);`));

  expect(match, `no ${property} declaration in .${selector}`).toBeTruthy();

  return (match?.[1] ?? '').trim();
}

describe('#415 — the error bubble details region is themeable', () => {
  const css = readFileSync(STYLESHEET, 'utf8');

  it('routes every colour through an --asgard-* variable with its previous literal as the fallback', () => {
    for (const { selector, property, declaration: expected } of EXPECTED) {
      expect(declaration(css, selector, property), `.${selector} { ${property} } drifted`).toBe(expected);
    }
  });

  it('reuses one token for the container and the <pre>, which are the same colour and role', () => {
    expect(declaration(css, 'error_details', 'color')).toBe(declaration(css, 'error_inner', 'color'));
  });
});
