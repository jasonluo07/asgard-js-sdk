import { LaunchedSandbox } from '../types';

/**
 * Normalize a raw `/channel/metadata` `launchedSandboxes[]` snapshot into a stable live list (F-019 /
 * UC-032): dedup by `sandboxName` (metadata should not repeat, but a defensive dedup keeps the UI stable)
 * and sort by display label (`sandboxBlueprintName || sandboxName`) so a different backend ordering never
 * makes a downstream dropdown jump. metadata is the sole authority on "who is live" — this folds in no
 * SSE-derived guesses. Never mutates the input.
 */
export function reconcileLaunched(metadata: readonly LaunchedSandbox[]): LaunchedSandbox[] {
  const byName = new Map<string, LaunchedSandbox>();
  for (const sandbox of metadata) byName.set(sandbox.sandboxName, sandbox); // last write wins: same name → latest snapshot

  return [...byName.values()].sort((a, b) =>
    (a.sandboxBlueprintName || a.sandboxName).localeCompare(b.sandboxBlueprintName || b.sandboxName),
  );
}
