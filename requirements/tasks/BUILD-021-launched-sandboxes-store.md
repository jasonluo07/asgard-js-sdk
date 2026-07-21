# BUILD-021 Consume launchedSandboxes + Expose via an Rx Store (Data Layer)

## Meta

- Task ID: `BUILD-021`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/27`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-019-consume-launchedsandboxes-並以-rx-通道對外暴露.md` (+ `use-cases/UC-032` / `UC-033`; prototype `useLaunchedSandboxes.ts`)
- Complexity: `M`

---

## Brief

`GET /channel/metadata` now also returns `launchedSandboxes: LaunchedSandbox[]` — the channel's currently-**live** sandboxes (Ready + within their shutdown lease), each `{ sandboxName, sandboxBlueprintName, workingDirectory, editorServerEnabled, browserEnabled }`. A channel may hold **several at once**, so it is always a set (never a singleton). metadata (heartbeat-backed) is the **sole authority** on "who is live"; the `asgard.sandbox.launch` SSE frame is only a hint. This is a **data-layer-only** feature: land the list in `@asgard-js/core` and expose it via the F-013 (UC-021) framework-agnostic per-slice store pattern — a `launchedSandboxes$` Rx channel (`BehaviorSubject` + `distinctUntilChanged`) on `Channel`, with a `useLaunchedSandboxes(channel)` React adapter. It re-emits on every metadata refetch, refetches on `visibilitychange → visible` + optional polling, and treats a `launch` frame as a pending hint that only becomes live once metadata confirms it. Shared truth for the F-020 handoff cards and F-021 File Explorer.

