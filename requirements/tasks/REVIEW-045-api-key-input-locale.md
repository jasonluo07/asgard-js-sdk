# REVIEW-045 Review: Give `ApiKeyInput` a supplied locale

## Meta

- Task ID: `REVIEW-045`
- Status: `done`
- BUILD Task: `BUILD-045`
- Reviewed commit: `29b76801828746fd4636a8aa6ebc4a9558863569`
- Reviewed branch: `fix/391-api-key-input-locale`

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

### §1.3 TypeScript and Lint

依 `AGENTS.md` 使用本 repo 實際存在的指令（review skill 文件寫的 `npx tsc --noEmit` / `npm run lint:check` 在此 repo 不存在）：

```
PASS  npm run lint:packages
PASS  npm run format:check
PASS  npm run typecheck:packages
PASS  npm run build:core
PASS  npm run build:react
PASS  npm run test:packages          # core 177 passed / react 105 passed
```

### §1.4 Static Review Acceptance

✅ 通過：19 項　 ❌ 違規：0 項

補充判讀：

- **§1.7 公開 API**：`ApiKeyInputProps` 新增選填的 `locale`，屬**新增**而非破壞；未傳者行為與 `0.3.46` 完全相同（仍讀 context）。不需 `@deprecated`。
- **§2.2 公開 API 導出**：`ApiKeyInput` 與 `Locale` 皆已從 package 進入點導出，本次未新增需要導出的東西。
- **§6 重構掃描**：修正順帶消除了原本「一半 prop、一半 context」的分裂接線——`chatbot.tsx` 不再預先解析 `placeholder`，只傳一次 `locale`。

---

## §3 Functional Validation

### R# Result Matrix

| R#  | 驗收條件                                                               | 結果    | 證據                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `<Chatbot locale="zh-TW" authState="needApiKey">` 整個金鑰畫面為 zh-TW | ✅ Pass | `api-key-input-locale.spec.tsx`「renders the whole key screen in the locale passed to `<Chatbot>`」——斷言 `auth.keyLabel`、`auth.continue` 與 placeholder 三者皆為 zh-TW |
| R2  | `invalidApiKey` 狀態同樣在地化                                         | ✅ Pass | 同檔「localizes the invalid-key screen too」，含 `auth.invalidKey`                                                                                                       |
| R3  | 標準單獨使用（無 prop）仍讀 context                                    | ✅ Pass | 同檔「still reads the template context when used standalone without the prop」（ja-JP）                                                                                  |
| R4  | 全無 `locale` 時維持 en-US、用字不變                                   | ✅ Pass | 同檔「falls back to en-US when `<Chatbot>` is given no locale」                                                                                                          |
| R5  | typecheck / build / test 全綠                                          | ✅ Pass | 見 §1.3                                                                                                                                                                  |

額外一條（優先序）：「lets the prop override the surrounding context」——確認 prop 勝過 context，這正是修正 #391 的關鍵順序。

### §3.1 Acceptance

5 / 5 Pass，0 Fail。

**回歸測試有效性已驗證**：把 `api-key-input.tsx` 與 `chatbot.tsx` 還原成 `main`（0.3.46）後，5 條中有 **3 條失敗**（`<Chatbot>` 傳 locale 的兩條、以及 prop 覆蓋 context 那條），加回修正後全數通過。

**這次補上了 REVIEW-044 沒能做到的功能驗收**：REVIEW-044 的 `R6` 記為 Partial，因為 react-demo 的 Auth 頁需要特定狀態的 bot provider 才走得到，結果 #391 正好躲在那個沒驗到的畫面裡。本次改用 jsdom 直接掛載 `authState="needApiKey"`——該路徑刻意不建 service provider，所以不需要任何 SSE 或後端即可渲染，這個缺口已由自動化測試補起來。

---

## Findings

### Critical (must fix before done)

無。

### Important (should fix in this cycle)

無。

### Minor (nice to have)

1. **本次為自審**，同 REVIEW-043 / REVIEW-044。§1 為機械掃描、§3 有可重跑且已驗證會失敗的測試。
2. **`ApiKeyInput` 仍相依 `useAsgardContext()` 取 `avatar`**，而非驗證路徑同樣沒有 service provider，所以它一直是拿 context 預設值。這是既有行為、不在本次範圍，但屬於同一類「元件相依了自己渲染路徑不提供的 context」的問題，值得日後一併檢視。

---

## Execution Log

- 2026-08-05: §1 靜態審查執行完畢 — 19 項通過、0 違規；grep 6 項全空；lint / format / typecheck / build / test 全綠。
- 2026-08-05: §3 功能驗收執行完畢 — R1–R5 全數 Pass；回歸測試已確認在 0.3.46 上失敗 3 條。
- 2026-08-05: 0 BLOCKER，REVIEW-045 標記 `done`。

---

## 更正（2026-08-05，於 BUILD-046 期間發現）

本文件 §1.2 原先記錄的「6 項 grep 全空」是**假通過**。當時的指令把多個路徑放在一個未加引號的 shell 變數裡（`grep -rnE "$pat" $F`），而 zsh 的參數展開**不做單字分割**，整串路徑被當成單一檔名，ugrep 回報 `No such file or directory`、警告被 `2>/dev/null` 吞掉、輸出為空——於是被判成通過，實際上一個檔案都沒掃到。

改用陣列展開（`"${FILES[@]}"`）重掃 BUILD-043 ～ 046 的 Coverage 全集共 10 個檔案，實際結果：

```
✅ 空 — : any / as any / @ts-ignore / @ts-nocheck / eslint-disable
✅ 空 — console.log / setTimeout / TODO / FIXME / rgba(
⚠️  #[0-9a-fA-F]{6} —— 僅命中兩個 spec 檔的測試夾具：
     deep-merge.spec.ts:27,32          '#123456'
     theme-default-layer.spec.tsx:64,66 '#123456'
```

那兩處是斷言用的任意色值，用來驗證「props 層會勝出」，不是元件在硬編顏色，不構成 §4.2 違規。**§1 的實質結論因此維持不變（0 違規）**，但當時的證據是無效的，故在此更正。
