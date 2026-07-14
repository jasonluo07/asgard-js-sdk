# REVIEW-014 Derived-State Stores

## Meta

- Task ID: `REVIEW-014`
- Status: `done`
- BUILD Task: `BUILD-014`
- Reviewed commit: working tree on `5c80f33` (F-013 delta, pre-commit)
- Reviewed branch: `feat/f-013-derived-state-stores`

---

## §1 Static Code Review

Scope: BUILD-014 `## Coverage` files (F-013 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                                       |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean in library code; the demo store-stub uses `as unknown as Channel` (harness, not `as any`)                       |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | the one `eslint-disable` (footer:621) is **pre-existing** export-handler code, not in the F-013 diff                       |
| No `console.*` (own code)                               | ✅     | grep clean                                                                                                                 |
| No `setTimeout` / `setInterval` residue (§7)            | ✅     | grep clean                                                                                                                 |
| Subscriptions torn down (§1.5)                          | ✅     | `createDerivedStores` returns `teardown` (unsubscribes both slice pipes); `Channel.close()` calls it                       |
| core stays framework-agnostic (§1.6)                    | ✅     | `derived-stores.ts` / `channel.ts` import no react/react-dom; stores are RxJS only; the hook lives in react                |
| Additive only (§1.7)                                    | ✅     | `ChannelStates` gains `tasks` / `subagents`; new exports; the moved adapter kept its core export — no breaking             |
| New public API exported from entry (§2.2)               | ✅     | `deriveTasks` / `deriveSubagents` / `createDerivedStores` / … from core `index.ts`; hooks from react `hooks/`              |
| RxJS slices typed + distinctUntilChanged (§3.3)         | ✅     | `tasks$` / `subagents$` are `Observable<Task[]>` / `Observable<Subagent[]>` via `BehaviorSubject` + `distinctUntilChanged` |
| Explicit return types (§3.1)                            | ✅     | `deriveTasks(): Task[]`, `createDerivedStores(): DerivedStores`, `getTasks(): Task[]`, hooks `: Task[]`                    |
| Replay-safe (§7)                                        | ✅     | derivation is a pure fold; a reconnect replay yields the same slices; late subscribers replay the snapshot                 |

### §1.2 Grep (F-013 scope)

```
[: any / as any / <any>]        (none in library; demo uses `as unknown as`)
[@ts-ignore / eslint-disable]   1 hit → pre-existing footer export handler (not F-013)
[console.*]                     (none)
[setTimeout / setInterval]      (none)
[core: from 'react' / react-dom](none)
[teardown / unsubscribe]        present in createDerivedStores + Channel.close
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green (vite dts type check authoritative).

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

R1/R2/R3 via core Vitest (`derived-stores.spec.ts` 9 new; **56/56 core tests pass**). R4/R5/R6/R7 via the scoped `/derived-state` route (Playwright MCP) + the docs guide.

### R# Result Matrix

| R#  | Description                                            | Result | Note                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | deriveTasks / deriveSubagents in core (new reference)  | Pass   | Vitest: fold correctness + empty; each call returns a fresh array                                                                                                                                                         |
| R2  | ChannelStates gains tasks / subagents                  | Pass   | Type + `Channel.subscribe` includes `tasks$` / `subagents$` in the states `combineLatest`; `statesObserver` gets `{isConnecting, conversation, tasks, subagents}`                                                         |
| R3  | slice stores emit only on real change; late replay     | Pass   | Vitest: an unchanged-tasks conversation delta does **not** emit on `tasks$`; a real change does; a late subscriber replays; subagent slice isolated                                                                       |
| R4  | framework-agnostic Observable + getSnapshot            | Pass   | `Channel.tasks$` / `subagents$` (`Observable`) + `getTasks()` / `getSubagents()`; no React dependency in core                                                                                                             |
| R5  | useTaskList / useSubagents (useSyncExternalStore)      | Pass   | DOM: two `React.memo` panels **outside** the Chatbot consume the hooks; render badges bump only when their slice changes                                                                                                  |
| R6  | footer derivations use the shared helpers (no regress) | Pass   | footer calls `deriveTasks(conversation)` / `deriveSubagents(conversation)` via the newly-exposed context `conversation`; F-010/F-012 demos still render                                                                   |
| R7  | docs: framework adapters + store-not-event rationale   | Pass   | `docs/derived-state-stores.md` covers React / Vue / Svelte / Angular / vanilla + the "store not delta event" rationale                                                                                                    |
| R8  | (build + Vitest + browser smoke)                       | Pass   | build:core + build:react green; core Vitest 56/56; `/derived-state` 0 console errors; badges Task 1→2→2→3→3 / Subagent 1→1→1→1→2 (bot delta re-renders neither); screenshot `.github/screenshots/f-013/derived-state.png` |

**§3 result: PASS — zero BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- The `/derived-state` demo casts a store-shaped object `as unknown as Channel` to feed the real hooks without a live SSE connection — an intentional demo harness (not library code); the hooks only touch `tasks$` / `subagents$` / `getTasks` / `getSubagents`.

---

## Execution Log

- 2026-07-15: REVIEW task created, paired with BUILD-014 (Status: `draft`).
- 2026-07-15: §1 static — all checklist ✅ (the lone eslint-disable is pre-existing footer code), tsc/lint/build green. §3 functional — R1–R8 all Pass (Vitest 56/56 + `/derived-state` render-badge slice-isolation + docs). Zero BLOCKERs (Status: `done`).
