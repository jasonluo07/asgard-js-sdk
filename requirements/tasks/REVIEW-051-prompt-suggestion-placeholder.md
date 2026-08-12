# REVIEW-051 Review: Surface the next-turn prompt suggestion in the composer placeholder

## Meta

- Task ID: `REVIEW-051`
- Status: `done`
- BUILD Task: `BUILD-051`
- Reviewed commit: `ddd8b94cbb4320bffa085007b4b767889a20a9f6`
- Reviewed branch: `feat/62-prompt-suggestion-placeholder`

---

## §1 Static Code Review

### §1.1 Checklist

| 檢查項目                                      | 結果                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                              | ✅ 無（grep 空輸出）                                                                                                                  |
| `@ts-ignore` / `eslint-disable`               | ✅ 本次無新增（唯一命中是既有的 `use-channel.ts:424`，見 §1.2 判讀）                                                                  |
| library code 殘留 `console.log`               | ✅ 本次無新增（同上，既有那筆由 `client?.debugMode` 控制，屬 §1.3 允許的 debug 選項）                                                 |
| hardcode API key / endpoint / namespace       | ✅ 無 —— demo 路由的 endpoint 由 `window.location.origin` 組出本地 mock，非寫死的真實服務                                             |
| RxJS 訂閱 / EventSource / timer teardown      | ✅ 本次只新增一個訂閱（`usePromptSuggestion` 的 `promptSuggestion$`），`subscribe` 回傳 `() => subscription.unsubscribe()`            |
| react 只從 core 公開進入點 import             | ✅ 無 `@asgard-js/core/src` / `core/src/lib` 深挖（grep 空輸出）                                                                      |
| core 反向 import react / react-dom / DOM      | ✅ 無（掃 `packages/core/src/` 空輸出）；本次 core 改動只用 rxjs 與既有型別                                                           |
| 公開 API 變更經 `@deprecated` 過渡            | ✅ 純新增，無簽章變更、無移除 —— `EventType` / `Fact` / `ChannelStates` / `UseChannelReturn` / context 都只多欄位                     |
| 新增公開型別 / hook 從 package 進入點導出     | ✅ 已用建置產物實證（見 §1.3「API surface」）                                                                                         |
| 新 EventType / fact 型別前置於使用處          | ✅ `EventType.PROMPT_SUGGESTION` 與 `PromptSuggestionEventData` 先於 `channel.ts` 的 fold 與 react 端使用                             |
| 使用 `botProviderEndpoint`                    | ✅ demo 路由用 `botProviderEndpoint`，未用 deprecated 的 `endpoint`                                                                   |
| 導出函式標明 explicit return type             | ✅ `getPromptSuggestion(): string \| null`、`clearPromptSuggestion(): void`、`usePromptSuggestion(...): string \| null` 皆標注        |
| 共用型別集中、無重複 interface                | ✅ `PromptSuggestionEventData` 只定義在 core `src/types/sse-response.ts`；react 端不另立型別                                          |
| React 元件 props 完整型別化                   | ✅ `ChatComposer` props 未變動；demo 的 `SuggestionPanel` / 測試的 `Harness` props 皆有型別                                           |
| 元件 hardcode 色值                            | ✅ 本次未新增色值字面量（`git diff` 對 scss 的新增行無色碼；既有兩行是 CSS 變數的 fallback）                                          |
| react / react-dom 維持 peerDependencies       | ✅ 未更動（`peerDependencies` 仍為 `@asgard-js/core` / `react` / `react-dom`）                                                        |
| core 與 react 版本號一致                      | ✅ `0.3.59` / `0.3.59`（peerDep 亦為 `0.3.59`；發版時另行同步 bump）                                                                  |
| 重複邏輯 / 型別 / JSX 已抽出                  | ✅ 未平行造第二套 —— 資料層完全沿用 `channelTitle` 那條既有路徑；輸入框高度收斂成單一量測點（見 Findings）                            |
| `setTimeout` mock / 死碼 / TODO / FIXME       | ✅ 無死碼、無 TODO/FIXME。新增的 `setTimeout` 只在 `apps/react-demo/src/mock-server`（mock SSE 的既有 `sleep` 慣例，非 library code） |
| 使用者可見字串全走 `t(locale, key)`、三語系齊 | ✅ `composer.suggestionHint` / `composer.suggestionTitle` 三語系皆備，並有測試釘住                                                    |

### §1.2 Mechanical Grep

掃描範圍：BUILD-051 `## Coverage` 列出的 15 個 `.ts` / `.tsx` 檔（以 bash 陣列 `"${FILES[@]}"` 傳入，逐條記錄 exit code）。

