// @vitest-environment jsdom
import { ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AsgardThemeContextProvider,
  AsgardThemeContextValue,
  defaultAsgardThemeContextValue,
  useAsgardThemeContext,
} from './asgard-theme-context';

/**
 * asgard-sdk-pm#52 — the documented three-layer priority is props > annotations > default, but the
 * default layer was unreachable for six colour fields. The annotations pass builds its merge source
 * unconditionally (`botMessage: { color: annotations?.embedConfig?.theme?.botMessage?.color, … }`), so a
 * bot provider shipping no annotations handed `deepMerge` a bag of `undefined` — and `deepMerge` assigned
 * them, wiping the defaults before the props theme merged in. Those surfaces were then painted by SCSS
 * literals instead, which is why setting a palette token never reached the bubbles.
 *
 * These are the six fields the probe in the issue found clobbered.
 */
const CLOBBERED: [keyof AsgardThemeContextValue, string][] = [
  ['chatbot', 'backgroundColor'],
  ['chatbot', 'borderColor'],
  ['botMessage', 'color'],
  ['botMessage', 'backgroundColor'],
  ['userMessage', 'color'],
  ['userMessage', 'backgroundColor'],
];

function resolve(theme?: Partial<AsgardThemeContextValue>): AsgardThemeContextValue {
  let seen!: AsgardThemeContextValue;

  function Probe(): ReactNode {
    seen = useAsgardThemeContext();

    return null;
  }

  render(
    <AsgardThemeContextProvider theme={theme}>
      <Probe />
    </AsgardThemeContextProvider>,
  );

  return seen;
}

describe('asgard-sdk-pm#52 theme default layer', () => {
  afterEach(cleanup);

  it('keeps every default reachable when no annotations and no props theme are supplied', () => {
    const resolved = resolve();

    for (const [group, key] of CLOBBERED) {
      const actual = (resolved[group] as Record<string, unknown> | undefined)?.[key];
      const expected = (defaultAsgardThemeContextValue[group] as Record<string, unknown>)[key];

      expect(actual, `${String(group)}.${key} was clobbered`).toBe(expected);
    }
  });

  it('still lets the props theme win over the default', () => {
    const resolved = resolve({ botMessage: { color: '#123456' } });

    expect(resolved.botMessage?.color).toBe('#123456');
    // …without knocking out its sibling default.
    expect(resolved.botMessage?.backgroundColor).toBe(defaultAsgardThemeContextValue.botMessage?.backgroundColor);
  });
});
