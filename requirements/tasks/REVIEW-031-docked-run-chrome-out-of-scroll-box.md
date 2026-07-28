# REVIEW-031 Review: Dock the run-chrome panels outside the thread scroll box

## Meta

- Task ID: `REVIEW-031`
- Status: `done`
- BUILD Task: `BUILD-031`
- Reviewed commit: `7e50a2c9d6d474a5abbcd7ba54b710629e74f4f0`
- Reviewed branch: `fix/32-docked-run-chrome-out-of-scroll-box`

---

## §1 Static Code Review

Scope = `BUILD-031 ## Coverage`：

- Library：`packages/react/src/components/chatbot/chatbot-body/`、`.../chatbot-footer/chatbot-footer.tsx`、`.../task-list/`、`.../subagent-list/`
- Demo：`apps/react-demo/src/mock-server/sse-mock.ts`、`apps/react-demo/src/app/routes/docked-run-chrome/`、`apps/react-demo/src/app/app.tsx`

### §1.1 Checklist

| 檢查項目                                                      | 對應規則                       | 結果 |
| ------------------------------------------------------------- | ------------------------------ | ---- |
| 有無 `any` / `as any`                                         | FRONTEND_RULE_COMMON §1.1      | ✅   |
| 有無 `@ts-ignore` / `eslint-disable` 規避型別或 lint 錯誤     | FRONTEND_RULE_COMMON §1.2      | ✅   |
| library code 有無殘留 `console.log`                           | FRONTEND_RULE_COMMON §1.3 §7   | ✅   |
| 有無 hardcode API key / endpoint / namespace                  | FRONTEND_RULE_COMMON §1.4      | ✅   |
| RxJS 訂閱 / EventSource / timer 是否都有 teardown             | FRONTEND_RULE_COMMON §1.5      | ✅   |
| react 是否只從 `@asgard-js/core` 公開進入點 import            | FRONTEND_RULE_COMMON §1.6      | ✅   |
| core 有無 import `react` / `react-dom` / DOM API              | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅   |
| 公開 API 變更是否經 `@deprecated` 過渡                        | FRONTEND_RULE_COMMON §1.7      | ✅   |
| 新增公開型別 / 函式 / 元件是否從 package 進入點導出           | FRONTEND_RULE_COMMON §2.2      | ✅   |
| 新增 message template 前置依賴是否齊備                        | FRONTEND_RULE_COMMON §2.3      | ✅   |
| 是否使用 `botProviderEndpoint`（非 deprecated 的 `endpoint`） | FRONTEND_RULE_COMMON §2.4      | ✅   |
| 導出函式 / 方法是否標明 explicit return type                  | FRONTEND_RULE_COMMON §3.1      | ✅   |
| 共用型別是否集中於 core `src/types/`，無跨檔重複 interface    | FRONTEND_RULE_COMMON §3.2      | ✅   |
| React 元件 props 是否完整型別化                               | FRONTEND_RULE_COMMON §4.1      | ✅   |
| 元件有無 hardcode 色值，而非走 theme / CSS 變數               | FRONTEND_RULE_COMMON §4.2      | ✅   |
| `react` / `react-dom` 是否維持 peerDependencies               | FRONTEND_RULE_COMMON §4.4      | ✅   |
| core 與 react 版本號是否一致                                  | FRONTEND_RULE_COMMON §5        | ✅   |
| 重複邏輯（≥2 次）/ 型別 / JSX 片段（≥3 次）是否已抽出         | FRONTEND_RULE_COMMON §6        | ✅   |
| 有無 `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME     | FRONTEND_RULE_COMMON §7        | ✅   |

逐項佐證（非 grep 可判定者）：

- **§1.4**：demo route 的 endpoint 由 `window.location.origin + '/mock-asgard'` 組出（`docked-run-chrome.tsx:13-15`），沿用 `/all-features` 既有寫法；library 側無任何 endpoint 字面值。
- **§1.5**：本次 library 改動只搬移 JSX 節點與 SCSS，未新增 subscription / EventSource / timer；既有 `useResizeObserver`（`chatbot-body.tsx:205`）teardown 未動。
- **§1.7 / §2.2**：`ChatbotBody` 的 props（`hideRunChrome?: boolean`）與 package 進入點導出完全未變，無 public API 變更，故無 deprecation 需求。
- **§3.1**：新增函式皆標回傳型別 —— `handleDockedRunChromeMock(...): Promise<void>`、`DockedRunChromeRoute(): ReactNode`、mock 內部 `next(): number` / `emit(...): Promise<void>` / `task(...): Promise<void>`。
- **§4.2**：本次唯一新增色值為 `chatbot-body.module.scss:39` 的 `border-top: 1px solid var(--asg-color-border, #434343)` —— 走 theme token，hex 僅為 `var()` fallback，與 `chat-header.module.scss:14`、`running-indicator.module.scss:16` 同一慣例。已於瀏覽器實證：Crazy 主題下該邊框 computed 值為 `rgb(146, 255, 140)`（= token `#92ff8c`），token 確實生效、未被寫死。
- **§5**：`@asgard-js/core` 與 `@asgard-js/react` 皆 `0.3.27`，react 的 `peerDependencies['@asgard-js/core']` 為 `^0.3.27`（本票未動版號）。
- **§6**：新增的 docked strip JSX 僅出現 1 次，無 ≥3 次重複；mock 內 `task()` / `emit()` 已抽為區域 helper。
- **§7**：mock server 的 `sleep()`（`setTimeout`）屬 SSE mock 的串流節奏，非 library code，且為 `sse-mock.ts` 內所有既有 scenario 的一致寫法（`handleAllFeaturesMock` 等），不算「library 內以 setTimeout 模擬 delay」。library coverage 內 `setTimeout` grep 為空。

### §1.2 Mechanical Grep

Grep results（空輸出 = ✅）：

```
### any / as any                                          → (no matches)
### ts-ignore / eslint-disable                            → (no matches)
### console.log                                           → (no matches)
### core reverse-dep on react (packages/core/src)         → (no matches)
### react deep-import into core internals (react/src)     → (no matches)
### hardcoded colors in library coverage (*.ts / *.tsx)   → (no matches)
### setTimeout in library coverage                        → (no matches)
### TODO / FIXME                                          → (no matches)
```

### §1.3 Build / Lint / Format

```
lint:packages:      PASS — 0 errors, 1 warning
                    （react-hooks/exhaustive-deps @ file-explorer/file-view.tsx:171，
                      既有問題、不在本票 Coverage 內）
format:check:       PASS — All matched files use Prettier code style
typecheck:packages: PASS — tsc --build 兩個 package 皆通過
build:              PASS — build:core + build:react 皆成功，無型別 / 建置錯誤
test:packages:      PASS — core 全數通過；react 4 files / 41 tests 全過
```

> 註：`_review_template.md` 列的 `npm run lint:check` 在本 repo 不存在；本 repo 的唯讀 lint 是 `npm run lint:packages`（底層 `eslint .`，無 `--fix`），與 `REVIEW_RULE.md §1.4` 一致。

### §1.4 Static Review Acceptance

- [x] §1.1 表格所有項目均已逐一核對並回報 ✅/❌
- [x] 無 ❌ 違規（故無檔案路徑 / 行號需列出）
- [x] §1.2 所有 grep 指令已執行，輸出已貼出
- [x] `npm run lint:packages` 無 ESLint 錯誤
- [x] `npm run build:core && npm run build:react` 綠燈

---

## §3 Functional Validation

環境：`npm run serve:react-demo`（http://localhost:4200），Chrome 1440×900。主要驗收頁 `/docked-run-chrome`（BUILD-031 新增），回歸頁 `/task-list`、`/subagent-list`、`/templates`、`/all-features-wide`。

### R# Result Matrix

| R#  | 驗收條件                                                   | 結果 | 佐證                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | strip 是 scroll 匡的兄弟節點、位於 thread 與 composer 之間 | Pass | `scroller.contains(strip) === false`；`strip.parentElement` = `.chatbot_body_wrapper`；`strip.previousElementSibling` = `.chatbot_body`（`[data-scrollable="true"]`）；strip `top` 431 === scroller `bottom` 431                                                                      |
| R2  | 使用者捲動 thread 時 strip 位置不動                        | Pass | `scrollTop` 1266 → 0 → 762 三態下，strip `top` 恆為 431、`left` 恆為 492                                                                                                                                                                                                              |
| R3  | 串流中 thread 高度變動時 strip 位置穩定                    | Pass | 90 取樣 / 250ms：thread `scrollHeight` 604 → 1524（28 次成長事件）；strip 高度 223 → `top` 只有 455、高度 246 → `top` 只有 431，**每個高度對應唯一 top**。對照修復前同樣取樣：`top` 出現 12 個值（444–522），且高度固定 221 時仍飄過 10 個值                                          |
| R4  | tasks / subagents 皆空 → 不 render、不占位                 | Pass | `stripExists false`；wrapper `children.length === 1`；scroller `bottom` === footer `top`（661 / 677 兩情境）；最後一則訊息與 footer 間距 12px（與改動前一致）；`/task-list` 切「無任務」後短對話不觸發捲動                                                                            |
| R5  | `hideRunChrome: true` → 不 render 內建面板                 | Pass | strip / `task_list` / `subagent_list` 三者皆不存在；scroller `bottom` === footer `top`                                                                                                                                                                                                |
| R6  | 長對話下 footer 固定在底、thread 內部捲動                  | Pass | footer `bottom` 757 === container `bottom` 757 且 `scrollHeight > clientHeight`；`/templates`（無 strip）footer `bottom` 741 === container `bottom` 741                                                                                                                               |
| R7  | strip 內容與 thread 內容、composer 對齊                    | Pass | 窄版三者 `left/right` 皆 492 / 867；`/all-features-wide` 三者皆 142 / 1342（max-width 1200 置中生效）                                                                                                                                                                                 |
| R9  | 面板超過 body 區一半時封頂並內部捲動                       | Pass | body 504 → strip 封頂 252（`ratio` 0.500）、`scrollHeight` 574、底部可達（餘 0）、`clipped` 0、thread 保住 252 且仍可捲、footer 釘底；`/all-features-wide` body 484→242、縮視窗 body 344→172，比例恆為 0.5；滾輪事件未被 `ChatbotContainer` `preventDefault`（`wheelBlocked: false`） |
| R8  | build 綠燈 + demo 走查                                     | Pass | build / lint / format / typecheck / test 全綠（見 §1.3）；`/docked-run-chrome`、`/task-list`、`/subagent-list`、`/templates`、`/all-features-wide`（Crazy 主題）皆走查通過，無視覺回歸                                                                                                |

### 邊界條件

- **空狀態**：兩個清單皆空 → 整條 strip（含 `border-top`）不存在，不留間隙（R4）。
- **主題**：Crazy 主題下 `border-top` computed 為 `rgb(146,255,140)`，隨 `--asg-color-border` 變動。
- **逃生口**：`hideRunChrome` 行為未變（R5）。
- **回歸**：移除 `.chatbot_body__content` 的 `min-height: 100%` 後，`/templates` 短對話仍不捲動、訊息靠頂（首則 `top` 173 = scroller `top` 157 + 16px padding）、footer 仍釘底。

### §3.1 Acceptance

- [x] Coverage 所列的所有 `R#`（R1–R8）均已執行 Step 1 靜態讀 code + Step 2 瀏覽器操作 + Step 3 邊界條件
- [x] 每個 `R#` 均已標記 Pass 並附實測數據
- [x] Vitest 已執行並通過（core 全數 + react 41 tests）
- [x] 空狀態 / 主題 / 逃生口 / 長短對話邊界均已確認

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

None.

### 第二輪（獨立 subagent 覆查，PR #365 開出後）

第一輪 §1/§3 只驗到「面板保持穩定」，沒有問「面板可以長到多高」。獨立覆查補上這一刀：

1. **BLOCKER（已修）** —— `.chatbot_body__docked` 只有 `flex-shrink: 0`、無 `max-height`，`TaskList` / `SubagentList` 自身也不設高度上限。任務一多，strip 就把 `flex: 1; min-height: 0` 的 scroll 匡壓成 0px，接著自己溢出 `.chatbot__thread_area` 的 `overflow: hidden` —— 對話完全消失，且面板下半截**沒有捲軸可達**。自行複測確認：DOM 灌 +6 / +12 / +20 列 task → thread 恆 0px、裁掉 213 / 1155 / 2725px；`-tall-` 情境（17 任務）→ thread 0px、裁掉 71px。**這相對 `main` 是回歸**：舊版面板在 scroll 匡內，再長也只是讓 thread 變長、兩邊都捲得到。修法見 BUILD-031 `R9` / `T8`（經使用者裁示後納入本 PR）。
2. **未能複現** —— 覆查另指「strip 高度變動會改 scroll 匡的 `clientHeight`，使 `distanceFromBottom` 跳動且無人校正，把使用者踢出 following 狀態」。實測收合／展開兩個面板 header（strip 246↔117、thread 258↔387），`scrollTop` 均由瀏覽器 scroll anchoring 同步調整（1266↔1137），`distanceFromBottom` 兩個方向都維持 0。覆查是以展開個別 task description 觀察到 dfb=72；我這邊的路徑無法重現。**列為待觀察，不視為已確認缺陷**。
3. **已修（小項）** —— `chatbot.tsx` 的 `hideRunChrome` 公開 JSDoc（會進 `.d.ts`）與 footer 註解仍寫舊定位（BUILD-031 T3 漏掉）；demo 文案「約 40 秒」與實際約 15 秒不符；`-tall-` demo 情境補上後，route 才真的能逼出高度上限（原本最多 3 任務，永遠碰不到失敗點）。

第二輪重驗：R1–R8 行為不變（一般 run 的 strip 246px < 252px 上限，不觸發內捲，畫面與第一輪相同）；R9 新增並通過。lint / format / typecheck / build / test 全數重跑綠燈。

### 附註（非本票缺陷、不需處理）

1. `task-list.module.scss:93`、`subagent-list.module.scss:98/106` 有裸 hex（`#faad14` 琥珀、`#ff4d4f` 紅）未走 token。屬 F-010 / F-012 既有寫法，本票未觸及該區塊，且已登記於 theme 系統技術債（另案 spec）。
2. `file-explorer/file-view.tsx:171` 的 `react-hooks/exhaustive-deps` warning 為既有問題，不在本票 Coverage。

---

## Execution Log

- 2026-07-28: REVIEW task created, paired with BUILD-031 (Status: `draft`).
- 2026-07-29: BUILD-031 完成，REVIEW 轉 `ready`；§1 靜態審查開始 (Status: `ready → in-progress`).
- 2026-07-29: §1 完成 —— 19 ✅ / 0 ❌，8 條 grep 全空，lint / format / typecheck / build / test 全綠。§3 完成 —— R1–R8 全數 Pass（含修復前後的取樣對照數據）(Status: `in-progress → done`).
- 2026-07-29: 第二輪獨立 subagent 覆查找到 1 個 BLOCKER（固定區無高度上限 → thread 被擠成 0px 且面板被裁切捲不到，相對 main 屬回歸）＋ 3 個小項。BLOCKER 經使用者裁示納入本 PR 修正（BUILD-031 R9 / T8），小項一併修完；另有 1 項覆查指控無法複現，列為待觀察。重驗 R1–R9 全數 Pass、靜態閘門全綠，0 BLOCKER (Status: `done`).
