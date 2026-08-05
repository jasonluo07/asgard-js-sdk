# REVIEW-043 Review: Let `locale` reach every part of the chatbot

## Meta

- Task ID: `REVIEW-043`
- Status: `done`
- BUILD Task: `BUILD-043`
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

- **§1.7 公開 API**：`ChatbotProps` 與 `AsgardTemplateContextValue` 皆未變動。改動純粹是 JSX 樹的巢狀層級，消費端可見的介面不變，因此不需要 `@deprecated` 過渡。
- **§6 重構掃描**：provider 上移後樹上只剩單一 `AsgardTemplateContextProvider`（由 `chatbot-locale-scope.spec.tsx` 斷言鎖住），原本 `renderContent()` 內那一份已移除，無重複。

---

## §3 Functional Validation

### R# Result Matrix

| R#  | 驗收條件                                                                                     | 結果    | 證據                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `<Chatbot locale="zh-TW">` 開啟內建 File Explorer，面板為 zh-TW，且不需消費端額外包 provider | ✅ Pass | 消費端實測：`asgard-embed-frontend` 裝 `0.3.45-local`、**移除該 app 的外層 provider workaround**，面板文字為「目前沒有執行中的 sandbox／sandbox 可能因閒置已被回收…／喚醒 sandbox」。截圖 `.github/screenshots/sdk-387-no-wrapper-default.png` |
| R2  | File Explorer 切換鈕的 `aria-label` / `title` 為 zh-TW                                       | ✅ Pass | 同一輪實測抓到的按鈕名稱：`檔案總管`、`重設對話`、`關閉`、`送出`                                                                                                                                                                               |
| R3  | 樹上只有一個 provider，且原有 prop 值不變                                                    | ✅ Pass | `chatbot-locale-scope.spec.tsx`「declares exactly one AsgardTemplateContextProvider」；prop 清單為整段搬移，`git diff` 未更動任何 prop 值                                                                                                      |
| R4  | 未傳 `locale` 時維持 en-US                                                                   | ✅ Pass | `chatbot-locale-scope.spec.tsx`「falls back to en-US when no locale is declared」；消費端 `?locale=en-US` 一輪亦為全英文                                                                                                                       |
| R5  | typecheck / build / test 全綠，demo 可見在地化面板                                           | ✅ Pass | 見 §1.3。視覺驗證以真實消費端（embed widget）取代 react-demo——demo 需要有執行中 sandbox 的 bot provider 才看得到面板內容，消費端實測涵蓋度更高                                                                                                 |

### §3.1 Acceptance

5 / 5 Pass，0 Fail。

**回歸測試有效性已驗證**：把 `chatbot.tsx` 還原成 `main` 的版本後，`chatbot-locale-scope.spec.tsx` 的兩條結構斷言確實失敗（`ChatbotContainer must render inside the provider`、`the File Explorer aside must inherit locale`），加回修正後全數通過。測試不是空轉。

---

## Findings

### Critical (must fix before done)

無。

### Important (should fix in this cycle)

無。

### Minor (nice to have)

1. **本次為自審**。§1 是機械式掃描、§3 有可重跑的測試與截圖佐證，但沒有第二人獨立複核。若要更高保證，建議合併前由他人看過 `chatbot.tsx` 的樹狀層級改動。
2. **結構斷言採原始碼比對**。因為掛載已驗證的 `<Chatbot>` 需要真實 `AsgardServiceClient`（SSE），R3 的「單一 provider」與「container 在 provider 內」是掃 `chatbot.tsx` 原始碼而非渲染後的樹。這沿用 `file-explorer-i18n.spec.tsx` 既有的做法，缺點是對重新排版較敏感；已改用「取 provider 區間子字串」而非行號索引以降低脆弱度。

---

## Execution Log

- 2026-08-05: §1 靜態審查執行完畢 — 19 項通過、0 違規；grep 6 項全空；lint / format / typecheck / build / test 全綠。
- 2026-08-05: §3 功能驗收執行完畢 — R1–R5 全數 Pass；回歸測試已確認在 `main` 上會失敗。
- 2026-08-05: 0 BLOCKER，REVIEW-043 標記 `done`。
