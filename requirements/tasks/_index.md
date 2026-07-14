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
- `F-006` tool-call 分組與 group summary (UC-009/UC-010; pinned spec §4/§5) → BUILD-008 / REVIEW-008. roadmap ③ 第三張。React-only。動態 summary `{n} steps · Used {s} skills · Processed {f} files`（localized、s/f=0 隱藏）取代靜態「Answer preparation steps」；分組已由 groupMessages 達成，加 `summary.*` catalog key；不動 core。

## ▶ Next Task

`F-007` (Write/Edit diff) — roadmap ③ 第四張，待使用者指示開工。BUILD-008/REVIEW-008 done、待合併。

## Task Queue

| Task ID      | Title                                      | Priority | Status | Spec                                                                                   |
| ------------ | ------------------------------------------ | -------- | ------ | -------------------------------------------------------------------------------------- |
| `BUILD-001`  | Message Stream Assembly Robustness         | High     | done   | [BUILD-001-stream-assembly-robustness.md](./BUILD-001-stream-assembly-robustness.md)   |
| `REVIEW-001` | Review: Message Stream Assembly Robustness | —        | done   | [REVIEW-001-stream-assembly-robustness.md](./REVIEW-001-stream-assembly-robustness.md) |
| `BUILD-002`  | Last-Event-ID Resume                       | High     | done   | [BUILD-002-last-event-id-resume.md](./BUILD-002-last-event-id-resume.md)               |
| `REVIEW-002` | Review: Last-Event-ID Resume               | —        | done   | [REVIEW-002-last-event-id-resume.md](./REVIEW-002-last-event-id-resume.md)             |
| `BUILD-003`  | Transcript Replay Kernel + message.user    | High     | done   | [BUILD-003-transcript-replay-kernel.md](./BUILD-003-transcript-replay-kernel.md)       |
| `REVIEW-003` | Review: Transcript Replay Kernel           | —        | done   | [REVIEW-003-transcript-replay-kernel.md](./REVIEW-003-transcript-replay-kernel.md)     |
| `BUILD-004`  | Thinking Message Display                   | High     | done   | [BUILD-004-thinking-message-display.md](./BUILD-004-thinking-message-display.md)       |
| `REVIEW-004` | Review: Thinking Message Display           | —        | done   | [REVIEW-004-thinking-message-display.md](./REVIEW-004-thinking-message-display.md)     |
| `BUILD-005`  | Run Indicator Bound to Connection at Seam  | High     | done   | [BUILD-005-run-indicator-at-seam.md](./BUILD-005-run-indicator-at-seam.md)             |
| `REVIEW-005` | Review: Run Indicator at Seam              | —        | done   | [REVIEW-005-run-indicator-at-seam.md](./REVIEW-005-run-indicator-at-seam.md)           |
| `BUILD-006`  | Built-in Tool-Call Variants + Label Synth  | High     | done   | [BUILD-006-builtin-tool-call-variants.md](./BUILD-006-builtin-tool-call-variants.md)   |
| `REVIEW-006` | Review: Built-in Tool-Call Variants        | —        | done   | [REVIEW-006-builtin-tool-call-variants.md](./REVIEW-006-builtin-tool-call-variants.md) |
| `BUILD-007`  | Tool-Call i18n Locale Prop                 | High     | done   | [BUILD-007-tool-call-i18n-locale.md](./BUILD-007-tool-call-i18n-locale.md)             |
| `REVIEW-007` | Review: Tool-Call i18n Locale Prop         | —        | done   | [REVIEW-007-tool-call-i18n-locale.md](./REVIEW-007-tool-call-i18n-locale.md)           |
| `BUILD-008`  | Tool-Call Grouping + Group Summary         | High     | done   | [BUILD-008-tool-call-grouping-summary.md](./BUILD-008-tool-call-grouping-summary.md)   |
| `REVIEW-008` | Review: Tool-Call Grouping + Group Summary | —        | done   | [REVIEW-008-tool-call-grouping-summary.md](./REVIEW-008-tool-call-grouping-summary.md) |
