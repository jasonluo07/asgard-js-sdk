import { describe, it, expect } from 'vitest';
import { reconcileLaunched } from './launched-sandboxes';
import type { LaunchedSandbox } from '../types';

// F-019 / UC-032 — reconcileLaunched normalizes a raw `/channel/metadata` launchedSandboxes[] snapshot
// into a stable live list: dedup by sandboxName (metadata should not repeat, but defensive), sorted by
// display label (sandboxBlueprintName || sandboxName) so downstream dropdowns don't jump when the
// backend returns a different order. metadata is the sole authority — no SSE-derived guessing here.

function sandbox(overrides: Partial<LaunchedSandbox> & { sandboxName: string }): LaunchedSandbox {
  return {
    sandboxBlueprintName: '',
    workingDirectory: '/work',
    editorServerEnabled: false,
    browserEnabled: false,
    ...overrides,
  };
}

describe('reconcileLaunched (F-019 / UC-032)', () => {
  it('returns an empty array for an empty snapshot', () => {
    expect(reconcileLaunched([])).toEqual([]);
  });

  it('sorts by display label (blueprintName || name)', () => {
    const result = reconcileLaunched([
      sandbox({ sandboxName: 'z', sandboxBlueprintName: 'Charlie' }),
      sandbox({ sandboxName: 'a', sandboxBlueprintName: 'Alpha' }),
      sandbox({ sandboxName: 'm', sandboxBlueprintName: 'Bravo' }),
    ]);
    expect(result.map(s => s.sandboxName)).toEqual(['a', 'm', 'z']);
  });

  it('falls back to sandboxName for sorting when blueprintName is empty', () => {
    const result = reconcileLaunched([
      sandbox({ sandboxName: 'delta', sandboxBlueprintName: '' }),
      sandbox({ sandboxName: 'bravo', sandboxBlueprintName: '' }),
    ]);
    expect(result.map(s => s.sandboxName)).toEqual(['bravo', 'delta']);
  });

  it('dedups by sandboxName, keeping the last occurrence (latest snapshot wins)', () => {
    const result = reconcileLaunched([
      sandbox({ sandboxName: 'dup', workingDirectory: '/old' }),
      sandbox({ sandboxName: 'dup', workingDirectory: '/new' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].workingDirectory).toBe('/new');
  });

  it('does not mutate the input array', () => {
    const input = [sandbox({ sandboxName: 'b' }), sandbox({ sandboxName: 'a' })];
    const snapshot = [...input];
    reconcileLaunched(input);
    expect(input).toEqual(snapshot);
  });
});
