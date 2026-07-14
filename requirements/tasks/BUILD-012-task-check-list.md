# BUILD-012 Task Check List Panel (TaskCreate/TaskUpdate accumulation)

## Meta

- Task ID: `BUILD-012`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/10`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-010-task-check-list-面板呈現當前任務清單.md` (+ `use-cases/UC-015` accumulate/route, `UC-016` present/tri-state; pinned prototype spec `docs/superpowers/specs/2026-07-10-task-check-list-design.md` @ `4b879b7`)
- Complexity: `L`

---

## Brief

`TaskCreate` / `TaskUpdate` are native tool-calls (`toolsetName === ""`, `reason === ""`), but their meaning is **not "a tool call"** — it is "an incremental edit to one list". Accumulate the event stream into **one current task list** and present it as a docked tray at the thread↔input seam — **not inside the tool-call group** (else the same thing shows twice). The list is run-level live state (like `RunningIndicator`), not a message block.

**This touches `@asgard-js/core`** (the SSE wire type + the pure reducer live there): add the authoritative `toolUseResultSidecar` to `ToolCallCompleteEventData`, carry it onto `ConversationToolCallMessage`, and add framework-agnostic `isTaskTool` + `reduceTaskEvents` + `Task` / `TaskStatus` in core (the "data layer SoT"; sets up F-013's framework-agnostic store). React then routes task tools out of `groupMessages`, derives the list with `reduceTaskEvents`, and renders a new docked `<TaskList>` above the `RunningIndicator` seam.

**Scope this cycle (F-010):** route-out + accumulate + docked tri-state panel + `task.*` i18n. **Not this cycle:** exposing the derived list via an observable store (F-013); Subagent panel (F-012); any store-buffering of an update-before-create (spec allows ignore for now).

**Already exists:** `ToolCallCompleteEventData` (`toolCallResult`, F-009 `isError?`); `ConversationToolCallMessage` (`parameter`, `result?`, `isComplete`); `onToolCallComplete`; `chatbot-body.tsx` `groupMessages` (groups consecutive tool-calls); `chatbot-footer.tsx` renders `<RunningIndicator running={isConnecting} />` at the seam; F-007 already inlines the lucide-0.487.0 `LoaderCircle`; the i18n catalog + `t()` (F-005). No sidecar field, no task reducer, no TaskList yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — sidecar read via a narrow typed shape + guards (`unknown` + narrowing)                                            |
| §1.6 | core stays framework-agnostic (reducer + types no React/DOM); react imports core via its public entry                        |
| §1.7 | Additive only — `toolUseResultSidecar?` / `sidecar?` are new optional fields; no breaking change                             |
| §2.2 | Export new public API (`isTaskTool`, `reduceTaskEvents`, `Task`, `TaskStatus`) from the core entry                           |
| §2.3 | The SSE wire type gains `toolUseResultSidecar?` before the reducer / react read it                                           |
| §3.1 | Explicit return types on the new exported functions                                                                          |
| §4.2 | TaskList theming via CSS variables / semantic tokens — no hardcoded hex (amber spinner / muted / primary)                    |
| §4.4 | lucide icons inlined byte-identical to prototype lucide-react 0.487.0 (per prior F-004/F-007 practice)                       |
| §7   | Replay-safe: `reduceTaskEvents` is pure; any prefix folds to the same snapshot; id/status from sidecar not the result string |

---

## Acceptance Criteria

- `R1` (Route) `isTaskTool(call)` (`toolsetName === "" && toolName ∈ {TaskCreate, TaskUpdate}`) pulls task tools **out of the tool-call group** — they never render in `ToolCallGroup`. → T2, T4
- `R2` (Accumulate) `reduceTaskEvents` folds the task-tool complete events into the current list: id from `sidecar.task.id`; `TaskCreate` initial `pending` (keep existing status if the id repeats); `TaskUpdate` status ← `sidecar.statusChange.to` (fallback `parameter.status`); **create-arrival order**; pure + replay-safe (any prefix → correct snapshot); no authoritative id → skip; update-before-create → ignore. → T2, T3
- `R3` (Sidecar plumbing, core) `ToolCallCompleteEventData` gains `toolUseResultSidecar?`; `ConversationToolCallMessage` gains `sidecar?`; `onToolCallComplete` carries it. Additive. → T1, T3
- `R4` (Position / visibility) `<TaskList>` docks above the `RunningIndicator` seam in `ChatbotFooter`; an empty list → not rendered (yields space). → T5
- `R5` (Tri-state + label + expand) `in_progress` = amber spinner + `activeForm` bold (the only accent); `completed` = muted check; `pending` = hollow dim circle; rows with a `description` expand to full text; header shows `{done}/{total}` and collapses; an unknown status renders neutrally and never crashes. → T5
- `R6` (i18n) `task.title / task.pending / task.in_progress / task.completed` (en-US / ja-JP / zh-TW, en-US fallback); `subject` / `activeForm` / `description` are backend content, not translated. → T6
- `R7` (Smoke) build green; core Vitest (`isTaskTool`; `reduceTaskEvents` create→pending, update via sidecar, `parameter.status` fallback, unknown-id skip, update-before-create ignore, replay-prefix snapshot, create-order); a scoped `/task-list` demo showing route-out + the three states + empty-hidden; screenshot to `.github/screenshots/f-010/`. → T3, T7

---

## Implementation Tasks

- [x] T1 (R3): core types — `ToolCallCompleteEventData.toolUseResultSidecar?: Record<string, unknown>`; `ConversationToolCallMessage.sidecar?: Record<string, unknown>`; `onToolCallComplete` sets `sidecar: toolCallComplete.toolUseResultSidecar`.
- [x] T2 (R1, R2): core `packages/core/src/lib/task-reducer.ts` — `isTaskTool(call: { toolsetName; toolName })`; `reduceTaskEvents(events)` (narrow via `asRecord` / `asString` guards, no `any`); `Task` / `TaskStatus` in `packages/core/src/types/task.ts`. Exported from the core entry.
- [x] T3 (R2, R3, R7): core Vitest `task-reducer.spec.ts` (13 tests) — `isTaskTool` matrix; create→pending, update via `sidecar.statusChange.to`, `parameter.status` fallback, unknown-id skip, update-before-create ignore, create-order, replay full+prefix (附錄 A), unknown-status. Plus 2 `conversation.spec.ts` sidecar cases. **32/32 core tests pass**.
- [x] T4 (R1): react `chatbot-body.tsx` `groupMessages` — `continue` on `isTaskTool` messages so they never enter a tool-call group. Verified: thread shows only `Read`, no TaskCreate/TaskUpdate.
- [x] T5 (R4, R5): react new `packages/react/src/components/chatbot/task-list/` — inline lucide-0.487.0 icons (`LoaderCircle` / `CircleCheck` / `Circle` / `ListTodo` / `ChevronDown` / `ChevronRight`, byte-identical); tri-state glyph + `activeForm` label + expandable `description` + collapsible header `{done}/{total}`; semantic-token colors (amber `#faad14` accent matching tool-call running, else `--asgard-*` / `--asg-color-primary` tokens). Rendered in `chatbot-footer.tsx` above `<RunningIndicator>`, derived via `reduceTaskEvents` over the `isTaskTool` complete messages; empty → null; locale from template context.
- [x] T6 (R6): react i18n — added `task.title / task.pending / task.in_progress / task.completed` (en/ja/zh).
- [x] T7 (R7): scoped `/task-list` route (mid-run prefix: completed + in_progress + pending, a `Read` tool-call for route-out, an empty toggle). lint ✅ + format:check ✅ + build:core/react ✅. Browser-verified (states, route-out, expand, empty-hidden, header count/collapse). Screenshot `.github/screenshots/f-010/task-list.png`.

---

## Coverage

Use Cases: R1, R2 (core Vitest + `/task-list` demo), R3 (Vitest), R4, R5, R6 (`/task-list` demo), R7 (build + Vitest + browser smoke)
Files:

- `packages/core/src/types/sse-response.ts` (core) — `ToolCallCompleteEventData.toolUseResultSidecar?`
- `packages/core/src/types/channel.ts` (core) — `ConversationToolCallMessage.sidecar?`
- `packages/core/src/types/task.ts` (core) — new `Task` / `TaskStatus`
- `packages/core/src/types/index.ts` (core) — export the task types
- `packages/core/src/lib/task-reducer.ts` (core) — new `isTaskTool` / `reduceTaskEvents` / `TaskToolEvent`
- `packages/core/src/lib/conversation.ts` (core) — `onToolCallComplete` carries `sidecar`
- `packages/core/src/lib/task-reducer.spec.ts` (core) — 13 new tests
- `packages/core/src/lib/conversation.spec.ts` (core) — 2 new sidecar tests
- `packages/core/src/index.ts` (core) — export `isTaskTool` / `reduceTaskEvents` / `TaskToolEvent`
- `packages/react/src/i18n.ts` (react) — `task.*` catalog keys
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` (react) — `groupMessages` routes task tools out
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx` (react) — derive tasks + render `<TaskList>` above the seam
- `packages/react/src/components/chatbot/task-list/task-list.tsx` (react) — new panel
- `packages/react/src/components/chatbot/task-list/task-list.module.scss` (react)
- `packages/react/src/components/chatbot/task-list/index.ts` (react)
- `apps/react-demo/src/app/routes/task-list/*` (demo) — scoped route
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` (demo) — registration

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/10 (F-010 + UC-015/UC-016, pinned spec @ `4b879b7`) (Status: `draft`).
- 2026-07-15: Implemented T1–T7. Core: `toolUseResultSidecar?` on the SSE type + `sidecar?` on the message (carried by `onToolCallComplete`); new framework-agnostic `isTaskTool` / `reduceTaskEvents` / `Task` / `TaskStatus` (data-layer SoT for F-013). React: `groupMessages` routes task tools out; new docked `<TaskList>` (tri-state, activeForm, expandable, header count) above the seam; `task.*` i18n. Core Vitest 32/32 (13 reducer + 2 sidecar). `/task-list` demo browser-verified (states, route-out, expand, empty-hidden, header count/collapse). lint + format + build green (Status: `done`).
