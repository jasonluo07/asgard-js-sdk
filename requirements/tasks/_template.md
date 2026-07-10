---
id: TASK-000
title: <task title>
status: draft
owner: <name / unassigned>
---

# TASK-000: <task title>

> Single-file SDD task spec. Fill every section before moving `status` to `ready`.
> Status flow: `draft` -> `ready` -> `in-progress` -> `done`（禁用 `in_progress`）。
> `ready` 未經使用者明確指示不得開工。

## Meta

| Key      | Value                      |
| -------- | -------------------------- |
| id       | TASK-000                   |
| title    | <task title>               |
| status   | draft                      |
| owner    | <name / unassigned>        |
| priority | <high / medium / low>      |
| related  | <REQ-\*, references links> |

## 1) Requirements

- **Background / Goal**：這個任務要解決什麼、為什麼。
- **In scope**：要做的範圍。
- **Out of scope / Non-goals**：明確不做的部分。
- **Known context**：已知前提、相依、限制。
- **Open questions / Decisions**：待確認事項與已定決策。

### Acceptance Criteria（EARS，`R#`）

用 EARS 句式撰寫，每條給一個 `R#` 編號，之後對應到實作任務與驗證案例。

- **R1** — When <trigger / condition>, the system shall <expected behavior>.
- **R2** — While <state>, when <trigger>, the system shall <expected behavior>.
- **R3** — If <error condition>, then the system shall <expected handling>.

## 2) Design

- 影響哪個 package（`@asgard-js/core` / `@asgard-js/react` / 兩者），以及 package 邊界（core 不得依賴 react/DOM）。
- 公開 API 契約：新增 / 變更的型別、函式、元件 props、export（從 package 進入點導出，明確 `export type`）；破壞性變更以 `@deprecated` 過渡。
- core：SSE / RxJS stream 行為與型別（對齊 `types/sse-response.ts`）、訂閱 teardown、錯誤處理。
- react：元件結構（沿用 `components/templates/` 既有 pattern）、theming（CSS 變數 / theme context）、loading / error / empty / 斷線續傳等狀態。
- 相容性與版本影響（core 與 react 同版號）。
- 驗證方式（Vitest / react-demo）。

## 3) Implementation Tasks

分成可審查的小任務，每個對應到一或多個 `R#`。

- [ ] T1 — <task>（covers R1）
- [ ] T2 — <task>（covers R2, R3）
- [ ] T3 — <task>

## 4) Execution Log / Change Log

- YYYY-MM-DD — spec created（status: draft）。
- YYYY-MM-DD — <決策 / 狀態變更 / 實作註記 / 驗證結果>。

## Acceptance Test Matrix

每條 `R#` 至少對應一個驗證案例；狀態欄記錄 pass / fail / N/A。

| R#  | Acceptance criterion | Verification (手動步驟 / 測試檔 / 指令) | Status  |
| --- | -------------------- | --------------------------------------- | ------- |
| R1  | <criterion>          | <how verified>                          | pending |
| R2  | <criterion>          | <how verified>                          | pending |
| R3  | <criterion>          | <how verified>                          | pending |
