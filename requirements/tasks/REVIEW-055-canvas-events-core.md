# REVIEW-055 Review: fold the canvas stream events into conversation state

## Meta

- Task ID: `REVIEW-055`
- Status: `done`
- BUILD Task: `BUILD-055`
- Reviewed commit: `<uncommitted working tree at review time>`
- Reviewed branch: `feat/66-canvas-card` (stacked on `feat/64-question-template`)

---

## §1 Static Code Review

Scope: the six files in BUILD-055 `## Coverage`.

### §1.1 Checklist

| Check item                                    | Rule      | Result                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                              | §1.1      | ✅ none. The spec fixtures use `as unknown as SseResponse<EventType>`, the same narrowing-free cast the existing `conversation.spec.ts` uses for minimal fixtures                                                                                                                        |
| `@ts-ignore` / `eslint-disable`               | §1.2      | ✅ none                                                                                                                                                                                                                                                                                  |
| `console.log`                                 | §1.3 §7   | ✅ none                                                                                                                                                                                                                                                                                  |
| Hardcoded API key / endpoint / namespace      | §1.4      | ✅ none                                                                                                                                                                                                                                                                                  |
| RxJS / EventSource / timer teardown           | §1.5      | ✅ n/a — the reducer is pure; no subscription or timer added                                                                                                                                                                                                                             |
| react → core public entry only                | §1.6      | ✅ no `@asgard-js/core/src` import                                                                                                                                                                                                                                                       |
| core → react / react-dom / DOM                | §1.6 §2.1 | ✅ the only grep hit is the word `window.open()` inside a prose comment in `resolve-sandbox-uri.ts` (not in this Coverage, not a DOM call)                                                                                                                                               |
| Breaking public API without `@deprecated`     | §1.7      | ✅ **purely additive, verified from the diff**: the two apparent deletions are the union's last line shedding its semicolon as a member is appended (`\| ConversationSubagentMessage;` → `… ConversationSubagentMessage` + `\| ConversationCanvasMessage;`), same for the template union |
| New public types exported from the entry      | §2.2      | ✅ core re-exports via `export type * from './sse-response' / './channel'`; confirmed present in `dist` after a `--skip-nx-cache` rebuild                                                                                                                                                |
| Template type + enum before first use         | §2.3      | ✅ T1 landed before T2                                                                                                                                                                                                                                                                   |
| `botProviderEndpoint`, not `endpoint`         | §2.4      | ✅ untouched                                                                                                                                                                                                                                                                             |
| Explicit return types                         | §3.1      | ✅ `isTerminalCanvas(): boolean`, three handlers `(): Conversation`                                                                                                                                                                                                                      |
| Shared types centralized in core `src/types/` | §3.2      | ✅ `CanvasMessageTemplate` in `sse-response.ts`, `ConversationCanvasMessage` in `channel.ts`; no duplicate                                                                                                                                                                               |
| React props typed                             | §4.1      | ✅ n/a this cycle                                                                                                                                                                                                                                                                        |
| Hardcoded colors                              | §4.2      | ✅ n/a this cycle                                                                                                                                                                                                                                                                        |
| peerDependencies intact                       | §4.4      | ✅ untouched                                                                                                                                                                                                                                                                             |
| core / react same version                     | §5        | ✅ both `0.3.61`, unchanged (deliberately unreleased)                                                                                                                                                                                                                                    |
| Repeated logic / types / JSX extracted        | §6        | ✅ the three handlers deliberately mirror `onThinking*` line-for-line rather than sharing an abstraction — the same shape the repo already uses for bot / thinking / tool-call triples; a premature generalization here would obscure the per-type terminal guards                       |
| `setTimeout` / dead code / TODO               | §7        | ✅ none                                                                                                                                                                                                                                                                                  |

### §1.2 Mechanical Grep

```
positive control 'canvas' ........ 148 matching lines (proves the scan reads the files)
§1.1 any / as any ................ exit=1 (no match) ✅
§1.2 ts-ignore / eslint-disable ... exit=1 (no match) ✅
§1.3 console.log ................. exit=1 (no match) ✅
§7   setTimeout .................. exit=1 (no match) ✅
§7   TODO / FIXME ................ exit=1 (no match) ✅
§1.6 react → core/src ............ exit=1 (no match) ✅
§1.6 core → react / DOM .......... 1 hit, inspected: prose comment, not code ✅
```

### §1.3 TypeScript and Lint

`npm run lint:check` does not exist in this repo (only `lint:core` / `lint:react` / `lint:packages`).
Type checking uses `typecheck:packages`, not the build — per `AGENTS.md`, vite builds print type errors
while exiting `0`.

