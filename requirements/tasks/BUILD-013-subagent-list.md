# BUILD-013 Subagent List Panel (Agent tool-call + subagent.\*)

## Meta

- Task ID: `BUILD-013`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/12`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-012-subagent-清單面板呈現當前子代理.md` (+ `use-cases/UC-019` accumulate/route, `UC-020` panel/tool-list; pinned prototype spec `docs/superpowers/specs/2026-07-11-subagent-list-design.md` @ `f73545c`; go SDK `asgard-sdk-go/pkg/models/sse_event.go`)
- Complexity: `L`

---

## Brief

When the agent spawns a subagent, the underlying mechanism is an `Agent` tool-call, followed by `asgard.subagent.{start,complete}` and the subagent's own child `tool_call.*` (all carrying `parentToolUseId` = the `Agent` tool-call's `toolUseId`). Accumulate these into **one current subagent list** and present it as a docked panel **stacked above the Task List** — showing which subagents are working and each one's child tools. **Route the `Agent` tool-call and every child tool out of the main tool-call group.**

**This touches `@asgard-js/core` more than F-010:** new `SUBAGENT_START` / `SUBAGENT_COMPLETE` events + Fact entries; `toolUseId?` / `parentToolUseId?` on the tool-call wire type + `ConversationToolCallMessage`; a new `ConversationSubagentMessage` variant + `onSubagentStart/Complete` reducer methods; and framework-agnostic `isAgentTool` / `isSubagentChildTool` / `reduceSubagents` + `Subagent` / `SubagentStatus` / `SubagentEvent` (data-layer SoT, continues F-010's setup for F-013). React routes them out of `groupMessages`, adapts the ordered conversation messages into `SubagentEvent[]`, folds with `reduceSubagents`, and renders `<SubagentList>` above `<TaskList>`.

**The critical correctness rule:** a subagent's status is driven by `subagent.start → subagent.complete` (`completed` / `failed` / `cancelled`), **never** by the `Agent` tool-call's `tool_call.complete` — for an async subagent the `Agent` tool completes early with `toolCallResult.status = "async_launched"` while the subagent is still running. Terminal only via `subagent.complete` → replay-safe.

**Scope this cycle (F-012):** route-out + accumulate + docked panel (status glyphs, current-tool / tool-count, expand child tools) + `subagent.*` i18n. **Not this cycle:** rendering the subagent's own `message.*` / `thinking.*` (backlog, §7); exposing the derived list via an observable store (F-013).

**Already exists:** `ConversationToolCallMessage` (`toolName`, `parameter`, `isError?`, `sidecar?`); `onToolCallStart/Complete`; F-010 `isTaskTool` + `groupMessages` already routes task tools out; F-010 `<TaskList>` docked in `chatbot-footer` above `<RunningIndicator>`; `synthesizeToolCallLabel` (F-004/005) for tool labels; F-007 inlines `LoaderCircle` / `CircleAlert`; the i18n catalog + `t()`. No subagent events, no `toolUseId` / `parentToolUseId`, no subagent reducer / panel yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — subagent event fields read via narrow typed shapes + guards                                                                                   |
| §1.6 | core stays framework-agnostic (reducer + types no React/DOM); react imports core via its public entry                                                    |
| §1.7 | Additive only — new events, new optional fields, new variant, new API; no breaking change                                                                |
| §2.2 | Export new public API (`isAgentTool`, `isSubagentChildTool`, `reduceSubagents`, `Subagent`, `SubagentStatus`, `SubagentEvent`) from the core entry       |
| §2.3 | Enum + SSE Fact entries added before the reducer / react read them                                                                                       |
| §3.1 | Explicit return types on the new exported functions                                                                                                      |
| §4.2 | SubagentList theming via CSS variables / tokens — no hardcoded hex (amber / red / muted / primary)                                                       |
| §4.4 | lucide icons inlined byte-identical to prototype lucide-react 0.487.0 (Bot / CircleSlash new; reuse LoaderCircle / CircleCheck / CircleAlert / Chevrons) |
| §7   | Replay-safe: status terminal only via `subagent.complete`; async `Agent` tool completion must not mark the subagent done                                 |

---

## Acceptance Criteria

- `R1` (Events / types, core) enum `SUBAGENT_START` (`asgard.subagent.start`) / `SUBAGENT_COMPLETE` (`asgard.subagent.complete`); `SubagentStartEventData` / `SubagentCompleteEventData` + `Fact.subagentStart` / `subagentComplete`; `toolUseId?` / `parentToolUseId?` on `ToolCallBaseEventData` + `ConversationToolCallMessage` (carried by `onToolCallStart/Complete`); a new `ConversationSubagentMessage` variant + `onSubagentStart/Complete`. Additive. → T1
- `R2` (Route) the main tool-call group keeps only `parentToolUseId === "" && toolName ∉ {Agent, TaskCreate, TaskUpdate}`; `isAgentTool` (spawn marker) and any child tool (`parentToolUseId !== ""`) are excluded. → T2, T5
- `R3` (Accumulate) `reduceSubagents` keys by `parentToolUseId`, first-seen order: `Agent tool_call.start` / `subagent.start` ensure the entry (+ agentId / subagentType / description); child `tool_call.start` upserts a tool (running); child `tool_call.complete` sets result + status (`isError ? error : completed`); `subagent.complete` sets the terminal status + summary. → T2, T3
- `R4` (Async correctness) a subagent stays `running` while its `Agent` `tool_call.complete` returns `async_launched`; only `subagent.complete` moves it terminal (附錄 A timeline). → T3
- `R5` (Replay-safe) status goes terminal only via `subagent.complete`; `agentStart` / `subagentStart` never change status; any prefix folds to a consistent snapshot; a re-seen start never reverts a completed subagent to running. → T3
- `R6` (Position / visibility) `<SubagentList>` docks above `<TaskList>` (order: thread → Subagents → Tasks → seam → input); never-any → not rendered; all-terminal → auto-collapsed (header stays); any-running → expanded. → T6
- `R7` (Item) status glyph (running amber spinner / completed muted check / failed red alert / cancelled muted slash) + `subagentType · description`; collapsed running → `↳ 執行中:{current tool}` (last running child, else last); collapsed terminal → `{n} tools`; expanded → the child tool list (reusing the tool label + tool status glyph). Header `Bot` icon (primary when any running, else muted) + title + `{done}/{total}` + collapse. → T6
- `R8` (i18n) `subagent.title` / `subagent.{running,completed,failed,cancelled}` / `subagent.activeTool` / `subagent.toolCount` (en/ja/zh, en-US fallback); `subagentType` / `description` / tool labels not translated. → T7
- `R9` (Smoke) build green; core Vitest (`reduceSubagents`: async-launched stays running, child tool folding, terminal states, replay prefix from 附錄 A; `isAgentTool` / `isSubagentChildTool`); a scoped `/subagent-list` demo showing route-out + a running subagent (current tool) + a completed one (auto-collapse) + expand child tools; screenshot to `.github/screenshots/f-012/`. → T3, T8

---

## Implementation Tasks

- [x] T1 (R1): core — enum `SUBAGENT_START` / `SUBAGENT_COMPLETE`; `sse-response.ts` `SubagentStartEventData` / `SubagentCompleteEventData` + `Fact` entries + `ToolCallBaseEventData.toolUseId?` / `parentToolUseId?`; `channel.ts` `ConversationToolCallMessage.toolUseId?` / `parentToolUseId?` + new `ConversationSubagentMessage`; `conversation.ts` `onToolCallStart` carries the ids, new `onSubagentStart/Complete` (store keyed by `subagent:${parentToolUseId}:${kind}`) + switch cases. `SubagentTerminalStatus` = terminal subset (`subagent.complete` never `running`).
- [x] T2 (R2, R3): core `packages/core/src/lib/subagent-reducer.ts` — `isAgentTool`, `isSubagentChildTool`, `reduceSubagents` (narrow with guards, no `any`), `SubagentEvent` union; `Subagent` / `SubagentStatus` / `SubagentTerminalStatus` / `SubagentToolCall` in `packages/core/src/types/subagent.ts`. Exported from the core entry.
- [x] T3 (R3, R4, R5, R9): core Vitest `subagent-reducer.spec.ts` (11 tests) + 4 `conversation.spec.ts` cases. **47/47 core tests pass**. Covers async-launched stays running (附錄 A), child tool folding (completed/error), terminal states, replay prefix + no-revert, id plumbing, `onSubagentStart/Complete`.
- [x] T4 (R1): core — exported `isAgentTool` / `isSubagentChildTool` / `reduceSubagents` / `SubagentEvent` from `index.ts`; subagent types via the barrel.
- [x] T5 (R2): react `chatbot-body.tsx` `groupMessages` — skips `subagent` messages entirely, and skips `isAgentTool` + any `parentToolUseId !== ""` tool-call (on top of F-010's `isTaskTool`). Verified: thread shows only `Read`.
- [x] T6 (R6, R7): react new `packages/react/src/components/chatbot/subagent-list/` (`subagent-list.tsx` + `subagent-events.ts` adapter + module.scss) — inline lucide-0.487.0 icons (`Bot` / `CircleSlash` new; reuse LoaderCircle / CircleCheck / CircleAlert / Chevrons); item glyph + `subagentType · description` + current-tool / tool-count + expandable child tools (labels via `synthesizeToolCallLabel`); auto-collapse; semantic-token colors. Rendered in `chatbot-footer.tsx` above `<TaskList>`, derived via `reduceSubagents(conversationToSubagentEvents(...))`.
- [x] T7 (R8): react i18n — added `subagent.title` / `subagent.{running,completed,failed,cancelled}` / `subagent.activeTool` / `subagent.toolCount` (en/ja/zh).
- [x] T8 (R9): scoped `/subagent-list` route (running subagent + current tool, completed subagent + child tools, all-done auto-collapse toggle, a `Read` for route-out). lint ✅ + format:check ✅ + build:core/react ✅. Browser-verified (route-out, async-correctness running, current tool, tool-count, expand child tools, auto-collapse). Screenshot `.github/screenshots/f-012/subagent-list.png`. **Fixed en route:** subagent messages crashed the thread renderer (`.template`) → `groupMessages` now skips `type === 'subagent'`.

---

## Coverage

Use Cases: R1, R3, R4, R5 (core Vitest), R2, R6, R7, R8 (`/subagent-list` demo), R9 (build + Vitest + browser smoke)
Files:

- `packages/core/src/constants/enum.ts` (core) — `SUBAGENT_START` / `SUBAGENT_COMPLETE`
- `packages/core/src/types/sse-response.ts` (core) — `toolUseId?` / `parentToolUseId?` + `SubagentStart/CompleteEventData` + Fact
- `packages/core/src/types/channel.ts` (core) — tool-call `toolUseId?` / `parentToolUseId?` + `ConversationSubagentMessage`
- `packages/core/src/types/subagent.ts` (core) — `Subagent` / `SubagentStatus` / `SubagentTerminalStatus` / `SubagentToolCall`
- `packages/core/src/types/index.ts` (core) — export subagent types
- `packages/core/src/lib/conversation.ts` (core) — id plumbing + `onSubagentStart/Complete`
- `packages/core/src/lib/subagent-reducer.ts` (core) — `isAgentTool` / `isSubagentChildTool` / `reduceSubagents` / `SubagentEvent`
- `packages/core/src/lib/subagent-reducer.spec.ts` (core) — 11 tests
- `packages/core/src/lib/conversation.spec.ts` (core) — 4 new subagent/id tests
- `packages/core/src/index.ts` (core) — export subagent API
- `packages/react/src/i18n.ts` (react) — `subagent.*` keys
- `packages/react/src/components/chatbot/chatbot.tsx` (react) — move `ChatbotFooter` inside `AsgardTemplateContextProvider` so the docked panels read `locale` (fixes F-010 TaskList i18n too)
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` (react) — routing (skip subagent + Agent + child tools)
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx` (react) — derive subagents + render `<SubagentList>` above `<TaskList>`
- `packages/react/src/components/chatbot/subagent-list/subagent-list.tsx` (react) — new panel
- `packages/react/src/components/chatbot/subagent-list/subagent-events.ts` (react) — conversation → `SubagentEvent[]` adapter
- `packages/react/src/components/chatbot/subagent-list/subagent-list.module.scss` + `index.ts` (react)
- `apps/react-demo/src/app/routes/subagent-list/*` (demo) — scoped route
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` (demo) — registration

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/12 (F-012 + UC-019/UC-020, pinned spec @ `f73545c`) (Status: `draft`).
- 2026-07-15: Implemented T1–T8. Core: new `SUBAGENT_START/COMPLETE` events + `SubagentStart/CompleteEventData` + Fact; `toolUseId?`/`parentToolUseId?` on tool-call wire + message; new `ConversationSubagentMessage` variant + `onSubagentStart/Complete`; framework-agnostic `isAgentTool`/`isSubagentChildTool`/`reduceSubagents` + subagent types (status terminal only via `subagent.complete`). React: `groupMessages` routes Agent + child + subagent chrome out; new docked `<SubagentList>` above `<TaskList>` (auto-collapse, current-tool/tool-count, expand child tools) + conversation→event adapter; `subagent.*` i18n. Core Vitest 47/47 (11 reducer + 4 conversation). `/subagent-list` demo browser-verified (route-out, async-correctness running despite async_launched, current tool, tool-count, expand, auto-collapse). lint + format + build green (Status: `done`).
- 2026-07-15 (post-review polish, per user): enriched the demo data to match the design reference (natural-language child `reason` labels 列出可用語意模型 / 驗證用料查詢 SQL / 查詢 Bolzen 訂單用料明細; subagents 查詢 Bolzen 訂單用料需求 + 查詢 SWRCH35K φ7.0 庫存狀態) + added a locale selector (default zh-TW). **Found + fixed a real i18n bug**: `ChatbotFooter` was rendered _outside_ `AsgardTemplateContextProvider`, so the docked `TaskList` (F-010) / `SubagentList` panels always got the default `locale: 'en-US'`. Moved the footer inside the provider (`chatbot.tsx`). Re-verified: zh-TW renders 子代理 / 執行中 / N 個工具 and en-US renders Subagents / Running / N tools live via the selector; child `reason` labels stay untranslated. lint + format + build + Vitest 47/47 green.
