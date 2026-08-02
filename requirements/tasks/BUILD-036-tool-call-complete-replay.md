# BUILD-036 Materialize a replayed tool-call from its complete frame

## Meta

- Task ID: `BUILD-036`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/48`
- Cross-product: `https://github.com/asgard-ai-platform/asgard-sindri-pm/issues/142`（Sindri BUG-009）
- Complexity: `S`
- Branch: `fix/48-tool-call-complete-replay`

---

## Brief

`Conversation.onToolCallComplete` (`packages/core/src/lib/conversation.ts`) only ever **updated** an existing tool-call message:

```ts
const existingMessage = messages.get(toolCallKey);
if (existingMessage?.type === 'tool-call') { /* update */ }
return new Conversation({ messages, ... });   // no match → silently dropped
```

That assumes `tool_call.start` always arrives first. It does on a live run — but a **GET rejoin replays terminal frames only**, so `tool_call.complete` shows up with no preceding `start`. The lookup misses, the frame is dropped, and every tool-call block disappears when the user re-enters a conversation (Sindri BUG-009: 10 blocks before, 0 after).

The fix is to materialize the message from the complete frame itself. `ToolCallCompleteEventData extends ToolCallBaseEventData`, so the complete frame already carries everything `onToolCallStart` uses — `toolCall.{toolsetName, toolName, parameter, reason}`, `toolUseId`, `parentToolUseId` — plus its own `toolCallResult` / `isError` / `toolUseResultSidecar`. Nothing has to be invented; the only thing genuinely lost is the original start timestamp.

**Already exists:** `onToolCallStart` (same file — the field-by-field shape to mirror), `ToolCallBaseEventData` / `ToolCallCompleteEventData` (`packages/core/src/types/sse-response.ts`), `conversation.spec.ts` tool-call helpers.

---

## Coverage

| File                                         | Change                                                                                                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/lib/conversation.ts`      | `onToolCallComplete` gains an `else` branch that builds a complete `ConversationToolCallMessage` from the complete frame; `onToolCallStart` gains a terminal guard (`isTerminalToolCall`) |
| `packages/core/src/lib/conversation.spec.ts` | New `describe` with 5 cases; `toolCallCompleteEvent` helper gains an optional `ids` argument so correlation ids can be asserted                                                           |

Core only — no React change, no public API change, no new type.

---

## Requirements

| R#  | Condition                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | A lone `tool_call.complete` produces a tool-call message with `isComplete: true` and the correct `toolName` / `parameter` / `result` |
| R2  | `isError` survives on a replayed complete                                                                                            |
| R3  | `toolUseResultSidecar` survives on a replayed complete                                                                               |
| R4  | `toolUseId` / `parentToolUseId` survive, so replayed subagent tool-calls still group under their spawning `Agent` (F-012)            |
| R5  | The live path (`start` → `complete`) is unchanged: still updates in place, still one message                                         |
| R6  | A late / out-of-order `tool_call.start` never rolls a completed tool-call back to running                                            |

---

## Implementation Tasks

- [x] T1 Confirm from the type definitions that the complete frame carries the base tool-call payload
- [x] T2 Write the failing tests first
- [x] T3 Add the materialize branch
- [x] T3b Add the terminal guard on `onToolCallStart` (found while hunting for counter-examples — see below)
- [x] T4 Static checks + full test suite
- [x] T5 End-to-end verification in a real product against a real backend

---

## Execution Log / Change Log

- 2026-08-02: Implemented. `npx tsc --build packages/core packages/react` clean; `npx prettier --check` and `npx eslint` clean on both touched files; `npm run test:packages` green — core 164, react 58 (the 4 new failing cases went green with the fix, the 5th guarded the live path from the start).
  - `npm run lint:packages` / `npm run typecheck:packages` could not run in this environment: Nx Cloud rejects the workspace (`401 … not connected`). Ran `tsc --build`, `eslint` and `prettier` directly instead — same coverage for the touched files.
- End-to-end (real dev backend, Sindri as the host app): built core, dropped the build into Sindri's `node_modules/@asgard-js/core`, reopened a conversation that had one tool-call.
  - Before: re-entering showed only the thinking block and the answer text — no tool-call block.
  - After: the **`1 個步驟 · 處理 1 個檔案`** block is back, and expanding it shows **`讀取 bug010-verify.txt`** — i.e. `toolName` and `parameter` came through the rebuild intact (R1 ✅ R5 ✅ visually).
  - Sindri's `node_modules` was restored to the published 0.3.36 build afterwards.

### Scope note

This fixes the tool-call half only. The Mimir report on the same issue (**whole transcript blank + Send permanently disabled**) is a different, more severe symptom and is **not** explained by this change — the open lead there is `run.init` arriving second-to-last in the replay stream. Re-verify Mimir after this ships before assuming it is covered.

### Counter-example found during review (why T3b exists)

The first cut of this change was incomplete. Materializing on `complete` makes a state reachable that
never existed before: **a completed tool-call with no `start` yet seen**. `onToolCallStart` had no
terminal guard (unlike `onMessageStart` / `onThinkingStart`, which do) — it unconditionally
`messages.set(...)`. So a late or out-of-order `start` would overwrite the materialized message back to
`isComplete: false` and drop `result` / `isError` / `sidecar`, with **no further `complete` coming to
repair it**. Worse, `isComplete` is exactly what the Task list folds on
(`derived-stores.ts:93`), so that entry would silently vanish from the Task list too.

Fixed by adding `isTerminalToolCall`, mirroring the two guards that already existed. The regression
test was verified to fail without the guard (`expected false to be true`) before being accepted.
