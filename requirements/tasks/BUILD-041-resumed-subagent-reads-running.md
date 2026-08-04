# BUILD-041 Let a resumed subagent read as running again

## Meta

- Task ID: `BUILD-041`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/382`
- Source spec: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/382` — issue body 本身即規格（含後端 asgard-core#168 已落地的兩種 shape 與其 replay 測試）。**PM 尚未把本 bug 開成 `tracking/asgard-js-sdk` 下的 BUG spec**，故比照 BUILD-040 以 issue 本體為 source spec。上游背景：`references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-012-subagent-清單面板呈現當前子代理.md`、`use-cases/UC-019-agent-與-subagent-事件累積成子代理清單.md`
- Complexity: `M`

---

## Brief

Subagent 不是 one-shot：orchestrator 可以對**既有**的 subagent 再下指令（同 `agentId`、child tool-call 仍帶原本的 `parentToolUseId`）。目前 `packages/core/src/lib/subagent-reducer.ts` 的狀態只進不退——只有 `subagentComplete` 能改 `status`，`subagentStart` 明文「never touch status」——所以一張已經 terminal 的 subagent 卡片在它**明顯又在工作**（新的 child tool-call 正在串進來）時，仍然顯示成已完成。

本票讓 reducer 承認「有新活動 = 又在跑」：`subagentStart` 打在 terminal 卡片上會回到 `running`（issue 的 shape A，同一 turn 內 resume）；`toolStart` 打在 terminal 卡片上也會回到 `running`（shape B，跨 turn resume——後端**不發任何 lifecycle event**，child tool-call 是唯一訊號，也是常見情況）。

**額外納入（超出 issue 自述的「data-layer only = reducer + spec」範圍，理由見下）**：reducer 並非直接吃串流，而是吃 `derived-stores.ts` 的 `conversationToSubagentEvents(...)`，後者以 **conversation Map 的首次插入順序**當作到達順序。而 `conversation.ts` 的 `onSubagentStart` / `onSubagentComplete` 用**固定 key**（`subagent:{parentToolUseId}:start` / `:complete`）寫入，JS `Map.set` 對既有 key **保留原位置**——於是 resume 的第二次 `start`／第二次 `complete` 都會「就地覆寫」而不會排到後面。後果：shape A 跑完之後，第二次 `complete` 折疊在**原本的舊位置**（早於 resume 期間的 `toolStart`），卡片會**永遠卡在 running**。也就是說只改 reducer 會把「永遠 terminal」換成「永遠 running」。故本票一併把這兩個 lifecycle message 改成 delete-then-set（重發時移到 Map 尾端），還原真實到達順序。這仍是 core 資料層、不動 UI。

