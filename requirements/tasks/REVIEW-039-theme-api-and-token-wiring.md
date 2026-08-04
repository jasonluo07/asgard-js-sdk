# REVIEW-039 Export the theme type surface and wire the phantom tokens

## Meta

- Task ID: `REVIEW-039`
- Status: `done`
- BUILD Task: `BUILD-039`
- Reviewed commit: `working tree on fix/31-theme-audit-phase-1` (pre-commit)
- Reviewed branch: `fix/31-theme-audit-phase-1`

---

## §1 Static Code Review

Scope = `BUILD-039 ## Coverage` 的 5 個檔案（3 個 `.ts(x)` + 2 個 `.scss`）。

### §1.1 Checklist

| Check item                                           | Rule                           | Result                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 有無 `any` / `as any`                                | FRONTEND_RULE_COMMON §1.1      | ✅ 三個 `.tsx` 各 0 命中                                                                                                                 |
| 有無 `@ts-ignore` / `eslint-disable`                 | FRONTEND_RULE_COMMON §1.2      | ✅ 0 命中                                                                                                                                |
| library code 殘留 `console.log`                      | FRONTEND_RULE_COMMON §1.3 §7   | ✅ 0 命中                                                                                                                                |
| hardcode API key / endpoint / namespace              | FRONTEND_RULE_COMMON §1.4      | ✅ 無                                                                                                                                    |
| RxJS / EventSource / timer teardown                  | FRONTEND_RULE_COMMON §1.5      | ✅ 不適用（本次無訂閱／計時器）                                                                                                          |
| react 只從 core 公開進入點 import                    | FRONTEND_RULE_COMMON §1.6      | ✅ 0 命中                                                                                                                                |
| core 反向 import react / react-dom / DOM             | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅ 0 命中（本次未動 core）                                                                                                               |
| 公開 API 變更經 `@deprecated` 過渡                   | FRONTEND_RULE_COMMON §1.7      | ✅ 3 處（`linkColor` / `chatbot.borderRadius` / `template.references.item`），皆保留欄位與型別，見下方「§1.7 判定說明」                  |
| 新增公開型別從 package 進入點導出                    | FRONTEND_RULE_COMMON §2.2      | ✅ `dist/context/asgard-theme-context.d.ts` 有 `ChatbotTheme`、`dist/components/chatbot/chatbot.d.ts` 有 `export interface ChatbotProps` |
| 新增 message template 前置依賴                       | FRONTEND_RULE_COMMON §2.3      | ✅ 不適用（未新增 template）                                                                                                             |
| 使用 `botProviderEndpoint`                           | FRONTEND_RULE_COMMON §2.4      | ✅ 不適用                                                                                                                                |
| 導出函式標明 explicit return type                    | FRONTEND_RULE_COMMON §3.1      | ✅ 本次只新增型別別名與 `export` 修飾，未新增導出函式                                                                                    |
| 共用型別集中、無跨檔重複 interface                   | FRONTEND_RULE_COMMON §3.2      | ✅ `ChatbotTheme` 是既有 `AsgardThemeContextValue` 的別名，未複製結構                                                                    |
| React 元件 props 完整型別化                          | FRONTEND_RULE_COMMON §4.1      | ✅ `ChatbotProps` 無 `any`                                                                                                               |
| 元件 hardcode 色值                                   | FRONTEND_RULE_COMMON §4.2      | ✅ 見下方「§4.2 判定說明」——3 個命中皆為既有程式碼，非本次新增                                                                           |
| `react` / `react-dom` 維持 peerDependencies          | FRONTEND_RULE_COMMON §4.4      | ✅ 未動 `package.json`                                                                                                                   |
| core 與 react 版本號一致                             | FRONTEND_RULE_COMMON §5        | ✅ 皆 `0.3.40`（本票不含 bump）                                                                                                          |
| 重複邏輯 / 型別 / JSX 抽出                           | FRONTEND_RULE_COMMON §6        | ✅ 8 個 token 全部複用既有的 `wash()` / `darker()` helper 與既有條件區塊，未另造平行機制                                                 |
| `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME | FRONTEND_RULE_COMMON §7        | ✅ 0 命中（`TBD` 仍為 11 個，屬 audit 缺陷 7 的第三階段範圍，非本票）                                                                    |

### §1.2 Mechanical Grep

```
# any / as any · ts-ignore / eslint-disable · console.log · setTimeout · TODO|FIXME
asgard-theme-context.tsx      → 0 / 0 / 0 / 0 / 0
asgard-theme-context.spec.tsx → 0 / 0 / 0 / 0 / 0
chatbot.tsx                   → 0 / 0 / 0 / 0 / 0

# §1.6 core 反向相依 react
$ grep -rn "from 'react'|react-dom" packages/core/src/
(empty)

# §1.6 react 深挖 core 內部
$ grep -rn "@asgard-js/core/src|core/src/lib" packages/react/src/
(empty)

