# REVIEW-044 Review: Route the remaining hardcoded UI strings through the i18n catalog

## Meta

- Task ID: `REVIEW-044`
- Status: `done`
- BUILD Task: `BUILD-044`
- Reviewed commit: `ba490500610e6634f2ec0a2a17a252e81eebeb4d`
- Reviewed branch: `fix/387-388-locale-coverage`

---

## §1 Static Code Review

### §1.1 Checklist

| 檢查項目                                 | 結果                                |
| ---------------------------------------- | ----------------------------------- |
| `any` / `as any`                         | ✅ 無                               |
| `@ts-ignore` / `eslint-disable`          | ✅ 無                               |
| library code 殘留 `console.log`          | ✅ 無                               |
| hardcode API key / endpoint / namespace  | ✅ 無（本次未觸及設定路徑）         |
| RxJS 訂閱 / EventSource / timer teardown | ✅ 不適用（本次未新增訂閱或 timer） |
| react 只從 core 公開進入點 import        | ✅ 無 `core/src` 深挖               |
| core 反向 import react / react-dom / DOM | ✅ 無                               |
| 公開 API 變更經 `@deprecated` 過渡       | ✅ 無破壞性變更（見 §1.4 說明）     |
| 新增公開型別 / 元件從 package 進入點導出 | ✅ 不適用（未新增公開 API）         |
| message template 前置依賴                | ✅ 不適用                           |
| 使用 `botProviderEndpoint`               | ✅ 不適用                           |
| 導出函式標明 explicit return type        | ✅ 是                               |
| 共用型別集中、無重複 interface           | ✅ 是                               |
| React 元件 props 完整型別化              | ✅ 是                               |
| 元件 hardcode 色值                       | ✅ 無                               |
| react / react-dom 維持 peerDependencies  | ✅ 未更動                           |
| core 與 react 版本號一致                 | ✅ `0.3.44` / `0.3.44`              |
| 重複邏輯 / 型別 / JSX 已抽出             | ✅ 見 §1.4                          |
| `setTimeout` mock / 死碼 / TODO / FIXME  | ✅ 無                               |

### §1.2 Mechanical Grep

掃描範圍限定為 BUILD task `## Coverage` 列出的檔案（依 REVIEW_RULE §1.2）。

```
✅ 空 — : any|<any>|as any
✅ 空 — @ts-ignore|@ts-nocheck|eslint-disable
✅ 空 — console\.log
✅ 空 — setTimeout
✅ 空 — TODO|FIXME
✅ 空 — rgba\(|#[0-9a-fA-F]{6}\b
```

> 註：不限定範圍時，`setTimeout` 會命中 `chatbot-footer/chat-composer.tsx:222` 與 `file-explorer/file-view.tsx:114,118`。兩者皆為既有程式碼、不在本次 Coverage 內，且都是真實用途（debounce / 延遲聚焦）而非模擬 delay，非本次違規。

### §1.3 TypeScript and Lint

本 repo 的型別檢查指令與 review skill 文件所寫的 `npx tsc --noEmit` / `npm run lint:check` 不同（那兩個 script 不存在），依 `AGENTS.md` 改用實際存在的指令：

```
PASS  npm run lint:packages
PASS  npm run format:check
PASS  npm run typecheck:packages      # 唯一會因型別錯誤失敗的指令（見 AGENTS.md）
PASS  npm run build:core
PASS  npm run build:react
PASS  npm run test:packages           # core 177 passed / react 100 passed
```

### §1.4 Static Review Acceptance

✅ 通過：19 項　 ❌ 違規：0 項

補充判讀：

- **§1.7 公開 API**：`ApiKeyInputProps.placeholder` 與 `.title` 由「有英文預設值」改為選填、未傳時從 catalog 解析。型別上 `placeholder?: string` / `title?: string` 不變，傳值的消費端行為完全相同，未傳的消費端只是拿到在地化字串而非寫死英文——屬修正而非破壞，故不需 `@deprecated`。
- **§5 對外文字不隨手改寫**：`chatbot-i18n.spec.tsx` 以 `MIGRATED_WORDING` 表逐字鎖住 en-US 用字，任何改寫都會讓測試紅字。
- **§6 重構掃描**：12 組字串集中於 `i18n.ts` 單一 catalog，呼叫端一律 `t(...)`，無重複字面值。