**Already exists:** `packages/core/src/lib/subagent-reducer.ts`（`reduceSubagents` / `SubagentEvent` / `Meta`）、`packages/core/src/lib/subagent-reducer.spec.ts`、`packages/core/src/lib/derived-stores.ts`（`conversationToSubagentEvents` / `deriveSubagents`）、`packages/core/src/lib/conversation.ts`（`onSubagentStart` `:441` / `onSubagentComplete` `:463`）、`packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx`（`:210` 呼叫 `deriveSubagents`，並在 `groupMessages` 把 `type === 'subagent'` 全數濾掉 → 重排 Map 位置對 thread 渲染不可見）。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.4 | No hardcoded API key / endpoint / namespace — pass via `config`                                                           |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)            |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §2.3 | Template type (`core/src/types/sse-response.ts`) + enum (`core/src/constants/enum.ts`) exist before the react component   |
| §2.4 | Use `botProviderEndpoint`, not the deprecated `endpoint`                                                                  |
| §3.1 | Exported functions / methods declare explicit return types                                                                |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                       |
| §4.1 | React component props fully typed (no `any`)                                                                              |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context                                         |
| §4.4 | `react` / `react-dom` stay peerDependencies (not bundled)                                                                 |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                     |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When `reduceSubagents` folds `start → complete → start`（shape A），the system shall report that subagent's `status` as `'running'`. → T1
- `R2` When `reduceSubagents` folds `start → complete → start → complete`（shape A 跑完），the system shall report the terminal status carried by the trailing `complete`. → T1
- `R3` When `reduceSubagents` folds `start → complete → toolStart`（shape B，無任何 lifecycle event），the system shall report `status` as `'running'`, shall place that tool on the **same** card (`parentToolUseId` 不變), and shall not create a second card. → T1
- `R4` When a subagent 回到 `'running'`, the system shall drop the `summary` carried by the finished run, so a card that is working again does not display the previous run's conclusion. → T1
- `R5` When the same event sequence is folded again (replay 以到達順序重放), the system shall produce the identical snapshot（trailing `complete` 勝出）。**規劃期 R5 原寫「既有測試全數不改而通過」，實作時修正**：`subagent-reducer.spec.ts` 既有的 `R5: replay-safe — re-seeing agentStart/subagentStart never reverts a completed subagent` 斷言的正是本票要改掉的凍結行為（其事件序 `start → complete → start` 就是 shape A），故改寫為「以真實到達順序重放同一段」；其餘既有 case（尤其 `R4: stays running…(async-launched)`）維持不改而通過。 → T1, T4
- `R6` When `conversationToSubagentEvents` adapts a conversation in which `asgard.subagent.start` / `asgard.subagent.complete` 對同一個 `parentToolUseId` 出現第二次, the system shall emit those lifecycle events in their true arrival order relative to the surrounding child tool-calls（即第二次 `complete` 排在 resume 期間的 `toolStart` 之後），so that a shape-A subagent 跑完之後回到 terminal 而非卡在 `running`. → T2, T3
- `R7` When conversation 重排 subagent lifecycle message 的 Map 位置, the system shall keep the thread rendering unchanged（`groupMessages` 已濾掉 `type === 'subagent'`），and shall keep every existing `conversation.spec.ts` / `derived-stores.spec.ts` case passing. → T2, T3, T4
- `R8` (Smoke check) When the developer runs `npm run lint:packages && npm run format:check && npm run typecheck:packages`、`npm run build:core && npm run build:react`、`npm run test:packages`, and exercises a resumed subagent in the react-demo (`npm run serve:react-demo`, http://localhost:4200), the system shall show the subagent card flip back to running while the resumed run produces tool-calls, and settle terminal on its final `complete`, with no build errors — screenshot 存進 `.github/screenshots/`. → T5

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1–R5): TDD——先在 `subagent-reducer.spec.ts` 補會失敗的 shape A / shape B 案例，再改 `reduceSubagents`：`subagentStart` 與 `toolStart` 打在 terminal 卡片上時把 `status` 設回 `'running'` 並清掉 `summary`；更新檔頭與 `case` 內誤導的「never touch status」註解，寫清楚新的 replay-safety 論證。
- [x] T2 (R6, R7): 先在 `derived-stores.spec.ts` 補會失敗的 shape A 端到端案例（conversation → `deriveSubagents`），再把 `conversation.ts` 的 `onSubagentStart` / `onSubagentComplete` 改為重發時 delete-then-set，使 lifecycle message 依真實到達順序落在 Map 尾端。
- [x] T3 (R6, R7): 檢查 `conversationToSubagentEvents` 是否還有其他倚賴首次插入順序的假設；確認 child tool-call 的 `toolStart`/`toolComplete` 折疊順序在 resume 情境下仍正確。
- [x] T4 (R5, R7): 跑 `npm run test:packages`，確認既有 core / react 測試全綠。
- [x] T5 (R8): 跑 `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react`；在 react-demo 用 mock/showcase route 觸發 resume 情境（shape A 與 shape B 各一），瀏覽器實測 SubagentList 狀態轉換並截圖。

---

## Coverage

Use Cases: `R1` `R2` `R3` `R4` `R5` `R6` `R7` `R8`（UC-019 / UC-020 的 subagent 累積與面板呈現為上游背景）

Files:

- `packages/core/src/lib/subagent-reducer.ts`（core）— 新增 `resume()`；`subagentStart` / `toolStart` 打在 terminal 卡片上時回到 `running` 並清 `summary`；更新檔頭與 replay-safety 註解
- `packages/core/src/lib/subagent-reducer.spec.ts`（core）— 新增 `issue #382` describe（6 case）；改寫既有 `R5: replay-safe` 為「以真實到達順序重放」
- `packages/core/src/lib/conversation.ts`（core）— `onSubagentStart` / `onSubagentComplete` 改 delete-then-set，重發的 lifecycle message 移到 Map 尾端
- `packages/core/src/lib/conversation.spec.ts`（core）— 新增 2 個 key 順序 case
- `packages/core/src/lib/derived-stores.ts`（core）— 更新 `conversationToSubagentEvents` 的到達順序註解
- `packages/core/src/lib/derived-stores.spec.ts`（core）— 新增 `issue #382` describe（4 case，shape A / B 端到端）＋ `subagentComplete` / `childTool` helper
- `apps/react-demo/src/mock-server/sse-mock.ts`（demo）— 抽出 `subagentChildCall` helper（§6，3 處共用）；`/all-features` showcase 尾段補 shape B（無 lifecycle event）與 shape A（第二次 `subagent.start` → `complete`）兩段 resume
- `.github/screenshots/382-resumed-subagent-before.png` / `-after.png` — 修正前後對照

---

## Execution Log / Change Log

- 2026-08-04: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/382 (Status: `draft`). 規劃期複查發現 issue 自述的「data-layer only = reducer + spec」不足以讓修正在 UI 上成立：reducer 吃的是 `conversationToSubagentEvents` 依 conversation Map **首次插入順序**產出的事件，而 lifecycle message 用固定 key 就地覆寫，第二次 `complete` 排不到 resume 的 `toolStart` 之後 ⇒ 只改 reducer 會讓 shape A 從「永遠 terminal」變成「永遠 running」。故加入 `R6`/`R7`（conversation lifecycle message 重排），範圍仍限 core 資料層。
- 2026-08-04: 使用者確認含 `R6`/`R7`，開分支 `fix/382-resumed-subagent-reads-running` 動工 (Status: `draft → ready → in-progress`)。
- 2026-08-04: T1 TDD 完成 —— 先補 6 個 shape A / shape B failing case（4 fail），再加 `resume()`；同時改寫既有 `R5: replay-safe` case（原斷言正是要改掉的凍結行為，見 `R5` 註記）。
- 2026-08-04: T2/T3 完成 —— `conversation.ts` 兩個 lifecycle handler 改 delete-then-set（先補 2 個 key 順序 failing case），`derived-stores.spec.ts` 補 4 個端到端 case，並更新 `conversationToSubagentEvents` 的到達順序註解。
- 2026-08-04: T4 完成 —— core 177 / react 89 全綠。
- 2026-08-04: T5 完成 —— lint ✅ / format:check ✅ / typecheck ✅ / build core+react ✅。demo `/all-features` 補兩段 resume（並抽出 `subagentChildCall` helper，§6）。瀏覽器實測以 100ms 取樣記錄面板狀態序列：`2/2`（雙卡 terminal）→ `1/2`（shape B：toolu_A 僅憑 child tool-call 回到執行中）→ `0/2`（shape A：toolu_B 收到第二次 `subagent.start`、描述換成「補查替代料號 SWRCH38K 庫存」）→ `1/2`（toolu_B 於第二次 `subagent.complete` 再度收斂 —— 證明重排生效）。修正前對照（暫時 stash 兩個 source 檔重跑）停在 `2/2`，兩張卡都標「2 個工具」卻顯示已完成，即本 bug。截圖 `.github/screenshots/382-resumed-subagent-{before,after}.png`。
- 2026-08-04: 全部 R1–R8 達成 (Status: `in-progress → done`)。**已知且不在本票**：shape B 結束時後端同樣不發 `subagent.complete`，故該卡在該 turn 之後仍顯示 running（後端契約，非 reducer 可補）；以及 issue 自列的 out-of-scope（冷啟動 replay 不含 lifecycle event）。
