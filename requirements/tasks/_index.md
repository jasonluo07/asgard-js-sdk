# Task Index

## Config

- SPEC_DIR: `references/asgard-sdk-pm/tracking/asgard-js-sdk`
- framework_profile: `ts-library-nx-vite`
- ui_stack: `react-component-lib`

> Static reference (not a running server): `references/asgard-chat-kit-prototype` (chat kit prototype). The spec source of truth is SPEC_DIR (`features/` + `use-cases/` + `tasks/`) linked from a PM issue on `asgard-sdk-pm`. See `requirements/_index.md` → "Working from a PM issue".

## Convention

- Executable task specs (Single-file SDD) live here as `TASK-*.md`. Create new tasks from `_template.md`. Per-issue cycles use the `BUILD-*` / `REVIEW-*` pair (`_build_template.md` / `_review_template.md`).
- Each task spec has `Meta`, `1) Requirements`, `2) Design`, `3) Implementation Tasks`, `4) Execution Log / Change Log`; acceptance criteria use EARS `R#` and map to implementation tasks + an Acceptance Test Matrix.
- Full rules: `docs/spec-driven-development.md`.

## Status Legend

- `draft` — 撰寫中，尚未定案。
- `ready` — 規格完成、通過 readiness gate，可被指派實作（需使用者明確指示才開工）。
- `in-progress` — 實作進行中。
- `done` — 驗收條件達成、驗證完成。

> 一律使用 `in-progress`（連字號），**禁止**使用 `in_progress`（底線）。Task spec 的 `Meta` status 與本表必須同步更新。

## Covered Specs