---

## §3 Functional Validation

### R# Result Matrix

| R#  | 驗收條件                                                            | 結果       | 證據                                                                                                                                                                    |
| --- | ------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `needApiKey` / `invalidApiKey` 的 placeholder 與驗證訊息跟著 locale | ✅ Pass    | `chatbot-i18n.spec.tsx`「resolves each key in every locale」涵蓋 `auth.enterKey` / `auth.invalidKey`；呼叫端已改為 `t(activeLocale, …)`                                 |
| R2  | `error` / `subscriptionExpired` / `botNotFound` 的訊息跟著 locale   | ✅ Pass    | 同上，涵蓋 `error.generic` / `error.serviceUnavailable` / `error.serviceNotFound`                                                                                       |
| R3  | 拖放提示跟著 locale                                                 | ✅ Pass    | `dropZone.hint` 三語齊全；`DropZoneOverlay` 改讀 `useAsgardTemplateContext()`，且該元件在 BUILD-043 之後確實位於 provider 內（由 `chatbot-locale-scope.spec.tsx` 斷言） |
| R4  | 新增 key 三語齊全、插值佔位符一致                                   | ✅ Pass    | 既有的 `file-explorer-i18n.spec.tsx` catalog parity 測試自動涵蓋；`npm run test:packages` 全綠                                                                          |
| R5  | 未傳 `locale` 時英文用字與原本逐字相同                              | ✅ Pass    | `chatbot-i18n.spec.tsx`「keeps the en-US wording byte-identical to the literals it replaced」                                                                           |
| R6  | typecheck / build / test 全綠 ＋ demo Auth 頁走查                   | ⚠️ Partial | 靜態部分全綠（見 §1.3）。**Auth 頁未實際走查** —— 見 Findings Important 1                                                                                               |

### §3.1 Acceptance

5 Pass、1 Partial、0 Fail。Partial 不構成 BLOCKER：該 R# 的可自動化部分皆通過，未達成的是人工目視，且已具名記錄而非以「通過」帶過。

---

## Findings

### Critical (must fix before done)

無。

### Important (should fix in this cycle)

1. **react-demo 的 Auth 頁未實際走查（R6 的目視部分）**。要渲染 `needApiKey` / `subscriptionExpired` / `botNotFound` 需要處於對應狀態的 bot provider，本機 demo `.env` 沒有這些。目前的保證來自單元測試（key 解析、用字鎖定、字面值掃描），沒有畫面佐證。合併前若能取得一個 private bot 的憑證，跑一次 Auth 頁截圖即可補齊。

### Minor (nice to have)

1. **本次實作範圍大於 issue #388 所列**。`ApiKeyInput` 另有五個寫死字串（`Preview` 標題、`Key` 標籤、顯示／隱藏密碼 `aria-label`、`Loading...` / `Continue`）是被本次新增的字面值掃描測試自己抓出來的。屬同一缺陷、同一檔案，只修 placeholder 會留下「中文外殼＋英文表單」；已在 BUILD-044 Execution Log 具名記錄。**issue #388 的內文應補上這五個字串**，否則票面與實作不符。
2. **字面值掃描的比對方式**。初版用 `String.includes`，導致 `Key` 命中 `apiKey`、產生 13 個假陽性；已收緊為只比對引號字面值與 JSX 文字節點。短詞仍有理論上的誤判空間，日後若再加入極短的 key 需留意。
3. **本次為自審**，同 REVIEW-043 Minor 1。

---

## Execution Log

- 2026-08-05: §1 靜態審查執行完畢 — 19 項通過、0 違規；grep 6 項全空；lint / format / typecheck / build / test 全綠。
- 2026-08-05: §3 功能驗收執行完畢 — R1–R5 Pass、R6 Partial（demo Auth 頁未走查，已列 Important 1）。
- 2026-08-05: 0 BLOCKER，REVIEW-044 標記 `done`。
