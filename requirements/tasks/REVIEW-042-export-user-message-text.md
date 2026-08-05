# REVIEW-042 Review: Export the user text content renderer (`UserMessageText`)

## Meta

- Task ID: `REVIEW-042`
- Status: `done`
- BUILD Task: `BUILD-042`
- Reviewed commit: `13c9310` (branch `fix/53-export-user-message-text`; re-run after the `Time` export was added in `8676bdb`)
- Reviewed branch: `fix/53-export-user-message-text`

---

## §1 Static Code Review

Scanned the files in BUILD-042 `## Coverage` against `FRONTEND_RULE_COMMON.md`.

### §1.1 Checklist

| 檢查項目                                                       | 對應規則                       | Result                                                                                                                                                                   |
| -------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 有無 `any` / `as any`                                          | FRONTEND_RULE_COMMON §1.1      | ✅                                                                                                                                                                       |
| 有無 `@ts-ignore` / `eslint-disable` 規避型別或 lint 錯誤      | FRONTEND_RULE_COMMON §1.2      | ✅                                                                                                                                                                       |
| library code 有無殘留 `console.log`                            | FRONTEND_RULE_COMMON §1.3 §7   | ✅                                                                                                                                                                       |
| 有無 hardcode API key / endpoint / namespace                   | FRONTEND_RULE_COMMON §1.4      | ✅                                                                                                                                                                       |
| RxJS 訂閱 / EventSource / timer teardown                       | FRONTEND_RULE_COMMON §1.5      | ✅ n/a — 本次無訂閱 / timer                                                                                                                                              |
| `@asgard-js/react` 只從 core 公開進入點 import                 | FRONTEND_RULE_COMMON §1.6      | ✅                                                                                                                                                                       |
| `@asgard-js/core` 無 import `react` / `react-dom` / DOM        | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅ core 未改動，grep 亦空                                                                                                                                                |
| 公開 API 變更經 `@deprecated` 過渡（無未標示 breaking change） | FRONTEND_RULE_COMMON §1.7      | ✅ 純新增 export；`TextTemplate` 輸出不變                                                                                                                                |
| 新增公開元件從 package 進入點導出（`export type` 明確）        | FRONTEND_RULE_COMMON §2.2      | ✅ `text-template/index.ts` → `templates` → `components` → root；`UserMessageTextProps` 與 `TimeProps` 皆為 `export interface`；`templates/index.ts` 補上缺漏的 `./time` |
| 新增 message template 前置依賴齊備                             | FRONTEND_RULE_COMMON §2.3      | ✅ n/a — 非新 template，無新 wire 型別 / enum                                                                                                                            |
| 使用 `botProviderEndpoint`（非 deprecated `endpoint`）         | FRONTEND_RULE_COMMON §2.4      | ✅ demo route 沿用 `botProviderEndpoint: 'skip'`                                                                                                                         |
| 導出函式標明 explicit return type                              | FRONTEND_RULE_COMMON §3.1      | ✅ `UserMessageText(...): ReactNode`                                                                                                                                     |
| 共用型別集中、無跨檔重複 interface                             | FRONTEND_RULE_COMMON §3.2      | ✅ `UserMessageTextProps` 只此一處；未重造 `ConversationUserMessage`                                                                                                     |
| React 元件 props 完整型別化（無 `any`）                        | FRONTEND_RULE_COMMON §4.1      | ✅ `{ children: ReactNode; className?: string }`                                                                                                                         |
| 元件無 hardcode 色值，走 theme / CSS 變數                      | FRONTEND_RULE_COMMON §4.2      | ✅ 讀 `theme.userMessage.{color,backgroundColor}`；見 Minor 1                                                                                                            |
| `react` / `react-dom` 維持 peerDependencies（未被打包）        | FRONTEND_RULE_COMMON §4.4      | ✅ peerDeps 未動；`dist` 無 bundled react                                                                                                                                |
| core 與 react 版本號一致                                       | FRONTEND_RULE_COMMON §5        | ✅ 皆 `0.3.43`（本 cycle 不升版）                                                                                                                                        |
| 重複邏輯 / 型別 / JSX 片段已抽出                               | FRONTEND_RULE_COMMON §6        | ✅ 泡泡只剩一份；`styles` memo 的死 `'user'` case 已移除                                                                                                                 |
| 無 `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME        | FRONTEND_RULE_COMMON §7        | ✅                                                                                                                                                                       |

**✅ 通過：19 項（含 2 項 n/a） / ❌ 違規：0 項**

### §1.2 Mechanical Grep

Coverage 目錄：`packages/react/src/components/templates/text-template`、
`packages/react/src/context/asgard-template-context.tsx`、
`packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx`、
`apps/react-demo/src/app/routes/composed-bot-text`、`packages/react/src/components/templates/time`、
`packages/react/src/components/templates/index.ts`。

```
### any                      → (empty) ✅
### ts-ignore/eslint-disable → (empty) ✅
### console.log              → (empty) ✅
### hardcoded colors (.ts/.tsx) → (empty) ✅
### setTimeout               → (empty) ✅
### TODO/FIXME               → (empty) ✅
### core→react (packages/core/src/)        → (empty) ✅
### react deep-import core/src (packages/react/src/) → (empty) ✅
```

### §1.3 Build / Lint / Format

```
lint:packages:       PASS — 0 errors, 1 warning（既有且不相關：file-explorer/file-view.tsx:174 exhaustive-deps）
format:check:        PASS — All matched files use Prettier code style
typecheck:packages:  PASS — Successfully ran target typecheck for 2 projects
build:core/react:    PASS — Successfully ran target build（無型別 / 建置錯誤）
test (react):        PASS — 13 files / 92 tests（含本 cycle 新增 3 項）
```

### §1.4 Static Review Acceptance

- [x] §1.1 表格所有項目均已逐一核對並回報 ✅/❌
- [x] 無 ❌ 違規（故無需列行號）
- [x] §1.2 所有 grep 指令已執行，輸出已貼出
- [x] `npm run lint:packages` 無 ESLint 錯誤
- [x] `npm run build:core && npm run build:react` 綠燈

---

## §3 Functional Validation

### R# Result Matrix

| R#  | Description                                                                                                          | Result | Note                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `UserMessageText` 從 package entry 導出、`children: ReactNode`、渲染 themed `.text--user`、無 `TemplateBox` / `Time` | Pass   | 產物 `dist/components/templates/text-template/user-message-text.d.ts` 含 `UserMessageTextProps { children: ReactNode }` 與 `UserMessageText(...): ReactNode`；barrel 鏈 `index.d.ts → './user-message-text'` 完整。Vitest 驗證輸出為單一 themed `div`、不含 `asgard-time`。                                                                                                                     |
| R2  | 預設 `<Chatbot>` 的 user TEXT 訊息輸出不變                                                                           | Pass   | `text-template.spec.tsx`「keeps the user message bubble and timestamp」續綠；新測斷言預設列**完整包含**自組泡泡的 markup（`toContain`，並先以 regex 擋掉空字串的 vacuous pass）。Demo Default 模式量測與 Composed 一致，時間戳仍在（截圖 `00:54`）。                                                                                                                                            |
| R3  | 自組 `TemplateBox type="user"` + `UserMessageText` + `Time` 與預設列視覺一致、可放 JSX                               | Pass   | Demo `/composed-bot-text` @1280×900：Composed / Default 的 user 泡泡 `bubbleRight 796/795`、`background rgb(71,103,235)`、`padding 8px 12px`、`border-radius 8px 0 8px 8px`、`max-width 75%` 相同，時間戳皆為 `09:09`／`rgb(140,140,140)`（Composed 組了 `Time`，見 R6）。1px 位移為兩列共有（scrollbar），非泡泡本身差異。mention chip（`<span>`）正常渲染於泡泡內。                           |
| R4  | `MessageContainer` doc comment 改述依 `message.type` 的外殼                                                          | Pass   | `dist/context/asgard-template-context.d.ts` 已帶新註解（含「wrap the content in `UserMessageText` (user) or `BotMessageText` (bot)」）；`conversation-message-renderer.tsx` 內部註解同步更正，行為未動。                                                                                                                                                                                        |
| R5  | (Smoke check) build 綠燈 + demo 兩模式渲染正確、0 console error                                                      | Pass   | build 綠燈；Playwright 量測期間 `console` / `pageerror` 收集為 `[]`。截圖：`.github/screenshots/issue-53-user-row-{composed,default}.png`。                                                                                                                                                                                                                                                     |
| R6  | `Time` + `TimeProps` 從 package entry 匯出，自組列能顯示與預設列相同的時間戳；無 `time` 時不渲染                     | Pass   | `templates/index.d.ts:16` 已有 `export * from './time'`（原本是唯一缺的 barrel entry）、`time.d.ts` 為 `export interface TimeProps` + `export declare function Time`。以 `tsc --noEmit` 型別探針從 package root 匯入 `Time`／`TimeProps`／`UserMessageText`／`UserMessageTextProps` 全部解析成功（exit 0）。demo 自組列時間戳 `09:09` 與預設列一致；`Time` 的 `if (!time) return null` 未改動。 |

邊界條件：

- **空 / 錯誤 / loading**：本改動不觸及這些路徑 —— `TextTemplate` 的 `error`（回 `null`）、empty-message（references / quick replies）、`tool-call`、`isTyping` 分支均未修改；`styles` memo 保留原 default 值供 `tool-call` 使用。既有 13 個 spec 檔全綠可佐證未回歸。
- **未包 provider 時的 theme**：`UserMessageText` 與 `TextTemplate` 走同一個 `useAsgardThemeContext`，無 provider 時取 default context，兩路徑產出同一份 style（新測即在無 provider 下比對）。

### §3.1 Acceptance

- [x] BUILD-042 `## Coverage` 所列 R1–R5 均已執行 Step 1（靜態讀 code / 產物 d.ts）＋ Step 2（Vitest + demo 瀏覽器量測）＋ Step 3（邊界）
- [x] 每個 R# 均標記 Pass 並附實際結果
- [x] 有對應 Vitest 已執行並通過（92/92）
- [x] 邊界條件已確認（error / empty / tool-call / typing 分支未動、無 provider 的 theme 路徑）

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **Demo 的 mention chip 用了 hardcode `rgba(255, 255, 255, 0.24)`**
   （`apps/react-demo/src/app/routes/composed-bot-text/composed-bot-text.module.scss`）。不違反
   FRONTEND_RULE_COMMON §4.2 —— 該規則管的是 `packages/react` 的元件，這裡是 demo app 自己的樣式，且同檔既有
   `#4767eb` / `#d0d0d0` 就是這個寫法。不需修，記錄以免日後誤判。