# §4.2 色值（asgard-theme-context.tsx）
460:  backgroundColor: themeFromAnnotations.botMessage?.backgroundColor, // #585858
816:  isHex(color) ? darkenColor(color, 0.15) : `color-mix(in srgb, ${color} 85%, #000)`;
818:  isHex(color) ? lightenColor(color, 0.08) : `color-mix(in srgb, ${color} 92%, #fff)`;

# R6 驗證：裸 --asg-color-text 應歸零
$ grep -rn 'var(--asg-color-text[,)]' packages/react/src
(empty)
```

**§4.2 判定說明**：3 個命中都不是本次新增——`:460` 是既有註解裡的色碼；`:816` / `:818` 是既有 `darker()` / `lighter()` helper 中 `color-mix()` 的黑白端點（混色錨點，非可主題化的表面色）。本票新增的 8 個 token **全部**由 theme 欄位推導，零字面色值。

**§1.7 判定說明**：三個 `@deprecated` 欄位皆**保留型別與可設定性**，不是移除。`chatbot.borderRadius` 由 `Pick<CSSProperties, 'borderRadius'>` 改寫成顯式 `borderRadius?: CSSProperties['borderRadius']`，產出的 `.d.ts` 型別相同（`CSSProperties` 全屬性本就 optional），非 breaking。唯一的行為變更是 `botMessage.linkColor` 不再由 annotations 推導出值——但該值錯誤（`darkenColor(自身背景, 0.2)`）且無任何元件讀取，只有直接讀 `useAsgardThemeContext().botMessage.linkColor` 的消費端能觀察到，且會讀到 `undefined` 而非錯值。已在 `## Findings` 記為 Minor。

### §1.3 TypeScript and Lint

```
lint:packages:      PASS (exit 0；0 error / 1 既有 warning)
format:check:       PASS (All matched files use Prettier code style!)
typecheck:packages: PASS (0 error TS，兩個 project 皆成功)
build:core+react:   PASS (exit 0)
test:packages:      PASS (core 165 / react 87，新增 3)
```

> 註：本 repo 無 `lint:check` script；`npm run lint:packages`（`nx run-many --target=lint`）本身即唯讀，未帶 `--fix`。
> 另註：`npm run typecheck:packages` 產生的 `packages/*/out-tsc/` 編譯產物會被 ESLint 掃到而使 `lint:packages` 失敗（`no-var` / `explicit-function-return-type` 等）。此為**既有工具鏈順序問題、與本票無關**；先刪 `out-tsc` 再跑 lint 即 exit 0。建議列入 backlog（`.eslintignore` / lint ignore 加上 `out-tsc`）。

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅/❌
- [x] All ❌ violations listed with file path and line number（本次 0 項違規）
- [x] All §1.2 grep commands run and output pasted
- [x] typecheck / build 無 TypeScript 錯誤
- [x] lint 無 ESLint 錯誤

---

## §3 Functional Validation

### R# Result Matrix

| R#  | Description                                            | Result | Note                                                                                                                                                                           |
| --- | ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `ChatbotTheme` 可 import 且為 `Partial<…>`             | Pass   | 以編譯探針實證：在 demo 內放一個 `const t: ChatbotTheme = { chatbot: { backgroundColor: '#141414' } }`（只設一個區塊），`tsc --noEmit` 對該檔 0 錯誤                           |
| R2  | `ChatbotProps` 可 import 且為 `<Chatbot>` prop 型別    | Pass   | 同一探針以 `Pick<ChatbotProps, 'config' \| 'customChannelId' \| 'theme'>` 建值，編譯通過                                                                                       |
| R3  | demo typecheck 中 `ChatbotTheme` 錯誤歸零              | Pass   | 8 → **5**，`grep -c ChatbotTheme` = 0。剩 5 個為既有無關項                                                                                                                     |
| R4  | 8 個 token 在對應 theme 欄位存在時寫入                 | Pass   | 單元測試 1 案；瀏覽器 `/all-features-wide` Crazy 下量到 7 個（`consent-modal-primary-fg` 見下方缺口）、`/markdown-theme` Light 下量到 4 個                                     |
| R5  | 無 theme 時一個都不寫，且 `var()` 值不觸發 inset token | Pass   | 單元測試 2 案；瀏覽器 `/markdown-theme` Default 下 `--asgard-markdown-link` 為 `(unset)`、連結實際渲染 `rgb(59,130,246)`＝原 fallback `#3b82f6`，證明未主題化外觀未動          |
| R6  | 裸 `--asg-color-text` 不再存在                         | Pass   | `grep -rn 'var(--asg-color-text[,)]' packages/react/src` 空輸出（改動前 7 處）。刻意的視覺修正已記於 BUILD-039 R6                                                              |
| R7  | 死 API 標 `@deprecated`、錯誤推導移除                  | Pass   | 3 處 `@deprecated`；`linkColor` 在 context 外 0 引用、推導已刪；`borderRadius` `.d.ts` 型別等價                                                                                |
| R8  | 既有測試全綠 + 新增回歸覆蓋                            | Pass   | core 165 / react 87（+3：themed 寫入、unthemed 不寫、`var()` 不觸發 inset）                                                                                                    |
| R9  | 靜態檢查 + build 全綠 + demo 目視                      | Pass   | lint / format / typecheck / build 皆綠；截圖 `.github/screenshots/39-all-features-wide-default-unchanged.jpeg`（預設外觀未變）、`39-markdown-light-after.jpeg`（淺色主題連動） |

