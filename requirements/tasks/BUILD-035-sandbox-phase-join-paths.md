# BUILD-035 Wire sandboxPhase into the init and restore join paths

## Meta

- Task ID: `BUILD-035`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/42`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/bugs/BUG-006-launch-hud-在-init-與-restore-進房路徑永遠不顯示-sandboxphase-只接了-resetchannel.md` (via PR asgard-sdk-pm#43, not yet merged at plan time)
- Complexity: `M`

---

## Brief

`useChannel` (`packages/react/src/hooks/use-channel.ts`) has three channel-creation paths — `resetChannel`, `initChannel`, `restoreChannel` — each with its own inline `statesObserver`. Only `resetChannel`'s observer (line 176) forwards `states.sandboxPhase` to `setSandboxPhase`; `initChannel` (248-253) and `restoreChannel` (292-297) omit it, so `sandboxPhase` stays stuck at the `useState` initial value `'idle'` on those two paths, and `SandboxLaunchHud` (F-018) never appears — even though `Channel.updateSandboxPhase()` (core, correct, not touched) is emitting `'launching'`/`'ready'` underneath. Fix: extract one shared `statesObserver` factory used by all three paths, so the field can't be wired into only one path again. React-only; no public API change; core untouched.

**Already exists:** `packages/react/src/hooks/use-channel.ts` (three creation paths + `sandboxPhase` state), `packages/core/src/lib/channel.ts` `updateSandboxPhase()` / `sandboxPhase$` (correct, not modified), `packages/react/src/hooks/use-sandbox-launch.ts` + `sandbox-launch-hud.tsx` (consume `sandboxPhase`, not modified), `apps/react-demo/src/app/routes/join-init/join-init.tsx` (F-015 demo route covering exactly the three join branches — reused for verification, not modified), `apps/react-demo/src/mock-server/sse-mock.ts` `sandboxFact()` helper (reused for the new mock timelines).

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.4 | No hardcoded API key / endpoint / namespace — pass via `config`                                                           |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)            |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §2.3 | Template type (`core/src/types/sse-response.ts`) + enum (`core/src/constants/enum.ts`) exist before the react component   |
| §2.4 | Use `botProviderEndpoint`, not the deprecated `endpoint`                                                                  |
| §3.1 | Exported functions / methods declare explicit return types                                                                |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                       |
| §4.1 | React component props fully typed (no `any`)                                                                              |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context                                         |
| §4.4 | `react` / `react-dom` stay peerDependencies (not bundled)                                                                 |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                     |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When `initChannel()` creates a channel (F-015 R4/R6 join branch, `autoResetChannel={false}` + no existing channel, or a metadata-fetch error) and the underlying `Channel`'s `sandboxPhase$` emits `'launching'` then `'ready'`, `useChannel()`'s returned `sandboxPhase` shall track that value instead of staying `'idle'`. → T1, T2
- `R2` When `restoreChannel()` creates a channel (F-015 R2 join branch, an existing channel being rejoined) and the underlying `Channel`'s `sandboxPhase$` emits `'launching'` then `'ready'`, `useChannel()`'s returned `sandboxPhase` shall track that value instead of staying `'idle'`. → T1, T2
- `R3` The three channel-creation paths (`resetChannel`, `initChannel`, `restoreChannel`) shall all wire their `statesObserver` through one shared factory, so `resetChannel`'s already-correct behavior is preserved and no future `ChannelStates` field can be wired into only one path. → T1, T3
- `R4` A test suite (`packages/react/src/hooks/use-channel.spec.ts`, using `@testing-library/react`'s `renderHook` + `act` against a scripted mock `IAsgardServiceClient`) shall assert, independently for **each** of the three creation paths (`initChannel`, `restoreChannel`, `resetChannel`), that a `sandbox.launch` → `sandbox.ready` event pair drives the hook's returned `sandboxPhase` from `'idle'` → `'launching'` → `'ready'`. → T4, T5
- `R5` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, then opens the react-demo's Join-Init route (`npm run serve:react-demo`, http://localhost:4200, `/join-init`) with the mock server's "① 已存在頻道 → restore" and "③ 不存在 + 不 autoReset → 空狀態" scenarios extended to emit `asgard.sandbox.launch` → gap → `asgard.sandbox.ready`, the system shall show the Launch HUD during the cold-start gap on both scenarios, with no build errors. → T6, T7, T8

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R2, R3): In `use-channel.ts`, extract a shared `statesObserver` factory (stable via `useCallback`, or a plain module-level function taking the five setters) that sets `isConnecting`, `runStatus`, `conversation`, `channelTitle`, `sandboxPhase` from a `ChannelStates` argument.
- [x] T2 (R1, R2): Wire the shared factory into `initChannel`'s `Channel.create` config and `restoreChannel`'s `Channel.restore` config, replacing their partial inline observers.
- [x] T3 (R3): Replace `resetChannel`'s inline observer with the same shared factory (behavior-preserving; removes the last duplicate copy).
- [x] T4: Add `@testing-library/react` as a devDependency (root `package.json`; compatible with the installed React 18/peer range `^18.0.0 || ^19.0.0`) — needed because the existing `renderToStaticMarkup`-only test pattern in this package can't observe state updates after calling an exposed hook method (no reconciler driving re-renders).
- [x] T5 (R4): Add `packages/react/src/hooks/use-channel.spec.ts` — `renderHook` the hook with a scripted mock `IAsgardServiceClient` (mirroring core's `mockClient`/`restoreMockClient` pattern in `packages/core/src/lib/channel.spec.ts`), one test per path (`initChannel` + `sendMessage`, `restoreChannel`'s rejoin stream, `resetChannel`'s reset stream), asserting every path transitions from `'idle'` to `'launching'` and then `'ready'`; scope the jsdom environment to this file only (`// @vitest-environment jsdom` pragma) rather than changing the package-wide default.
- [x] T6 (R5): In `apps/react-demo/src/mock-server/sse-mock.ts`, extend the join-init "① 已存在頻道" (`join-existing-demo`) and "③ 不存在 + 不 autoReset" (`join-new-noreset-demo`) channel handlers to emit `asgard.sandbox.launch` → gap → `asgard.sandbox.ready` around their reply (reuse `sandboxFact()`, mirror `sandbox-hud-demo`'s timing).
- [x] T7: Run `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react`.
- [x] T8 (R5): Smoke check — ran `npm run test:react` (green) and drove the Join-Init route scenarios ①③ live via Playwright (real cold-start send, not just wire inspection). The Launch HUD renders correctly on both: `.asgard-sandbox-hud` mounts ~1.1–1.2s after send with `aria-label="Starting sandbox"`, matching the 1s threshold. See note below for a testing-methodology correction.

**Note on R5 / T8 — earlier false-negative retracted:** a first verification pass (two separate tool calls — trigger, then a later poll) never found the HUD and looked like a pre-existing regression reproducing even on the untouched `/sandbox-hud` route and the already-correct `resetChannel` path; a git-stash-and-rebuild check even seemed to confirm it predated this diff. The user pointed out F-018's original PR (#331) was explicitly Playwright-verified at merge, which prompted a re-check. The real cause was the verification method: the gap between two separate tool round-trips (trigger call, then a separate poll call) was large enough to run past the HUD's whole ~1.1s–4.1s display window before polling ever started, so every "not found" was a measurement artifact, not a real absence. Redone as one atomic browser-JS call (trigger + poll in the same execution, no inter-call gap) against a commit checked out at the original F-018 merge (`f78decf9`), it showed correctly; redone the same way against this branch's `main`, both `/sandbox-hud` (`resetChannel`) and Join-Init ①③ (`restoreChannel` / `initChannel`) all show correctly. F-018 has no regression — the HUD works on all three paths. No separate bug ticket needed.

---

## Coverage

Use Cases: UC-024 (restore join), UC-026 (init/no-auto-reset join), UC-029 (Launch HUD display threshold — react-hook wiring only, not the HUD's own rendering)
Files:

- `packages/react/src/hooks/use-channel.ts` (react) — shared `makeStatesObserver` factory; wired into `resetChannel`, `initChannel`, `restoreChannel`
- `packages/react/src/hooks/use-channel.spec.ts` (react, new) — 3 tests, one per creation path
- `apps/react-demo/src/mock-server/sse-mock.ts` (demo) — `handleSandboxHudMock` parameterized by `customChannelId`; new scoped branches for `join-existing-demo` / `join-new-noreset-demo`
- `package.json` / `package-lock.json` (root) — added `@testing-library/react` devDependency
- `.github/screenshots/bug-006-init-hud-headed.png` — headed Chrome evidence of the init/no-auto-reset HUD in its launching state
- `references/asgard-sdk-pm` — refreshed reference pin after BUG-006 spec PR #43 merged

---

## Execution Log / Change Log

- 2026-07-30: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/42 (Status: `draft`).
- 2026-07-30: Plan confirmed by user (install `@testing-library/react` for real per-path `renderHook` tests; extend join-init mock for browser verification) (Status: `draft → ready`).
- 2026-07-30: Implementation started (Status: `ready → in-progress`).
- 2026-07-30: T1–T7 complete; `lint:packages` / `format:check` / `typecheck:packages` / `build:core` / `build:react` / `test:packages` all green. T8 smoke check: `use-channel`'s `sandboxPhase` wiring confirmed correct (Vitest fail-before/pass-after on all 3 paths); an initial browser pass falsely looked like a pre-existing HUD regression, later retracted after correcting a tool-round-trip timing flaw in the verification method — re-verified with an atomic trigger+poll against both the original F-018 commit and this branch's `main`, HUD renders correctly on all paths, no regression, no separate ticket needed (Status: `in-progress → done`).
- 2026-07-31: Independent re-review found that the original tests only asserted the terminal `'ready'` value even though R4 requires the intermediate `'launching'` transition. Reworked the scripted client to pause each transport between launch and ready, added explicit `idle → launching → ready` assertions for init/restore/reset, and re-ran all checks. Headed Chrome verification recorded the HUD at ~1.13s, ready at ~2.72s, and removed at ~4.19s on all three paths (Status remains `done`).
