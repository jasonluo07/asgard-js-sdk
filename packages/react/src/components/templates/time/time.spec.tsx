import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Time } from './time';

describe('Time', () => {
  // The component survives only so existing callers keep compiling (#422). If it ever renders again,
  // every consumer that still has a `<Time />` in a composed message row silently gets a timestamp
  // back — and the value would be the frame's arrival time, which a rejoin rewrites to "now".
  it('renders nothing even when handed a date', () => {
    expect(renderToStaticMarkup(<Time time={new Date('2026-08-12T00:00:00.000Z')} />)).toBe('');
  });

  it('renders nothing when handed no date', () => {
    expect(renderToStaticMarkup(<Time />)).toBe('');
  });
});
