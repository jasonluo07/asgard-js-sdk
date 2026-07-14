# BUILD-011 Tool-Call Failure Detection via Backend isError

## Meta

- Task ID: `BUILD-011`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/9`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-009-tool-call-失敗判定改用後端-isError.md` (+ `use-cases/UC-014`; pinned prototype spec `docs/superpowers/specs/2026-07-10-builtin-tool-call-variants-design.md` §7)
- Complexity: `M`

---

## Brief

Drive the tool-call **error** status (F-007's red alert) from the backend's `isError` flag on `tool_call.complete` instead of the `result?.error` heuristic, which is invalid for native tools (their `toolCallResult` is a plain-text string with no `.error`, so native failures are undetectable). The backend already emits it — go SDK `pkg/models/sse_event.go:87` `IsError bool json:"isError,omitempty"`, so an omitted value means `false`. Add `isError?: boolean` to the SSE `ToolCallCompleteEventData` and to `ConversationToolCallMessage`, carry it through `conversation.ts` `onToolCallComplete`, and use it in `chatbot-body.tsx` to compute the status (covering native / platform / general uniformly); keep `result.error` as a fallback for old data. **This one touches `@asgard-js/core`** (unlike F-004–F-008), because the wire type + reducer live in core.

**Scope this cycle (F-009):** adopt `isError` end-to-end for the error status + keep the `result.error` fallback. **Not this cycle:** any richer error-detail rendering (the error icon styling is already in place from F-007).

**Already exists:** `sse-response.ts` `ToolCallCompleteEventData { …, toolCallResult }`; `channel.ts` `ConversationToolCallMessage` (`result?`, `isComplete`, …); `conversation.ts` `onToolCallComplete` (sets `result` / `isComplete`); `chatbot-body.tsx` `toolCallToItemData` status = `toolCall.result?.error ? 'error' : 'completed'`; F-007 renders the `error` status as the right-side red `CircleAlert`. No `isError` field yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------ |
| §1.1 | No `any`                                                                                         |
| §1.7 | Additive only — `isError?` is a new optional field; no breaking change                           |
| §2.3 | The SSE type (`sse-response.ts`) gains `isError?` before the reducer / react read it             |
| §3.1 | Explicit return types (reducer already typed)                                                    |
| §3.2 | Reuse `ConversationToolCallMessage`; the react status just reads the new field                   |
| §6   | Reuse the existing `onToolCallComplete` + `toolCallToItemData`; no second failure-detection path |
| §7   | Replay-safe: `isError` comes from the event, not derived from arrival time                       |

---

## Acceptance Criteria

- `R1` The SSE `ToolCallCompleteEventData` and `ConversationToolCallMessage` gain `isError?: boolean`; `conversation.ts` `onToolCallComplete` carries `toolCallComplete.isError` into the message. → T1
- `R2` The tool-call error status (F-007 red alert) is driven by `isError`, covering native (plain-text result), platform, and general tools alike. → T2
- `R3` The `result.error` heuristic is retained as a **fallback** (`isError || result?.error` → `error`). → T2
- `R4` An omitted `isError` (omitempty) is treated as not-failed (`completed`). → T1, T2, T3
- `R5` (Smoke) build green; core Vitest for `onToolCallComplete` (`isError: true` → `error`, omitted → not-failed, `result.error` fallback still works); a scoped react-demo route showing a native tool with `isError` (red alert), a completed native tool, and a `result.error` fallback case; screenshot to `.github/screenshots/f-009/`. → T3, T4

---

## Implementation Tasks

- [x] T1 (R1, R4): `sse-response.ts` — `ToolCallCompleteEventData.isError?: boolean`; `channel.ts` — `ConversationToolCallMessage.isError?: boolean`; `conversation.ts` `onToolCallComplete` — `isError: toolCallComplete.isError` on the updated message.
- [x] T2 (R2, R3, R4): `chatbot-body.tsx` `toolCallToItemData` — `status = toolCall.isComplete ? ((toolCall.isError || toolCall.result?.error) ? 'error' : 'completed') : 'pending'`.
- [x] T3 (R1, R4, R5): core Vitest — `onToolCallComplete` with `isError: true` → message `isError === true` (→ error); omitted → `isError` falsy (→ completed); a start+complete pair; the `result.error` fallback path. **17/17 pass** (3 new for F-009).
- [x] T4 (R5): scoped react-demo route `/tool-call-iserror` with a native tool `isError:true` (red alert), a completed native tool (no mark), and a general tool with only `result.error` (fallback). Browser-verified via DOM: Bash + WebSearch → `status_icon--error` red `rgb(255,77,79)`, Read → no status icon. Screenshot `.github/screenshots/f-009/tool-call-iserror.png`.
- [x] T5: `npm run lint:packages` ✅ + `npm run format:check` (own files) ✅ + `npm run build:core && npm run build:react` ✅ (both green).

---

## Coverage

Use Cases: R1 (core Vitest), R2, R3, R4 (Vitest + `/tool-call-iserror` demo), R5 (build + Vitest + browser smoke)
Files:

- `packages/core/src/types/sse-response.ts` (core) — `ToolCallCompleteEventData.isError?`
- `packages/core/src/types/channel.ts` (core) — `ConversationToolCallMessage.isError?`
- `packages/core/src/lib/conversation.ts` (core) — `onToolCallComplete` carries `isError`
- `packages/core/src/lib/conversation.spec.ts` (core) — 3 new F-009 tests
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` (react) — `status` reads `isError` + `result.error` fallback
- `apps/react-demo/src/app/routes/tool-call-iserror/tool-call-iserror.tsx` (demo)
- `apps/react-demo/src/app/routes/tool-call-iserror/tool-call-iserror.module.scss` (demo)
- `apps/react-demo/src/app/routes/tool-call-iserror/index.ts` (demo)
- `apps/react-demo/src/app/app.tsx` (demo) — route registration
- `apps/react-demo/src/app/components/layout/layout.tsx` (demo) — nav entry

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/9 (F-009 + UC-014, pinned spec §7) (Status: `draft`).
- 2026-07-15: Implemented T1–T5. Core: `isError?` on `ToolCallCompleteEventData` + `ConversationToolCallMessage`; `onToolCallComplete` carries it. React: `toolCallToItemData` status = `(isError || result?.error) ? 'error' : 'completed'`. Vitest 17/17 (3 new). Scoped `/tool-call-iserror` demo browser-verified (native isError → red alert; omitted → completed; result.error fallback → red alert). lint + format + build green (Status: `done`).