- `F-011` message 與 thinking 串流組裝健壯性 (UC-017, UC-018) → BUILD-001 / REVIEW-001 (done, **merged to main** via PR #291). Scope: message assembly only; thinking delegated to F-001.
- `F-002` Last-Event-ID 斷線續傳 (UC-003 透明續傳, UC-004 無 cursor 不重送) → BUILD-002 / REVIEW-002 (done, **merged** via PR #292). R4/R5 deferred (dev backend).
- `F-014` transcript 冷啟動重播內核 + message.user (UC-023) → BUILD-003 / REVIEW-003 (done, **merged to main** via PR #293). Phase 0 prerequisite for F-015/F-016. Depends F-002 (GET transport) + F-011 (complete assembly).
- `F-001` thinking message 顯示 (UC-001 串流、UC-002 完成) → BUILD-004 / REVIEW-004 (done, **merged to main** via PR #294). roadmap ② 顯示層第一張。Depends F-011 (assembly robustness). 完成態固定「Thought for a moment」不計耗時（EXT-001 已取消）。
- `F-003` run 進行中指示改綁連線並移至輸入交界 (UC-005 呈現、UC-006 移除舊 typing) → BUILD-005 / REVIEW-005 (done, **merged to main** via PR #295). roadmap ② 顯示層第二張。React-only（綁既有 `isConnecting`，不動 core）。清掉 BotTypingPlaceholder + 三點 + 500ms debounce，保留 `typingText` 串流文字。
- `F-004` 內建工具 tool-call variants 顯示與 label 合成 (UC-007; pinned spec §1–§3) → BUILD-006 / REVIEW-006 (done, **merged to main** via PR #296). roadmap ③ tool-call 一叢第一張。React-only。顯示序 `reason → 合成 → toolName`；native 七工具 variant icon（對齊 lucide 0.487.0）+ 合成（en-US；i18n locale 歸 F-005）；不動 core。
- `F-005` tool-call i18n locale prop (UC-008; pinned spec §3) → BUILD-007 / REVIEW-007 (done, **merged to main** via PR #297). roadmap ③ 第二張。React-only。`<Chatbot>` 加 `locale` prop（default en-US）→ AsgardTemplateContext → 把 F-004 的 `EN_LABEL` 換成 catalog + `t()`（en/ja/zh）；Bash description 不翻；不動 core。**自製 catalog、零外部套件**（未用 Tolgee/i18next）。
- `F-006` tool-call 分組與 group summary (UC-009/UC-010; pinned spec §4/§5) → BUILD-008 / REVIEW-008 (done, **merged to main** via PR #298). roadmap ③ 第三張。React-only。動態 summary `{n} steps · Used {s} skills · Processed {f} files`（localized、s/f=0 隱藏）取代靜態「Answer preparation steps」；分組已由 groupMessages 達成，加 `summary.*` catalog key；不動 core。
- `F-007` Write/Edit diff 與統一狀態呈現 (UC-011/UC-012; pinned spec §6/§3.5) → BUILD-009 / REVIEW-009 (done, **merged to main** via PR #299). roadmap ③ 第四張。React-only。Write=`+content 行數`、Edit=old↔new 行級 LCS 概算 `+/-`（右側）；狀態 completed 不加標記 / running 琥珀 spinner / error 紅 alert；不動 core（IsError 判定另案 F-009）。
- `F-008` tool-call 展開內容對齊 Initial/Result (UC-013; pinned spec §8) → BUILD-010 / REVIEW-010 (done, **merged to main** via PR #300). roadmap ③ 第五張。React-only。展開 Initial/Result JsonViewer 已存在，本張把標題 localize（加 `expand.*` catalog key、locale 串進 ToolCallGroup）；無內容不顯示 chevron；不動 core。
- `F-009` tool-call 失敗判定改用後端 isError (UC-014; pinned spec §7) → BUILD-011 / REVIEW-011 (done, **merged to main** via PR #301). roadmap ③ 第六張（最後）。**動 core**：SSE `ToolCallCompleteEventData` + `ConversationToolCallMessage` 加 `isError?`、`onToolCallComplete` 帶入；react status 用 `isError`（涵蓋 native/platform/general）、`result.error` 留 fallback。後端契約已在（go SDK）。**roadmap ③ 至此完結**。
- `F-010` Task Check List 面板（TaskCreate/TaskUpdate 累積） (UC-015/UC-016; pinned spec @ `4b879b7`) → BUILD-012 / REVIEW-012 (done, **merged to main** via PR #302). roadmap ④ 第一張。**動 core**：SSE `ToolCallCompleteEventData` 加 `toolUseResultSidecar?`、`ConversationToolCallMessage` 加 `sidecar?`；core 新增 framework-agnostic `isTaskTool` + `reduceTaskEvents` + `Task`/`TaskStatus`（資料層 SoT，為 F-013 泛化 store 鋪路）。react：`groupMessages` 把 task 工具攔出群組、新 docked `<TaskList>`（三態、activeForm、可展開、header 計數）置於 RunningIndicator seam 之上、`task.*` i18n。
- `F-012` Subagent 清單面板（Agent tool-call + subagent._） (UC-019/UC-020; pinned spec @ `f73545c`) → BUILD-013 / REVIEW-013. roadmap ④ 第二張。**動 core 較多**：新 `SUBAGENT_START/COMPLETE` 事件 + Fact；`toolUseId?`/`parentToolUseId?` 上 tool-call wire 型別 + `ConversationToolCallMessage`；新 `ConversationSubagentMessage` 變體 + `onSubagentStart/Complete`；core 新增 framework-agnostic `isAgentTool`/`isSubagentChildTool`/`reduceSubagents` + `Subagent`/`SubagentStatus`/`SubagentEvent`。**關鍵**：subagent 狀態只由 `subagent.complete` 驅動，非 Agent 的 tool_call.complete（async_launched 早退）。react：`groupMessages` 再排除 Agent + child 工具、新 docked `<SubagentList>`（疊在 TaskList 之上、自動收合、current-tool/tool-count、展開 child 工具）、`subagent._` i18n。

## ▶ Next Task

`REVIEW-013` — Review: Subagent List Panel (ready). BUILD-013 done。roadmap ④ 第二張（動 core 較多）。review 通過後接 F-013（泛化 store）。

## Task Queue

| Task ID      | Title                                         | Priority | Status | Spec                                                                                   |
| ------------ | --------------------------------------------- | -------- | ------ | -------------------------------------------------------------------------------------- |
| `BUILD-001`  | Message Stream Assembly Robustness            | High     | done   | [BUILD-001-stream-assembly-robustness.md](./BUILD-001-stream-assembly-robustness.md)   |
| `REVIEW-001` | Review: Message Stream Assembly Robustness    | —        | done   | [REVIEW-001-stream-assembly-robustness.md](./REVIEW-001-stream-assembly-robustness.md) |
| `BUILD-002`  | Last-Event-ID Resume                          | High     | done   | [BUILD-002-last-event-id-resume.md](./BUILD-002-last-event-id-resume.md)               |
| `REVIEW-002` | Review: Last-Event-ID Resume                  | —        | done   | [REVIEW-002-last-event-id-resume.md](./REVIEW-002-last-event-id-resume.md)             |
| `BUILD-003`  | Transcript Replay Kernel + message.user       | High     | done   | [BUILD-003-transcript-replay-kernel.md](./BUILD-003-transcript-replay-kernel.md)       |
| `REVIEW-003` | Review: Transcript Replay Kernel              | —        | done   | [REVIEW-003-transcript-replay-kernel.md](./REVIEW-003-transcript-replay-kernel.md)     |
| `BUILD-004`  | Thinking Message Display                      | High     | done   | [BUILD-004-thinking-message-display.md](./BUILD-004-thinking-message-display.md)       |
| `REVIEW-004` | Review: Thinking Message Display              | —        | done   | [REVIEW-004-thinking-message-display.md](./REVIEW-004-thinking-message-display.md)     |
| `BUILD-005`  | Run Indicator Bound to Connection at Seam     | High     | done   | [BUILD-005-run-indicator-at-seam.md](./BUILD-005-run-indicator-at-seam.md)             |
| `REVIEW-005` | Review: Run Indicator at Seam                 | —        | done   | [REVIEW-005-run-indicator-at-seam.md](./REVIEW-005-run-indicator-at-seam.md)           |
| `BUILD-006`  | Built-in Tool-Call Variants + Label Synth     | High     | done   | [BUILD-006-builtin-tool-call-variants.md](./BUILD-006-builtin-tool-call-variants.md)   |
| `REVIEW-006` | Review: Built-in Tool-Call Variants           | —        | done   | [REVIEW-006-builtin-tool-call-variants.md](./REVIEW-006-builtin-tool-call-variants.md) |
| `BUILD-007`  | Tool-Call i18n Locale Prop                    | High     | done   | [BUILD-007-tool-call-i18n-locale.md](./BUILD-007-tool-call-i18n-locale.md)             |
| `REVIEW-007` | Review: Tool-Call i18n Locale Prop            | —        | done   | [REVIEW-007-tool-call-i18n-locale.md](./REVIEW-007-tool-call-i18n-locale.md)           |
| `BUILD-008`  | Tool-Call Grouping + Group Summary            | High     | done   | [BUILD-008-tool-call-grouping-summary.md](./BUILD-008-tool-call-grouping-summary.md)   |
| `REVIEW-008` | Review: Tool-Call Grouping + Group Summary    | —        | done   | [REVIEW-008-tool-call-grouping-summary.md](./REVIEW-008-tool-call-grouping-summary.md) |
| `BUILD-009`  | Write/Edit Diff + Unified Status              | High     | done   | [BUILD-009-write-edit-diff-status.md](./BUILD-009-write-edit-diff-status.md)           |
| `REVIEW-009` | Review: Write/Edit Diff + Unified Status      | —        | done   | [REVIEW-009-write-edit-diff-status.md](./REVIEW-009-write-edit-diff-status.md)         |
| `BUILD-010`  | Tool-Call Expanded Content + Localized Titles | High     | done   | [BUILD-010-tool-call-expand-localize.md](./BUILD-010-tool-call-expand-localize.md)     |
| `REVIEW-010` | Review: Tool-Call Expanded Content            | —        | done   | [REVIEW-010-tool-call-expand-localize.md](./REVIEW-010-tool-call-expand-localize.md)   |
| `BUILD-011`  | Tool-Call Failure Detection via isError       | High     | done   | [BUILD-011-toolcall-iserror.md](./BUILD-011-toolcall-iserror.md)                       |
| `REVIEW-011` | Review: Tool-Call Failure Detection           | —        | done   | [REVIEW-011-toolcall-iserror.md](./REVIEW-011-toolcall-iserror.md)                     |
| `BUILD-012`  | Task Check List Panel                         | High     | done   | [BUILD-012-task-check-list.md](./BUILD-012-task-check-list.md)                         |
| `REVIEW-012` | Review: Task Check List Panel                 | —        | done   | [REVIEW-012-task-check-list.md](./REVIEW-012-task-check-list.md)                       |
| `BUILD-013`  | Subagent List Panel                           | High     | done   | [BUILD-013-subagent-list.md](./BUILD-013-subagent-list.md)                             |
| `REVIEW-013` | Review: Subagent List Panel                   | —        | done   | [REVIEW-013-subagent-list.md](./REVIEW-013-subagent-list.md)                           |
