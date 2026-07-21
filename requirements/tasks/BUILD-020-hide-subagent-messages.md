# BUILD-020 Hide Subagent Message / Thinking Frames from the Main Conversation

## Meta

- Task ID: `BUILD-020`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/26`
- Source spec: `BUG-001` (issue body carries the full spec + live SSE evidence; the `tracking/asgard-js-sdk/bugs/` file is not yet in the pinned submodule `ee9e194`)
- Complexity: `S`

---

## Brief

A subagent's own `asgard.message.{start,delta,complete}` and `asgard.message.thinking.{start,delta,complete}` frames carry a **non-empty `parentToolUseId`** (the `toolUseId` of the `Agent` call that spawned them). The `conversation.ts` message/thinking reducers keyed only on `messageId` and unconditionally `messages.set(...)`, so subagent turns were materialized into the main conversation and shown to the end user — leaking internal coordination text and even a system-prompt tail. This task adds a `parentToolUseId` guard to all six message/thinking handlers so non-empty frames are dropped entirely (hidden). Accumulating them into a subagent sub-conversation is backlog, out of scope. Touches `@asgard-js/core` only (wire type + reducer); the demo showcase mock is extended to stream these frames so the fix is exercised live.

**Already exists:** `conversation.ts` `onMessage{Start,Delta,Complete}` / `onThinking{Start,Delta,Complete}` (F-011 terminal guards + lazy-init, no `parentToolUseId` check); `sse-response.ts` `Message` interface (no `parentToolUseId`); tool-call / subagent handlers already route on `parentToolUseId`; `conversation.spec.ts` F-011 / F-001 suites; `apps/react-demo` `/all-features` showcase mock (streams `subagent.start/complete` + child tool calls, but not subagent message/thinking frames).

---

## Relevant Rules

| §    | Rule (summary)                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — the guard reads the newly-typed optional field                                       |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass types                                              |
| §1.7 | Additive only — `parentToolUseId?` is a new optional field; no breaking change                  |
| §2.3 | The SSE type (`sse-response.ts` `Message`) gains `parentToolUseId?` before the reducer reads it |
| §3.1 | Explicit return types (handlers already typed `: Conversation`)                                 |
| §3.2 | Reuse the shared `Message` type; one guard shape across all six handlers                        |
| §6   | Same one-line guard reused across the six handlers; no second routing path                      |
| §7   | Replay-safe: the decision reads `message.parentToolUseId` from the frame, not arrival order     |

---

## Acceptance Criteria

- `R1` The SSE `Message` interface gains `parentToolUseId?: string` (wire payload already carries it). → T1
- `R2` When a `message.{start,delta,complete}` frame has a non-empty `parentToolUseId`, the reducer shall not materialize it into the main conversation (no bot message created or mutated). → T2
- `R3` When a `message.thinking.{start,delta,complete}` frame has a non-empty `parentToolUseId`, the reducer shall not materialize it into the main conversation (no thinking block created or mutated). → T2
- `R4` A main-agent frame (empty / absent `parentToolUseId`) shall still materialize exactly as before, coexisting with hidden interleaved subagent frames. → T2
- `R5` (Smoke) build green; core Vitest covers the hidden message-complete / message start·delta / thinking-complete cases and the main-vs-subagent coexistence case; the `/all-features` showcase (which now streams subagent message/thinking frames with a non-empty `parentToolUseId`) shows a clean main conversation — the coordination text and system-prompt tail never appear — verified in the browser. → T3, T4

---

## Implementation Tasks

- [x] T1 (R1): `packages/core/src/types/sse-response.ts` — add `parentToolUseId?: string` to `interface Message`.
- [x] T2 (R2, R3, R4): `packages/core/src/lib/conversation.ts` — guard all six handlers (`onMessageStart` / `onMessageDelta` / `onMessageComplete` / `onThinkingStart` / `onThinkingDelta` / `onThinkingComplete`): `if (message.parentToolUseId) return this;`.
- [x] T3 (R2, R3, R4, R5): `packages/core/src/lib/conversation.spec.ts` — new `BUG-001` suite (4 cases): subagent message-complete dropped; subagent message start/delta never lazy-created; subagent thinking-complete dropped; main-agent message kept while interleaved subagent message hidden. Core Vitest **84/84** (4 new).
- [x] T4 (R5): `apps/react-demo/src/mock-server/sse-mock.ts` — `spawnSubagent` now streams a subagent `thinking.complete` + `message.complete` (both `parentToolUseId` set, message text includes the leaked system-prompt tail). Browser-verified on `/all-features` via DOM: the three leaked strings are absent from the chat view while the main answer + subagent-panel summary remain. Screenshot `.github/screenshots/bug-001-subagent-hidden.png`.
- [x] T5: `npm run lint:packages` ✅ + `npm run build:core && npm run build:react` ✅ (both green).

---

## Coverage

Use Cases: R1 (core Vitest + build), R2/R3/R4 (core Vitest + `/all-features` browser smoke), R5 (build + Vitest + browser)
Files:

- `packages/core/src/types/sse-response.ts` (core) — `Message.parentToolUseId?`
- `packages/core/src/lib/conversation.ts` (core) — six-handler `parentToolUseId` guard
- `packages/core/src/lib/conversation.spec.ts` (core) — 4 new BUG-001 tests
- `apps/react-demo/src/mock-server/sse-mock.ts` (demo) — subagent message/thinking frame builders + `spawnSubagent` wiring
- `.github/screenshots/bug-001-subagent-hidden.png` (evidence)

---

## Execution Log / Change Log

- 2026-07-21: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/26 (BUG-001) (Status: `draft`).
- 2026-07-21: Implemented T1–T5 (TDD: 4 failing tests first, then the guard). Core: `Message.parentToolUseId?`; six message/thinking handlers drop non-empty-`parentToolUseId` frames. Vitest 84/84 (4 new). Demo `/all-features` extended to stream subagent message/thinking; browser-verified the leak is gone (coordination text + system-prompt tail absent, main answer + subagent summary present). lint + build green (Status: `done`).