```
typecheck:packages: PASS
lint:packages:      PASS — 0 errors, 3 warnings, all pre-existing on main and unrelated
format:check:       PASS
build:core+react:   PASS — every line matching /error/i is a `[vite:dts] Outside emitted: …-error.d.ts`
                    path, i.e. filenames, not diagnostics; both packages report `✓ built`
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked
- [x] No ❌ violations
- [x] All §1.2 greps run, with a positive control
- [x] `typecheck:packages` clean
- [x] `lint:packages` — 0 errors

## §3 Functional Validation

Coverage Use Cases: UC-051 / UC-052 / UC-053 (data-layer halves). Per `REVIEW_RULE.md §3`, core stream
and reducer behavior is validated by Vitest — this cycle ships no UI, so there is nothing to operate in
a browser. Each R# below names the case that proves it.

### R# Result Matrix

| R#  | Description                                                                | Result | Note                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Three `EventType`s + `Fact` fields + `CANVAS` template joined to the union | Pass   | Static: `typecheck` clean, and all three enum members + `CanvasMessageTemplate` confirmed in `dist` after `--skip-nx-cache`. Wire names cross-checked against `asgard-sdk-go@v1.7.4` source |
| R2  | `ConversationCanvasMessage` in the union, produced by three handlers       | Pass   | "start opens an empty canvas that is still drawing"; "two canvases in one run stay independent"                                                                                             |
| R3  | Deltas accumulate; a delta with no start opens the block                   | Pass   | "deltas accumulate onto the fragment"; "a delta with no preceding start opens the block instead of dropping the markup"                                                                     |
| R4  | `complete` replaces, never appends                                         | Pass   | "complete replaces the accumulation rather than extending it"; **"a complete-only transcript equals the fully streamed one — the rejoin guarantee"**                                        |
| R5  | No-template `complete` discards the card; unknown id is a no-op            | Pass   | Three cases: no template; template with empty html; unknown id (asserts the conversation stays empty)                                                                                       |
| R6  | Terminal guard against late start / delta                                  | Pass   | "a late start after complete does not reopen"; "a late delta after complete does not revert to the in-flight prefix"                                                                        |
| R7  | `parentToolUseId` frames stay out of the main conversation                 | Pass   | "canvas frames carrying parentToolUseId stay out of the main conversation" (all three event kinds)                                                                                          |
| R8  | (Smoke) build + tests + reachable from the entry                           | Pass   | build green; core 208 (+12) / react 217; `dist` verified with the nx cache skipped                                                                                                          |

### §3.1 Acceptance

- [x] Every R# executed (static read + test evidence + boundary conditions)
- [x] Each R# marked with the case that proves it
- [x] Vitest run and green
- [x] Boundary conditions confirmed: delta-before-start, empty-html template, unknown message id, late
      start, late delta, two concurrent canvases, subagent frames

**Beyond the tests — the production path was checked by reading, not assumed.** The unit tests call
`Conversation.onMessage` directly, which would hide a gate upstream. `Channel` has no event allow-list:
`buildRunHandlers` passes **every** response to `onMessage` unconditionally, and that same handler backs
both `fetchSse` (live) and `rejoinSse` (GET replay) — so UC-052's replayed `complete` really does reach
this reducer. This is read evidence, not test evidence; a `Channel`-level canvas test would be stronger
and is worth adding if BUILD-056 needs one anyway.

**Verification quality note.** The BUILD stage mutation-tested the two rules that matter most, because
both fail invisibly: turning `complete` into an append fails 3 cases (including the rejoin guarantee),
and removing the terminal guard fails 1. The `--skip-nx-cache` rebuild was used deliberately after a
cached build produced a false pass during REVIEW-052.

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

None.

---

## Execution Log

- 2026-08-12: REVIEW task created, paired with BUILD-055 (Status: `draft`).
- 2026-08-12: §1 Static review — 19/19 checklist items ✅; 7 greps clean with a positive control; the two
  non-empty results inspected and found benign; typecheck / lint / format / build green.
- 2026-08-12: §3 Functional validation — R1–R8 all Pass (12 Vitest cases). Production dispatch path
  confirmed by reading `Channel.buildRunHandlers`. 0 BLOCKERs (Status: `ready → done`).
- YYYY-MM-DD: §1 Static review started (Status: `draft → in-progress`).
- YYYY-MM-DD: §1 complete — N ✅ / N ❌; §3 Functional validation complete — all R# Pass (Status: `in-progress → done`).
