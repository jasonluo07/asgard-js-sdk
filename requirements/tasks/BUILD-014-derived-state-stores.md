# BUILD-014 Derived-State Stores (framework-agnostic Task / Subagent stores)

## Meta

- Task ID: `BUILD-014`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/13`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-013-衍生狀態以-framework-agnostic-store-對外暴露.md` (+ `use-cases/UC-021` accumulate into core + ChannelStates, `UC-022` per-slice store + framework adapters). Pure data-layer / API design — no prototype.
- Complexity: `L`

---

## Brief

SDK consumers often want to render the **Task List (F-010) / Subagent List (F-012) outside the Chatbot** component, in any framework. Expose these derived states as a **reactive store** — a current immutable snapshot + change notification — **not** a fire-and-forget delta event (a store lets late subscribers get the full picture and keeps accumulation inside the SDK). The accumulation reducers already live in `@asgard-js/core` (`reduceTaskEvents` F-010, `reduceSubagents` F-012); this ticket wires them into `Channel`, fed by the same SSE flow, and exposes per-slice stores.

**Core work:** add framework-agnostic `deriveTasks(conversation)` / `deriveSubagents(conversation)` (moving the react `conversationToSubagentEvents` adapter into core) + structural-equality `tasksEqual` / `subagentsEqual`; a `createDerivedStores(conversation$)` factory (BehaviorSubject slices with `distinctUntilChanged`); wire it into `Channel` (`tasks$` / `subagents$` + snapshot accessors), add `tasks` / `subagents` to `ChannelStates` (existing `statesObserver` gets them for free). **React work:** `useTaskList(channel)` / `useSubagents(channel)` via `useSyncExternalStore`; refactor the F-010/F-012 footer panels to call the shared `deriveTasks` / `deriveSubagents` (dedup, no behavior change). **Docs:** a framework-adapter guide (React / Vue / Svelte / Angular / vanilla).

**The key performance property:** `conversation` changes on every message delta (high frequency). `tasks$` / `subagents$` must **only emit when that slice actually changes** (`distinctUntilChanged` on structural equality), so a consumer that "just wants to draw the list" isn't re-rendered on every delta.

**Scope this cycle (F-013):** the two slice stores + ChannelStates + framework-agnostic contract + React hooks + docs. **Not this cycle:** no `taskListChanged`-style delta event (explicit non-goal); channel-title store (F-016); refactoring the footer to _consume_ the channel stores (preview-mode demos have no channel — the footer keeps deriving from `conversation`, just via the shared helper).

**Already exists:** `reduceTaskEvents` / `isTaskTool` / `Task` (F-010); `reduceSubagents` / `isAgentTool` / `isSubagentChildTool` / `Subagent` (F-012); react `conversationToSubagentEvents` adapter (to be moved to core); `Channel` with `conversation$` / `isConnecting$` `combineLatest` → `statesObserver`; `ChannelStates { isConnecting, conversation }`; `use-channel.ts` bridges states → React state.

---

## Relevant Rules

| §    | Rule (summary)                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — equality comparators + derivation typed against `Task` / `Subagent`                          |
| §1.5 | Every subscription torn down — `createDerivedStores` returns a teardown; `Channel.close` calls it       |
| §1.6 | core stays framework-agnostic — stores are RxJS only; the React hook lives in `@asgard-js/react`        |
| §1.7 | Additive only — `ChannelStates` gains `tasks` / `subagents`; new exports; no breaking change            |
| §2.2 | Export the new public API (`deriveTasks`, `deriveSubagents`, hooks) from the package entries            |
| §3.3 | RxJS: slices via `BehaviorSubject` + `distinctUntilChanged`; expose `Observable<T>` with explicit `T`   |
| §7   | Replay-safe: derivation is a pure fold over the conversation; a reconnect replay yields the same slices |

---

## Acceptance Criteria

- `R1` (Derive in core) `deriveTasks(conversation): Task[]` and `deriveSubagents(conversation): Subagent[]` wrap the existing reducers (the `conversationToSubagentEvents` adapter moves into core); each produces a **new immutable reference** on change. → T1
- `R2` (ChannelStates) `ChannelStates` gains `tasks: Task[]` / `subagents: Subagent[]`; the `combineLatest` feeding `statesObserver` includes them, so existing consumers read `states.tasks` / `states.subagents` with zero changes. → T2, T3
- `R3` (Per-slice stores) `Channel` exposes `tasks$` / `subagents$` (`BehaviorSubject` + `distinctUntilChanged` by structural equality): they emit **only when the slice changes**, not on every `conversation` delta; late subscribers immediately replay the current snapshot. → T2, T4
- `R4` (Framework-agnostic contract) `Channel` exposes the slices as `Observable<Task[]>` / `Observable<Subagent[]>` plus `getTasks()` / `getSubagents()` snapshot accessors — no React dependency. → T2
- `R5` (React adapter) `useTaskList(channel)` / `useSubagents(channel)` implemented with `useSyncExternalStore(subscribe, getSnapshot)`; a null channel yields `[]`; exported from `@asgard-js/react`. → T5
- `R6` (Footer dedup) the F-010 `TaskList` / F-012 `SubagentList` footer derivations call the shared `deriveTasks` / `deriveSubagents` (no behavior change; still works in preview mode). → T5
- `R7` (Docs, no delta event) a framework-adapter guide (`docs/`) shows React / Vue / Svelte / Angular / vanilla bridging; documents that the contract is a store (snapshot + subscribe), **not** a delta event. → T6
- `R8` (Smoke) build green; core Vitest (`deriveTasks` / `deriveSubagents` correctness + replay; `tasksEqual` / `subagentsEqual`; `createDerivedStores`: a non-task/non-subagent conversation delta does **not** emit on `tasks$` / `subagents$`, a real change does; late-subscriber replay); a scoped demo rendering the lists **outside** the Chatbot via the hooks against a stepped `conversation$`, with render-count badges proving no re-render on unrelated deltas; screenshot to `.github/screenshots/f-013/`. → T4, T7

