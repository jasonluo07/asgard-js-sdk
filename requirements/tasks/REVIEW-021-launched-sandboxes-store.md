# REVIEW-021 Consume launchedSandboxes + Expose via an Rx Store (Data Layer)

## Meta

- Task ID: `REVIEW-021`
- Status: `done`
- BUILD Task: `BUILD-021`
- Reviewed commit: `<filled at PR>`
- Reviewed branch: `feat/27-launched-sandboxes-store`

---

## §1 Static Code Review

Data-layer feature (core store + client decode + one React adapter hook). No UI component, no styling, no new user-facing text.

### §1.1 Checklist

| Check item                                                                                                                                             | Rule                         | Result   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | -------- |
| No `any` / `as any` (the `as unknown` casts are confined to existing test fixtures)                                                                    | FRONTEND_RULE_COMMON §4.1    | ✅       |
| No `eslint-disable` / `@ts-ignore`                                                                                                                     | FRONTEND_RULE_COMMON §4.2    | ✅       |
| `@asgard-js/core` does not import react / DOM (store + `refetchMetadata` are DOM-free; `visibilitychange` / `setInterval` live only in the React hook) | FRONTEND_RULE_COMMON §1.6    | ✅       |
| Every subscription / timer / listener torn down (`close()` completes the subject; hook cleans up interval + listener)                                  | FRONTEND_RULE_COMMON §1.5    | ✅       |
| Additive only; no breaking public-API change                                                                                                           | FRONTEND_RULE_COMMON §1.7    | ✅       |
| Shared types centralized in `core/src/types/`; `reconcileLaunched` reused (seed + apply)                                                               | FRONTEND_RULE_COMMON §3.2 §6 | ✅       |
| Explicit return types on new exports                                                                                                                   | FRONTEND_RULE_COMMON §3.1    | ✅       |
| No hardcoded color / `<style>` / magic numbers                                                                                                         | §1.1–§1.4                    | ✅ (n/a) |
| No `console.log` / no untracked TODO-FIXME                                                                                                             | FRONTEND_RULE_COMMON §7      | ✅       |

### §1.2 Mechanical Grep

```bash
grep -rn 'as any\|@ts-ignore\|eslint-disable\|console\.log' \
  packages/core/src/types/channel.ts packages/core/src/lib/launched-sandboxes.ts \
  packages/core/src/lib/channel.ts packages/core/src/lib/client.ts \
  packages/react/src/hooks/use-derived-state.ts
```

Grep results:

```
(empty)
```

### §1.3 TypeScript and Lint

```bash
npm run build:core && npm run build:react   # tsc via Vite build
npm run lint:packages
```

Results:

```
build: PASS — core + react built, no type errors
lint:  PASS — Successfully ran target lint for 2 projects (Nx Cloud 401 is a cloud-cache warning, not a lint failure)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked ✅
- [x] No ❌ violations
- [x] §1.2 grep run — empty output
- [x] Build (tsc) — no TypeScript errors
- [x] `npm run lint:packages` — no ESLint errors

---

## §3 Functional Validation

Data-layer feature — validated by core Vitest against every AC (no running server; the UI that consumes this store arrives in F-021, verified in the browser there, mirroring the F-016 → F-017 split).

### R# Result Matrix

| R#  | Description                                                                        | Result | Note                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `ChannelMetadata.launchedSandboxes` + client whitelist-decode (5 fields)           | Pass   | client.spec: decodes 5 fields; absent → `[]`.                                                                                        |
| R2  | `launchedSandboxes$` per-slice store + getter, deduped/sorted, in ChannelStates    | Pass   | channel.spec: seed reconciled, snapshot sorted, ChannelStates fold.                                                                  |
| R3  | `useLaunchedSandboxes` snapshot bridge; late subscriber full snapshot; null → `[]` | Pass   | Mirrors `useChannelTitle` (`useSyncExternalStore`); build type-checks; late-subscriber replay tested at the store level.             |
| R4  | `applyLaunchedSandboxes` authoritative replace + emit once; per-slice              | Pass   | channel.spec: replaces not merges; message-delta run does not re-emit the slice.                                                     |
| R5  | `refetchMetadata` applies fetched list; hook fires on visible / poll               | Pass   | channel.spec: `refetchMetadata` applies; hook lifecycle wires `visibilitychange` + `setInterval` → `refetchMetadata` (DOM side).     |
| R6  | launch = pending hint + refetch, never direct-merge; promote on confirm            | Pass   | channel.spec: `noteSandboxLaunch` + in-run `SANDBOX_LAUNCH` → pending + refetch; confirmed → live, unconfirmed stays pending (ALT3). |
| R7  | Build green; core Vitest covers all ACs                                            | Pass   | Core Vitest **101/101** (+17); build core+react green.                                                                               |

### §3.1 Acceptance

- [x] All R# executed (static read + core Vitest)
- [x] Each R# marked Pass
- [x] Boundary: empty snapshot (old backend / empty channel), dedup last-wins, unconfirmed launch (pending held) all covered

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- Browser/demo verification is deferred to F-021 (the first UI consumer of `launchedSandboxes$`) — consistent with the F-016 (data layer) → F-017 (UI) precedent.
- `pendingLaunches` is exposed as a snapshot getter (`getPendingLaunches()`), not a reactive store; F-021 can promote it to a store if it needs to render a reactive "starting" placeholder.

---

## Execution Log

- 2026-07-22: REVIEW task created, paired with BUILD-021 (Status: `draft`).
- 2026-07-22: §1 static + §3 functional complete — 9 ✅ / 0 ❌; all R# Pass; core Vitest 101/101; build + lint green (Status: `done`).