```
### any / as any                     [exit=1] （空輸出 ✅）
### ts-ignore / eslint-disable       [exit=0]
packages/react/src/hooks/use-channel.ts:424:        // eslint-disable-next-line no-console
### console.log                      [exit=0]
packages/react/src/hooks/use-channel.ts:425:        console.log(
### setTimeout                       [exit=0]
packages/core/src/lib/channel.ts:95:  private forceStopTimer?: ReturnType<typeof setTimeout>;
packages/core/src/lib/channel.ts:783:    this.forceStopTimer = setTimeout(() => {
packages/core/src/lib/channel.spec.ts:716:const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
packages/react/src/components/chatbot/chatbot-footer/chat-composer.tsx:261:    setTimeout(() => {
apps/react-demo/src/mock-server/sse-mock.ts:33:  return new Promise(resolve => setTimeout(resolve, ms));
### core reverse-dep on react        [exit=1] （空輸出 ✅）
### react deep-import into core/src  [exit=1] （空輸出 ✅）
### hardcoded colors (changed files) [exit=0]
chat-composer.module.scss:92:  color: var(--asg-color-text-primary, #e0e0e0);
chat-composer.module.scss:168:  color: var(--asg-color-primary-on-primary, #fff);
chat-composer.tsx:113 / :114、asgard-service-context.tsx:347  ← 命中的是註解裡的 issue 編號「#409」
```

判讀（每一筆都以 `git diff HEAD~1` 覆核是否為本次引入）：

- `use-channel.ts:424-425` 的 `console.log` 與其 `eslint-disable`：**既有程式碼，非本次引入**，且由
  `client?.debugMode` 包住，符合 §1.3「由明確 debug 選項控制」的豁免。
- `setTimeout` 五筆中，`channel.ts` 兩筆（force-stop timer）、`channel.spec.ts`、
  `chat-composer.tsx:261`（iOS Safari focus 捲動）皆為既有；本次新增的只有 `sse-mock.ts` 的 `sleep`，
  那是 demo mock SSE server 重放串流節奏的既有慣例（每個既有 handler 都這樣寫），不是 library code
  裡的假延遲。
- 色值四筆：兩筆 scss 是既有的 CSS 變數 fallback（`git diff` 的新增行無任何色碼），兩筆 `.tsx` 是註解
  中的 `#409` 議題編號，屬 grep 誤判。

### §1.3 Build / Lint / Format

```bash
npm run lint:packages          # PASS — 0 errors（3 warnings 皆在未變更的既有檔案）
npm run format:check           # PASS — All matched files use Prettier code style!
npm run typecheck:packages     # PASS — Successfully ran target typecheck for 2 projects
npm run build:core             # PASS — 0 errors，✓ built in 1.50s
npm run build:react            # PASS — ✓ built in 7.18s
```

**API surface（§2.2 實證）** —— 對**建置產物**（`packages/*/dist/index.d.ts`）而非原始碼做型別解析，
證明新 API 真的從 package 進入點出得去：

```ts
import { EventType, type PromptSuggestionEventData, type ChannelStates } from '<core>/dist/index';
import { usePromptSuggestion } from '<react>/dist/index';

const ev: EventType = EventType.PROMPT_SUGGESTION;
const fact: PromptSuggestionEventData = { suggestion: 'x' };
const slice: ChannelStates['promptSuggestion'] = null;
const hook: (c: null) => string | null = usePromptSuggestion;
```

`npx tsc --noEmit --strict` → **PASS**。

### §1.4 Static Review Acceptance

- [x] §1.1 表格 20 項全數核對並標記
- [x] 無 ❌ 違規（3 筆 grep 命中已逐條以 `git diff` 覆核為既有程式碼或誤判）
- [x] §1.2 所有 grep 已執行，**含 exit code**，輸出貼出
- [x] `npm run typecheck:packages` 綠
- [x] `npm run lint:packages`（0 errors）+ `npm run format:check` 綠
- [x] `npm run build:core && npm run build:react` 綠

---

## §3 Functional Validation

Vitest 覆蓋 store 與鍵盤邏輯；UI 在 Playwright 驅動的真實 Chromium 上以真實按鍵（`page.keyboard.press`）
操作確認。測試計數：core 196 passed（含本張 +9）、react 186 passed（含本張 +17）。

**兩批瀏覽器證據，模式不同，分開記錄：**