2. **自組列不會帶 `asgard-text-template--user` 這個 global class**（那是 `TextTemplate` 自己掛的）。屬自組路徑
   的固有差異，bot 側 `BotMessageText` 亦同；不影響視覺。消費端若要對這個 class 下樣式，得自行掛上。

---

## Execution Log

- 2026-08-05: REVIEW task created, paired with BUILD-042 (Status: `draft`).
- 2026-08-05: §1 靜態審查完成 —— 19 ✅ / 0 ❌（8 條 grep 全空；lint 0 error、format / typecheck / build 全綠）。
  §3 功能驗收完成 —— R1–R5 全 Pass（Vitest 92/92；demo `/composed-bot-text` 兩模式量測一致、0 console error）。
  無 BLOCKER，2 項 Minor 僅記錄不需修 (Status: `draft → in-progress → done`)。
- 2026-08-05: 追加 `R6`（匯出 `Time`）後重跑 §1 + §3 —— 全部維持 Pass，Vitest 仍 92/92，grep 範圍加入
  `templates/time` 與 `templates/index.ts` 後依然全空。**追加原因**：Sindri 實測發現泡泡修好之後，自組的點名列
  成了整串裡唯一沒有時間戳的一列，而消費端拿不到 `Time`（`templates/index.ts` 獨漏 `./time`，`TimeProps`
  也未匯出），只能自行複製 `formatTime` 與 `template.time.style` —— 正是本 task 要消滅的重複實作。
  Sindri 加上 `<Time time={message.time} />` 後，三列 user 訊息的泡泡幾何與時間戳（色值 `rgb(140,140,140)`）
  完全一致。原本「`Time` 不匯出」的決定據此推翻，已改寫 BUILD-042 的 Notes。
