# REVIEW-041 Review: Let a resumed subagent read as running again

## Meta

- Task ID: `REVIEW-041`
- Status: `done`
- BUILD Task: `BUILD-041`
- Reviewed commit: `9a7f82ca7249b84303edbb604395751f38c5cc3d`（工作樹未提交的改動；分支尚無新 commit）
- Reviewed branch: `fix/382-resumed-subagent-reads-running`

Scope（BUILD-041 `## Coverage` Files）：

- `packages/core/src/lib/subagent-reducer.ts` / `.spec.ts`
- `packages/core/src/lib/conversation.ts` / `.spec.ts`
- `packages/core/src/lib/derived-stores.ts` / `.spec.ts`
- `apps/react-demo/src/mock-server/sse-mock.ts`

---

## §1 Static Code Review

依 `REVIEW_RULE.md §1.1` 表格逐條核對上列變更檔案（本 repo 為 TS SDK library，Next.js 專屬項目標 N/A）。

### §1.1 Checklist

| 檢查項目                                                    | 對應規則                       | Result                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 有無 `any` / `as any`                                       | FRONTEND_RULE_COMMON §1.1      | ✅                                                                                                                         |
| 有無 `@ts-ignore` / `eslint-disable` 規避型別或 lint 錯誤   | FRONTEND_RULE_COMMON §1.2      | ✅                                                                                                                         |
| library code 有無殘留 `console.log`                         | FRONTEND_RULE_COMMON §1.3 §7   | ✅                                                                                                                         |
| 有無 hardcode API key / endpoint / namespace                | FRONTEND_RULE_COMMON §1.4      | ✅                                                                                                                         |
| RxJS 訂閱 / EventSource / timer 是否都有 teardown           | FRONTEND_RULE_COMMON §1.5      | ✅（本票無新訂閱）                                                                                                         |
| `@asgard-js/react` 只從 core 公開進入點 import              | FRONTEND_RULE_COMMON §1.6      | ✅（未動 react）                                                                                                           |
| `@asgard-js/core` 無 import `react` / `react-dom` / DOM API | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅                                                                                                                         |
| 公開 API 變更是否經 `@deprecated` 過渡                      | FRONTEND_RULE_COMMON §1.7      | ✅（無簽章變更）                                                                                                           |
| 新增公開型別 / 函式是否從 package 進入點導出                | FRONTEND_RULE_COMMON §2.2      | ✅（`resume` 為模組私有，刻意不導出）                                                                                      |
| 新增 message template 的前置依賴是否齊備                    | FRONTEND_RULE_COMMON §2.3      | N/A（無新 template）                                                                                                       |
| 是否使用 `botProviderEndpoint`                              | FRONTEND_RULE_COMMON §2.4      | N/A                                                                                                                        |
| 導出函式 / 方法是否標明 explicit return type                | FRONTEND_RULE_COMMON §3.1      | ✅                                                                                                                         |
| 共用型別集中於 core `src/types/`，無跨檔重複 interface      | FRONTEND_RULE_COMMON §3.2      | ✅（測試改用既有 `SubagentTerminalStatus`，未另立型別）                                                                    |
| React 元件 props 完整型別化                                 | FRONTEND_RULE_COMMON §4.1      | N/A（未動 react）                                                                                                          |
| 元件有無 hardcode 色值                                      | FRONTEND_RULE_COMMON §4.2      | N/A                                                                                                                        |
| `react` / `react-dom` 維持 peerDependencies                 | FRONTEND_RULE_COMMON §4.4      | ✅（未動 package.json）                                                                                                    |
| core 與 react 版本號一致                                    | FRONTEND_RULE_COMMON §5        | ✅ `0.3.41` / `0.3.41`                                                                                                     |
| 重複邏輯（≥2 次）是否已抽出                                 | FRONTEND_RULE_COMMON §6        | ✅（demo mock 的 child tool-call 三處共用，已抽 `subagentChildCall`；reducer 的 terminal→running 兩處共用，已抽 `resume`） |
| 有無 `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME   | FRONTEND_RULE_COMMON §7        | ✅（見 §1.2 註記）                                                                                                         |

**✅ 通過：17 項 · N/A：4 項 · ❌ 違規：0 項**

### §1.2 Mechanical Grep

Scope 限 Coverage 所列檔案。

```bash
grep -nE ': any\b|<any>|as any' <coverage-files>
→ packages/core/src/lib/subagent-reducer.spec.ts:126:  it('R5: any prefix folds to a consistent snapshot', () => {
   （既有測試「標題文字」內含 "R5: any"，非型別標註 → ✅）

grep -nE '@ts-ignore|@ts-nocheck|eslint-disable' <coverage-files>
→ (empty) ✅

grep -nE 'console\.log' <coverage-files>
→ (empty) ✅

grep -rnE "from 'react'|from \"react\"|react-dom" packages/core/src/
→ (empty) ✅

grep -rnE '@asgard-js/core/src|core/src/lib' packages/react/src/
→ (empty) ✅

grep -nE 'setTimeout' <coverage-files>
→ apps/react-demo/src/mock-server/sse-mock.ts:33:  return new Promise(resolve => setTimeout(resolve, ms));
   （既有的 mock server frame pacing helper，非本票新增、非 library code → ✅）

grep -nE 'TODO|FIXME' <coverage-files>
→ (empty) ✅

grep -nE '#[0-9a-fA-F]{3,6}|rgba\(' <coverage-files>
→ 僅命中註解與測試名稱中的 `issue #382` 字樣，無色值字面量 ✅
```

### §1.3 Build / Lint / Format

```
lint:packages:      PASS — NX Successfully ran target lint for 2 projects
format:check:       PASS — All matched files use Prettier code style!
typecheck:packages: PASS — NX Successfully ran target typecheck for 2 projects
build:core:         PASS — NX Successfully ran target build for project @asgard-js/core
build:react:        PASS — NX Successfully ran target build for project @asgard-js/react
```

> 註：`lint:packages` 必須在 `typecheck:packages` **之前**跑。`typecheck` 是 `tsc --build`，會產生 `packages/*/out-tsc/`（已被 `.gitignore` 排除但 ESLint 仍會掃），跑完後 lint 會誤報整批編譯產物的 `no-var` / `explicit-function-return-type`。本次審查先 `rm -rf packages/*/out-tsc` 再跑 lint。此為既有 repo 行為，與本票無關。

### §1.4 Static Review Acceptance

- [x] §1.1 表格所有項目均已逐一核對並回報 ✅ / N/A
- [x] 無 ❌ 違規
- [x] §1.2 所有 grep 已執行、輸出已貼出
- [x] `npm run lint:packages` 無 ESLint 錯誤
- [x] `npm run build:core && npm run build:react` 綠燈

---

## §3 Functional Validation

Harness：core Vitest（177 pass）＋ react Vitest（89 pass）＋ react-demo `/all-features`（http://localhost:4200）以 80–150ms 取樣記錄 `<SubagentList>` 狀態序列。

瀏覽器實測序列（修正後，二次驗證重跑）：

```
4001ms  子代理 | 1/1                              ← 第一個 subagent 完成
5843ms  子代理 | 2/2                              ← 兩張卡皆 terminal（修正前就停在這裡）
6081ms  子代理 | 1/2 | …查詢 Bolzen 訂單用料需求 | ↳ 執行中:重查用料明細（追加急單）
                                                  ← shape B：僅憑 child tool-call 復活
7201ms  子代理 | 0/2 | … | …補查替代料號 SWRCH38K 庫存 | ↳ 執行中:查詢可用庫存
                                                  ← shape A：第二次 subagent.start，描述更新
9040ms  子代理 | 1/2 | … | …補查替代料號 SWRCH38K 庫存 | 2 個工具
                                                  ← shape A 於第二次 subagent.complete 再度收斂
```

修正前對照（暫時還原 `subagent-reducer.ts` + `conversation.ts` 重跑）：停在 `2/2`，兩張卡都已累積「2 個工具」（resume 的 tool-call 確實有進來）卻仍顯示已完成 —— 即本 bug。截圖 `.github/screenshots/382-resumed-subagent-{before,after}.png`。

### R# Result Matrix

| R#  | Description                                                                  | Result | Note                                                                                                                |
| --- | ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| R1  | `start → complete → start` 折疊後為 `running`（shape A）                     | Pass   | `subagent-reducer.spec.ts` R1 case；瀏覽器 7201ms 對應                                                              |
| R2  | `start → complete → start → complete` 折疊後為 trailing complete 的終態      | Pass   | R2 case 斷言 `{status:'failed', summary:'第二輪結論'}`；瀏覽器 9040ms 對應                                          |
| R3  | `start → complete → toolStart` 為 `running`、同卡、不生第二張卡              | Pass   | 兩個 R3 case（狀態＋工具數、身分保留）；瀏覽器 6081ms 對應，卡片數維持 2                                            |
| R4  | 回到 `running` 時清掉上一輪 `summary`                                        | Pass   | 兩個 R4 case（含「仍在跑的卡不被動到」的反向 case）                                                                 |
| R5  | 同序列重放結果一致；其餘既有 reducer 測試不改而通過                          | Pass   | `R5: replay-safe` 已依 BUILD-041 `R5` 註記改寫為真實到達順序重放；`R4: stays running…(async-launched)` 等未改動照過 |
| R6  | adapter 依真實到達順序發出重發的 lifecycle event（shape A 端到端回到終態）   | Pass   | `conversation.spec.ts` 2 個 key 順序 case + `derived-stores.spec.ts` 4 個端到端 case                                |
| R7  | 重排 Map 位置不影響 thread 渲染；既有 conversation / derived-stores 測試全綠 | Pass   | `groupMessages` / `conversation-message-renderer` 均在 `type === 'subagent'` 早退，重排不可見；40 + 13 case 全過    |
| R8  | (Browser smoke test) demo 上 resume 的狀態轉換 + 截圖                        | Pass   | 上方序列；lint / format / typecheck / build / test 全綠                                                             |

### §3.1 Acceptance

- [x] 所有 R# 均已執行 Step 1（靜態讀 code）+ Step 2（Vitest / demo 操作）+ Step 3（邊界）
- [x] 每個 R# 均標記 Pass
- [x] 對應 Vitest 已執行並通過（core 177 / react 89）
- [x] 邊界確認：空事件序列（`reduceSubagents([]) === []`）、仍在跑的卡不被 `toolStart` 誤改、async-launched（無 `subagentComplete`）維持 running

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **公開資料層的行為契約變了，值得寫進 release note。** `Subagent.status` 過去單調收斂（一旦 terminal 就不再變），現在可以 `terminal → running` 往回走，且 `summary` 會在往回走時被清成 `undefined`。簽章沒動，故不觸發 §1.7 的 `@deprecated` 要求；但若消費端把「出現 terminal」當一次性事件（例如據此收合卡片或記錄完成時間），行為會變。發版時在 changelog 點名。
2. **shape B 結束時不會回到 terminal。** 後端在跨 turn resume 全程不發 lifecycle event，包含結束時的 `subagent.complete`，所以該卡在該 turn 之後會持續顯示 running。這是後端契約造成的，reducer 端無訊號可用；已記在 BUILD-041 Execution Log。若要收斂需 asgard-core 那側決定要不要補事件。
3. **issue 自列的 out-of-scope 仍在。** 冷啟動重播不含 subagent lifecycle event，純由 child tool-call 重建的卡片沒有 `subagentType` / `description`、且永遠顯示 running。需後端決定 history 帶什麼，非本票範圍。

---

## Execution Log

- 2026-08-04: REVIEW task created, paired with BUILD-041 (Status: `draft`).
- 2026-08-04: BUILD-041 done，本 task 轉 `ready`，待 review skill 執行 §1 + §3。
- 2026-08-04: §1 完成 —— 17 ✅ / 4 N/A / 0 ❌；8 條 grep 全數無實質命中；lint / format / typecheck / build 全綠。
- 2026-08-04: §3 完成 —— R1–R8 全數 Pass（core 177 + react 89 Vitest 綠燈，react-demo 取樣序列證實 `2/2 → 1/2 → 0/2 → 1/2` 的復活與再收斂）。0 BLOCKER，3 則 Minor 記錄於 Findings (Status: `ready → done`)。