- **headless**（`playwright-mcp --headless`，UA 為 `HeadlessChrome/151`）—— react-demo `/prompt-suggestion`
  的 R1–R12。判準全是 DOM 斷言（`value` / `activeElement` / `placeholder` / `title` /
  `clientHeight` vs `scrollHeight`），這類在 headless 與 headed 無已知差異；截圖 `f-028-01`～`f-028-06`
  出自這批。**這一節原本誤記為 headed，已更正** —— F-030 記載過 headless 假通過的前例，標籤必須誠實。
- **headed**（真實視窗，UA 無 `Headless`）—— 消費端 Mimir / Sindri 接 dev 後端的實機驗收，截圖
  `f-028-07`～`f-028-09`。

### R# Result Matrix

| R#  | Description                                          | Result | Note                                                                                                                                                                |
| --- | ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 空輸入框顯示建議 + `⇥ Tab`                           | Pass   | headless（DOM 斷言）：placeholder `那前一週的數字是多少？ ⇥ Tab`；截圖 `f-028-01`                                                                                   |
| R2  | Tab 填入、焦點留在輸入框、不送出、可編輯             | Pass   | headless（DOM 斷言）：value 填入、`activeElement` 仍是 textarea、使用者泡泡數 **0**；截圖 `f-028-02`。長建議採用後框高 108px、內容全可見（見 Findings Important 1） |
| R3  | 沒有建議時 `inputPlaceholder` 原樣、無提示字元       | Pass   | headless（進房與「沉默」腳本）：`輸入你的問題`，`title` / `aria-description` 皆 `null`；截圖 `f-028-03`                                                             |
| R4  | 已有字時不顯示建議；Tab 維持移焦、不覆蓋             | Pass   | headless（DOM 斷言）：Tab 後焦點到 Send，文字未變                                                                                                                   |
| R5  | `Shift+Tab` 一律不攔                                 | Pass   | headless（DOM 斷言）：焦點反向移到 Close，建議仍在、輸入框未變                                                                                                      |
| R6  | IME 組字中 Tab 交還輸入法                            | Pass   | headless（DOM 斷言）：`compositionstart` 後真實按 Tab → 未採用、建議仍在、焦點依原生行為移動                                                                        |
| R7  | `title` / `aria-description` 有／無的兩種狀態都正確  | Pass   | 有建議時兩者皆為完整說明；無建議時兩者皆不存在（headless + Vitest；headed 消費端 `f-028-07`／`f-028-09` 亦見）                                                      |
| R8  | 採用後 / 送出後 / 新 run 開始清空                    | Pass   | headless 觀察採用後 store → `null`；headed 消費端亦複驗（`f-028-08`）；三條清除路徑各有 core 測試（`clearPromptSuggestion()` / `sendMessage()` / `run.init`）       |
| R9  | 重整 / rejoin 後無建議、不 loading、不報錯、不擋輸入 | Pass   | headless（DOM 斷言）：載入後 store 為 null、textarea `disabled=false`、無 loading；core 測試「a replayed transcript carries no suggestion」                         |
| R10 | 一個 run 內兩則 → 顯示最後一則                       | Pass   | headless「兩則」腳本：只呈現第二則；core 測試 last-wins                                                                                                             |
| R11 | store 語意：晚訂閱者立刻拿到當前值                   | Pass   | core 測試斷言首次發射即為當前快照、重複值被 `distinctUntilChanged` 擋掉；demo 框外面板 render badge 佐證                                                            |
| R12 | en-US / zh-TW（含 ja-JP）文案齊、切語系即時反映      | Pass   | headless 切 zh-TW → `按 Tab 採用這句建議`，`⇥ Tab` 不變、建議本身未被翻譯；Vitest 釘三語系                                                                          |
| R13 | 舊消費端行為不變（純新增、無簽章變更）               | Pass   | 既有測試未改動即全通過；§1.3 的 API surface 檢查顯示只新增、未變更                                                                                                  |
| R14 | (Smoke) build + 測試 + demo 走完 R1–R12              | Pass   | build 綠、382 tests 綠、demo 四個腳本（一般／沉默／兩則／很長）走完；另在 Mimir / Sindri 接 dev 後端實機複驗（見下）                                                |

### §3.1 Acceptance

- [x] 每條 R# 都執行 Step 1（讀 code / 型別）+ Step 2（Vitest／瀏覽器操作）+ Step 3（邊界）
- [x] 每條 R# 標記結果並附實際觀察值
- [x] 邊界情境確認：無建議、建議過長（截斷、不推開版面）、preview mode（不誘導按不到的動作）、awaiting consent（維持自己的 placeholder）、連續兩輪
- [x] UI 證據存於 `.github/screenshots/f-028-*.png`：demo 六張出自 headless（DOM 斷言為主），消費端三張出自 headed 真實視窗