### §3.1 Acceptance

- [x] All R# executed (Step 1 靜態讀 code + Step 2 測試／瀏覽器 + Step 3 邊界條件)
- [x] Each R# marked Pass / Fail
- [x] 對應 Vitest 已執行並通過
- [x] 邊界條件已確認：無 theme（fallback 保留）、theme 給 `var()` 直通值（inset token 不觸發）、theme 給具體色（token 寫入）三種狀態

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Important (should fix in this cycle)

_All three were fixed during the downstream audit; recorded here for traceability._

1. **`chatbot.borderRadius` 被錯誤標記為 `@deprecated`**（本 review 的 §1.7 一度判為合規）。實際有效，且 Sindri / Odin / Mimir 都在用。**已撤回 deprecation。**
2. **連結色由 `primaryComponent.mainColor` 推導，使兩個消費端跌破 WCAG AA**（Sindri 暗色 4.14:1、sdk-demo 3.87:1）。**已改由 `botMessage.linkColor` 驅動**，並加回歸鎖。
3. **consent inset 兩個 token 各自 gate，會產生半套外觀**（Mimir 只設 `backgroundColor`；embed-frontend 只有 `?bgColor=`）。**已改為成對寫入。**

### Minor (nice to have)

1. **`--asgard-consent-modal-primary-fg` 只有單元測試覆蓋，無瀏覽器實證。** react-demo 三個 theme preset（Default / Crazy / Heimdall）都沒有設定 `chatbot.primaryComponent.onMainColor`，該 token 因此在瀏覽器上永遠不會被寫入；consent modal 本身也需要真實 consent bot（`VITE_CONSENT_BOT_PROVIDER_ENDPOINT`）才會出現。要補瀏覽器驗證需在 demo 加一個帶 `onMainColor` 的 preset。
2. **`botMessage.linkColor` 的推導值移除屬可觀察的行為變更（極窄）。** 直接讀 `useAsgardThemeContext().botMessage.linkColor` 的消費端會從「錯誤的 darken 值」變成 `undefined`。已標 `@deprecated` 並在註解指明替代（`--asgard-markdown-link`）；`~/Asgard` 下 7 個消費端無一讀取此欄位。
3. **`out-tsc` 使 lint 失敗**（既有工具鏈問題，非本票造成）：跑過 `typecheck:packages` 後直接跑 `lint:packages` 會因編譯產物被掃到而 exit 1。建議把 `packages/*/out-tsc` 加進 ESLint ignore。
4. **`deepMerge` 對 `undefined` 無條件覆蓋，使 `botMessage.color` / `userMessage.color` 兩個 provider 預設永遠不可達**（`deep-merge.ts:13-16` + `asgard-theme-context.tsx` annotations pass）。非本票造成、也非本票修正範圍，但它讓一整組 theme 預設變成裝飾品，值得另開票。
5. **Sindri 產品畫面未實測** —— 需 dev IAM 互動登入。已改以「用 Sindri 真實 theme 物件 probe provider」取代，能精確涵蓋 provider 端，但涵蓋不到 SCSS 端在該產品的實際渲染。

---

## Execution Log

- 2026-08-04: REVIEW task created, paired with BUILD-039 (Status: `draft`).
- 2026-08-04: §1 Static review — 19 項 checklist 全 ✅ / 0 ❌；grep 全空；lint / format / typecheck / build 全綠 (Status: `draft → in-progress`).
- 2026-08-04: §3 Functional validation — R1–R9 全 Pass（R1/R2 以編譯探針實證，R4/R5 以單元測試 + 瀏覽器量測雙重確認）。0 BLOCKER，3 項 Minor (Status: `in-progress → done`).
- 2026-08-04: **下游影響稽核後重審（R10）**。七個消費端的稽核推翻本次 review 的三項判定，實作已修正並重跑：
  - §1.7「3 處 `@deprecated` 皆保留型別與可設定性」的判定 **對其中一項是錯的**：`chatbot.borderRadius` 根本不該 deprecate（`chatbot-container.tsx:22` rest-spread → `:100` inline style，圓角有效；Sindri / Odin / Mimir 都設 `.5rem`）。已還原，現在只有 `template.references.item` 標 deprecated，`linkColor` 則改為**真正接線**。
  - R4 的 token 來源變更：連結改由 `botMessage.linkColor` 驅動（原本 `primaryComponent.mainColor` 會使 Sindri 暗色 4.14:1、sdk-demo 3.87:1 跌破 WCAG AA）。新增回歸鎖測試禁止再從 accent 推導連結。
  - R5 的 inset gate 改為成對，避免 Mimir / embed-frontend 出現半套。
  - R6 的範圍縮小：2 個 provider 預設不可達（`deepMerge` 的 `undefined` 覆蓋），真正生效的只有 5 個 SCSS 引用。
  - 重跑後：lint / format / typecheck / build 全綠，測試 core 165 / react 89（新增 5）。0 BLOCKER。