**Already exists:** F-013 `createDerivedStores` (per-slice + `distinctUntilChanged`); F-015 `ChannelMetadata` + `client.channelMetadata()` (200/404/throw gate); F-016 `channelTitle$` (the closest analog — a Channel-level metadata-seeded store, not conversation-derived); F-018 sandbox events (`SANDBOX_LAUNCH` fact `{ sandboxName, blueprintName }`) already flowing through `buildRunHandlers`; `useChannelTitle` React-adapter pattern. No `launchedSandboxes` field / store yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — `LaunchedSandbox` is fully typed                                                                                                                |
| §1.5 | Every RxJS subscription / timer / DOM listener has teardown (`close()` completes the subject; the hook's `setInterval` + `visibilitychange` clean up)      |
| §1.6 | `@asgard-js/core` never touches the DOM — the store + `refetchMetadata()` live in core; the `visibilitychange` / polling lifecycle lives in the React hook |
| §1.7 | Additive only — new optional `ChannelConfig.launchedSandboxes` + new fields; no breaking change                                                            |
| §2.3 | `LaunchedSandbox` + `ChannelMetadata.launchedSandboxes` types exist before the store / decode read them                                                    |
| §3.1 | Explicit return types on all new exports                                                                                                                   |
| §3.2 | Shared types in `core/src/types/channel.ts`; the pure `reconcileLaunched` reused by store + config seed                                                    |
| §6   | Reuse `reconcileLaunched` for both the config seed and every `applyLaunchedSandboxes`; one dedup/sort path                                                 |
| §7   | Replay-safe: live = latest metadata snapshot; a `launch` frame never bypasses metadata to mutate the live set                                              |

---

## Acceptance Criteria

- `R1` (AC1) `ChannelMetadata` gains `launchedSandboxes: LaunchedSandbox[]`; `client.channelMetadata()` whitelist-decodes the five backend fields (defaults to `[]` for an old backend). → T1, T2
- `R2` (AC2) `Channel` exposes a `launchedSandboxes$` per-slice store (`BehaviorSubject` + `distinctUntilChanged`) + `getLaunchedSandboxes()`; the snapshot is always an array, deduped by `sandboxName` and sorted by `sandboxBlueprintName || sandboxName`; folded into `ChannelStates`. → T3, T4
- `R3` (AC3) React `useLaunchedSandboxes(channel)` bridges the store via `useSyncExternalStore`; a late subscriber gets the current full snapshot; a null channel yields a stable `[]`. → T5
- `R4` (AC4) Every `applyLaunchedSandboxes` authoritatively replaces the list and emits once; a high-frequency message-delta run never re-emits the slice. → T3
- `R5` (AC5) `channel.refetchMetadata()` re-fetches metadata and applies its `launchedSandboxes`; the hook fires it on `visibilitychange → visible` and on an optional poll interval. → T3, T6
- `R6` (AC6) A `sandbox.launch` frame is recorded as pending + schedules a refetch (never merged into live directly); metadata confirmation promotes it to live and clears pending; an unconfirmed launch stays pending. → T3, T4
- `R7` (Smoke) build green; core Vitest covers reconcile (dedup/sort), decode whitelist, store seed/apply/emit/per-slice, drop, launch-hint → pending → refetch → promote, and the ChannelStates fold. Browser verification of the UI is deferred to its first consumer (F-021), mirroring F-016 → F-017. → T7

---

## Implementation Tasks

- [x] T1 (R1): `types/channel.ts` — `LaunchedSandbox` interface (5 fields); `ChannelMetadata.launchedSandboxes`; `ChannelStates.launchedSandboxes`; `ChannelConfig.launchedSandboxes?` seed.
- [x] T2 (R1): `client.ts` `channelMetadata()` — whitelist-map `launchedSandboxes` (5 fields), default `[]`.
- [x] T3 (R2, R4, R5, R6): `lib/launched-sandboxes.ts` — pure `reconcileLaunched` (dedup by name, sort by label). `channel.ts` — `launchedSandboxesSubject` seeded via `reconcileLaunched(config)`; `launchedSandboxes$` (distinct) + `getLaunchedSandboxes()`; `applyLaunchedSandboxes` / `dropSandbox` / `noteSandboxLaunch` / `getPendingLaunches` / `refetchMetadata`; wire `SANDBOX_LAUNCH` → `noteSandboxLaunch`; fold into `ChannelStates`; complete on `close()`. Export `reconcileLaunched` from the core entry.
- [x] T5 (R3): `react/src/hooks/use-derived-state.ts` — `useLaunchedSandboxes(channel, { pollMs = 15000, refetchOnVisible = true })`: `useSyncExternalStore` snapshot bridge + the DOM-bound `visibilitychange` / poll lifecycle calling `channel.refetchMetadata()`.
- [x] T7 (R7): core Vitest — `launched-sandboxes.spec.ts` (5: reconcile empty / sort / name fallback / dedup last-wins / no-mutate); `channel.spec.ts` +10 (seed, apply-replaces-and-emits, late-subscriber replay, per-slice no re-emit on delta, drop, launch→pending→refetch→promote, launch-frame-in-run, refetchMetadata applies, unconfirmed stays pending, ChannelStates fold); `client.spec.ts` +2 (decode 5 fields / absent → `[]`). **Core Vitest 101/101 (+17).**
- [x] T8: `npm run lint:packages` ✅ + `npm run build:core && npm run build:react` ✅ (both green).

---

## Coverage

Use Cases: R1 (core Vitest — client + types), R2/R4/R6 (channel.spec), R3 (build type-check + hook mirrors useChannelTitle), R5 (channel.spec refetch + hook lifecycle), R7 (build + Vitest)
Files:

- `packages/core/src/types/channel.ts` (core) — `LaunchedSandbox`, `ChannelMetadata.launchedSandboxes`, `ChannelStates.launchedSandboxes`, `ChannelConfig.launchedSandboxes?`
- `packages/core/src/lib/launched-sandboxes.ts` (core) — pure `reconcileLaunched`
- `packages/core/src/lib/launched-sandboxes.spec.ts` (core) — 5 tests
- `packages/core/src/lib/client.ts` (core) — `channelMetadata` decodes `launchedSandboxes`
- `packages/core/src/lib/client.spec.ts` (core) — +2 tests (+ 2 existing `toEqual` updated for the new field)
- `packages/core/src/lib/channel.ts` (core) — `launchedSandboxes$` store + methods + `SANDBOX_LAUNCH` wiring + `ChannelStates` fold
- `packages/core/src/lib/channel.spec.ts` (core) — +10 tests
- `packages/core/src/index.ts` (core) — export `reconcileLaunched`
- `packages/react/src/hooks/use-derived-state.ts` (react) — `useLaunchedSandboxes` + `UseLaunchedSandboxesOptions`

---

## Execution Log / Change Log

- 2026-07-22: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/27 (F-019 + UC-032/033) (Status: `draft`).
- 2026-07-22: Implemented T1–T8 via TDD (reconcile / channel store / client decode each written test-first). Core store models F-016 `channelTitle$` (metadata-seeded Channel-level subject, not conversation-derived); core owns the store + `refetchMetadata()` + launch wiring, the React hook owns the DOM-bound `visibilitychange` / polling lifecycle (§1.6). Core Vitest 101/101 (+17). lint + build green. Browser verification deferred to F-021 (first UI consumer), per F-016 → F-017 precedent (Status: `done`).