---

### §3.2 消費端實機驗收（headed，接 dev 後端）

以 `npm pack` 產出 `0.3.60-local` 裝進消費端（`--no-save`），在**有視窗的** Chromium
（`Chrome/151.0.7922.34`，UA 無 `Headless`）操作，並在頁面上攔 SSE 串流逐一比對 `eventType`：

| 產品                                                    | 結果                                                                                                                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sindri**（`asgard-ai-agent-hub-web`，locale zh-TW）   | 真實 `asgard.prompt_suggestion` 抵達 → placeholder `再加一個 multiply 函式 ⇥ Tab`、`title` `按 Tab 採用這句建議`；按 Tab → 文字進輸入框、焦點留在輸入框、**沒有送出**（`f-028-07` / `f-028-08`） |
| **Mimir**（`asgard-ai-data-insight-web`，locale en-US） | 同一則建議（中文）+ 英文 `title` `Press Tab to use this suggestion` —— 正好佐證「提示文案跟語系、建議內容不翻譯」；按 Tab 同樣只填不送（`f-028-09`）                                             |
| **Odin**（`asgard-ai-platform-web`）                    | **未驗** —— 該 dev 帳號沒有 workspace，進站即要求建立；在他人 dev 帳號建 workspace 已徵詢後略過                                                                                                  |

**觸發條件（後端 e2e 已寫明，值得記下來）**：CLI 有兩道跳過條件 —— `early_conversation`（對話不足兩則
assistant 訊息）與 `cache_cold`（**上一輪**的 `input + cache_creation + output > 10000`）。一開始用重量級
資料分析問題連問四輪都拿不到建議，SSE 攔截顯示後端根本沒發；改用後端 e2e 的配方（兩個便宜回合：建
`calc.py` → 加 `subtract`）後第二輪即穩定出現。**驗這個功能不要用大輸出的回合。**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

1. **［已於 BUILD 階段修復］採用長建議後文字看不見。** 採用時在 keydown handler 內同步量測輸入框高度，
   而該處讀到的是 React 尚未 commit 的舊 DOM：多行建議被留在 `clientHeight` 36px / `scrollHeight` 108px
   且 `overflow: hidden`，使用者既看不到也捲不到自己剛採用的文字。改為 `useLayoutEffect` 依 `value`
   量測（commit 之後），所有「從外部塞值」的路徑都受惠 —— 包含既有的 `ChatbotRef.setInputValue`，那條
   路徑先前有同一個潛在缺陷。已由回歸測試釘住，並確認該測試對舊寫法會失敗
   （`expected '36px' to be '222px'`）。打字長高（36 → 84 → 204px）與送出後縮回（→ 36px）已在瀏覽器
   複驗無回歸。

### Minor (nice to have)

1. **建議過長時 `⇥ Tab` 提示會被裁掉。** placeholder 是「建議 + 提示」單行呈現，超長時尾端的 `⇥ Tab`
   一併被裁，使用者可能看不出有 Tab 這個捷徑。與**權威原型 `ChatInput.tsx` 行為一致**（同樣是單行輸入
   框 + 同一種字串串接），且後端把建議限制在約 2–12 詞 / 100 字元內，實務上不會發生；此處只留紀錄，
   不改設計。若日後被回報，選項是把提示改成輸入框右側的獨立元素（會動到版面，需 PM 決定）。
2. **`useLayoutEffect` 現在每次按鍵都會多量一次高度。** 與原本 `onChange` 內的量測是同一份工作量級
   （原本那次已移除），實測打字無感；記錄以備日後效能追查。

---

## Execution Log

- 2026-08-12: REVIEW task created, paired with BUILD-051 (Status: `draft`).
- 2026-08-12: §1 靜態審查完成 —— 20 項全 ✅ / 0 ❌（3 筆 grep 命中經 `git diff` 覆核為既有程式碼或註解誤判）；lint 0 errors、format、typecheck、build:core + build:react 全綠；另以建置產物做 API surface 型別檢查通過（Status: `ready → in-progress`）。
- 2026-08-12: §3 功能驗收完成 —— R1–R14 全 Pass（Chromium 實際操作 + 382 passed tests；demo 那批為 headless，消費端實機那批為 headed）。消費端 Mimir / Sindri 接 dev 後端實機複驗通過（Odin 因帳號無 workspace 未驗）；並更正先前把 demo 那批誤記為 headed 的敘述。無 BLOCKER；1 項 Important 已於 BUILD 階段修復並附回歸測試，2 項 Minor 僅記錄（Status: `in-progress → done`）。