---

## Implementation Tasks

- [x] T1 (R1): core `packages/core/src/lib/derived-stores.ts` — moved `conversationToSubagentEvents` here; added `deriveTasks(conversation)` / `deriveSubagents(conversation)` + `tasksEqual` / `subagentsEqual` (structural, no `any`). Exported from the core entry.
- [x] T2 (R2, R3, R4): `createDerivedStores(conversation$): { tasks$, subagents$, getTasks, getSubagents, teardown }` (BehaviorSubject + `map(deriveX)` + `distinctUntilChanged(xEqual)`). Wired into `Channel`: stores built from `conversation$` in the constructor; `tasks$` / `subagents$` added to the states `combineLatest`; public `tasks$` / `subagents$` (Observable) + `getTasks()` / `getSubagents()`; `teardown` called in `close()`.
- [x] T3 (R2): `types/channel.ts` — `ChannelStates` gains `tasks: Task[]` / `subagents: Subagent[]`.
- [x] T4 (R3, R8): core Vitest `derived-stores.spec.ts` (9 tests) — derive correctness + empty; equality comparators; `createDerivedStores`: unchanged-tasks delta does **not** emit on `tasks$`, a real change does; subagent-slice isolation; late-subscriber replay; teardown stops derivation. **56/56 core tests pass**.
- [x] T5 (R5, R6): react `hooks/use-derived-state.ts` — `useTaskList(channel)` / `useSubagents(channel)` via `useSyncExternalStore` (null channel → stable `[]`); exported. `chatbot-footer.tsx` refactored to `deriveTasks(conversation)` / `deriveSubagents(conversation)`; `conversation` added to the service context; deleted the react `subagent-events.ts` (moved to core).
- [x] T6 (R7): `docs/derived-state-stores.md` — store contract + the "store not delta event" rationale + React / Vue / Svelte / Angular / vanilla adapters.
- [x] T7 (R8): scoped `/derived-state` route — a stepper pushing cumulative conversation snapshots into a `conversation$`, rendering `useTaskList` / `useSubagents` (via a store-shaped channel stub) **outside** the Chatbot with `React.memo` panels + render-count badges. Browser-verified: Task panel 1→2→2→3→3, Subagent panel 1→1→1→1→2 — a bot-message step re-renders **neither** panel. lint + format + build green. Screenshot `.github/screenshots/f-013/derived-state.png`.

---

## Coverage

Use Cases: R1, R2, R3 (core Vitest), R4 (core Vitest slice-store), R5, R6, R7 (`/derived-state` demo + docs), R8 (build + Vitest + browser smoke)
Files:

- `packages/core/src/lib/derived-stores.ts` (core) — new: adapter + derive + equality + `createDerivedStores`
- `packages/core/src/lib/derived-stores.spec.ts` (core) — 9 new tests
- `packages/core/src/lib/channel.ts` (core) — `tasks$` / `subagents$` + snapshot accessors + states wiring + teardown
- `packages/core/src/types/channel.ts` (core) — `ChannelStates.tasks` / `.subagents`
- `packages/core/src/index.ts` (core) — export the derived-store API
- `packages/react/src/hooks/use-derived-state.ts` (react) — new: `useTaskList` / `useSubagents`
- `packages/react/src/hooks/index.ts` (react) — export the hooks
- `packages/react/src/context/asgard-service-context.tsx` (react) — expose `conversation`
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx` (react) — use the shared derive helpers
- `packages/react/src/components/chatbot/subagent-list/index.ts` (react) — drop the moved `subagent-events` re-export
- `packages/react/src/components/chatbot/subagent-list/subagent-events.ts` (react) — deleted (moved to core)
- `docs/derived-state-stores.md` — framework-adapter guide
- `apps/react-demo/src/app/routes/derived-state/*` (demo) — scoped route
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` (demo) — registration

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/13 (F-013 + UC-021/UC-022; pure data-layer, no prototype) (Status: `draft`).
- 2026-07-15: Implemented T1–T7. Core: `derived-stores.ts` (moved the subagent adapter in + `deriveTasks`/`deriveSubagents` + `tasksEqual`/`subagentsEqual` + `createDerivedStores`); `Channel` exposes `tasks$`/`subagents$` (Observable) + `getTasks()`/`getSubagents()`, wired into the states `combineLatest` + torn down in `close()`; `ChannelStates` gains `tasks`/`subagents`. React: `useTaskList`/`useSubagents` (`useSyncExternalStore`); footer uses the shared helpers via the newly-exposed context `conversation`; deleted the react adapter copy. Docs: framework-adapter guide (store-not-delta rationale). Core Vitest 56/56 (9 new; incl. the slice-isolation perf test). `/derived-state` demo browser-verified: render-count badges prove per-slice isolation (a bot-message delta re-renders neither panel). lint + format + build green (Status: `done`).
