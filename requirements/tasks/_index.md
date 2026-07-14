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

- `F-011` message 與 thinking 串流組裝健壯性 (UC-017 缺前綴直達 complete, UC-018 終態防回退) → BUILD-001 / REVIEW-001. Scope: message assembly only; thinking delegated to F-001.

## ▶ Next Task

None — BUILD-001 cycle complete (awaiting user authorization to close + open PR). Next PM feature per the roadmap: F-002 (Last-Event-ID resume) or F-014 (transcript replay kernel).

## Task Queue

| Task ID      | Title                                      | Priority | Status | Spec                                                                                   |
| ------------ | ------------------------------------------ | -------- | ------ | -------------------------------------------------------------------------------------- |
| `BUILD-001`  | Message Stream Assembly Robustness         | High     | done   | [BUILD-001-stream-assembly-robustness.md](./BUILD-001-stream-assembly-robustness.md)   |
| `REVIEW-001` | Review: Message Stream Assembly Robustness | —        | done   | [REVIEW-001-stream-assembly-robustness.md](./REVIEW-001-stream-assembly-robustness.md) |
