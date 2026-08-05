# REVIEW-046 Review: deepMerge treats undefined as no opinion

## Meta

- Task ID: `REVIEW-046`
- Status: `done`
- BUILD Task: `BUILD-046`
- Reviewed commit: `[filled at merge]`
- Reviewed branch: `fix/52-deep-merge-skips-undefined`

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

**方法已更正**：先前 REVIEW-043 ～ 045 的 grep 用未加引號的 shell 變數傳多個路徑，zsh 不做單字分割，導致一個檔案都沒掃到卻回報通過。本次改用陣列展開 `"${FILES[@]}"`，並回頭把 043 ～ 045 一併重掃、於各自文件加註更正。

掃描範圍：BUILD-046 的 Coverage 三個檔案（連同 043 ～ 046 全集 10 個檔一併重掃，結果相同）。

```
✅ 空 — : any / as any / @ts-ignore / @ts-nocheck / eslint-disable
✅ 空 — console.log / setTimeout / TODO / FIXME / rgba(
⚠️  #[0-9a-fA-F]{6} —— deep-merge.spec.ts:27,32 與 theme-default-layer.spec.tsx:64,66 的 '#123456'
```

`#123456` 是斷言「props 層勝出」用的任意夾具值，不是元件硬編顏色，不構成 §4.2 違規。

### §1.3 TypeScript and Lint

```
PASS  npm run lint:packages
PASS  npm run format:check
PASS  npm run typecheck:packages
PASS  npm run build:core
PASS  npm run build:react
PASS  npm run test:packages          # core 177 passed / react 114 passed
```

型別上曾有一處需要處理：`deepMerge({ color: 'x' }, { color: undefined })` 的交集型別會塌成 `never`，測試改為先把 source 標註成 `{ color: string | undefined }`，讓斷言讀到合併值而非被窄化的型別。

### §1.4 Static Review Acceptance

✅ 通過：19 項　 ❌ 違規：0 項

- **§1.7 公開 API**：`deepMerge` 的簽章未變。行為變更是「`undefined` 不再覆蓋目標」——這是修正既有缺陷而非破壞契約，且下游稽核證實零視覺差異，故不需 `@deprecated`。
- **§6 重構掃描**：修正為單一 guard，無重複邏輯；`utils/` 原本沒有測試，本次補上 `deep-merge.spec.ts`（§6 要求 utils 有 happy path + edge cases）。

---

## §3 Functional Validation

### R# Result Matrix

| R#  | 驗收條件                                               | 結果    | 證據                                                                                                          |
| --- | ------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| R1  | source 的 `undefined` 不覆蓋 target                    | ✅ Pass | `deep-merge.spec.ts`「keeps the target value when the source says undefined」                                 |
| R2  | 明確的 falsy 值（`''` / `0` / `null`）仍然勝出         | ✅ Pass | 同檔「still lets an explicit value win, including falsy ones」                                                |
| R3  | 無 annotations、無 props theme 時六個 default 全部可達 | ✅ Pass | `theme-default-layer.spec.tsx`「keeps every default reachable…」，逐欄位比對 `defaultAsgardThemeContextValue` |
| R4  | props 設一個欄位不會害死同組的其他 default             | ✅ Pass | 同檔「still lets the props theme win over the default」                                                       |
| R5  | 七個消費端零視覺差異                                   | ✅ Pass | 見 `BUILD-046` 的〈下游稽核〉表；判定依據為兩項程式碼查證而非推論                                             |
| R6  | typecheck / build / test 全綠                          | ✅ Pass | 見 §1.3                                                                                                       |

### §3.1 Acceptance

6 / 6 Pass，0 Fail。

**回歸測試有效性已驗證**：還原 `deep-merge.ts` 後，兩支測試共 **4 條失敗**（deep-merge 2 條、theme-default-layer 2 條，後者直接指出 `chatbot.backgroundColor was clobbered: expected undefined to be 'var(--asg-color-bg)'`），加回修正後全數通過。

---

## Findings

### Critical (must fix before done)

無。

### Important (should fix in this cycle)

無。

### Minor (nice to have)

1. **issue 的風險評估有一處過度保守，已在 BUILD-046 更正**：asgard-sdk-pm#52 把「user 泡泡背景從 `#4767eb` 改讀 `var(--asg-color-primary)`」列為需要下游稽核的可見變更，但建置產物裡 `--asg-color-primary` 就是 `#4767eb`，兩者同色、零差異。建議回該 issue 補一則說明。
2. **`annotations pass` 本身沒有一併修**（issue 的選項 B）。選項 A 已讓 default 生效，但那段仍在無條件建構 `undefined` 欄位；日後若有人把 `deepMerge` 換成別的合併函式，同一個 bug 會復發。可考慮另開一張整理票。
3. **本次為自審**，同 REVIEW-043 ～ 045。

---

## Execution Log

- 2026-08-05: §1 靜態審查執行完畢 — 19 項通過、0 違規；grep 方法更正後重跑（含回頭重掃 043 ～ 045）。
- 2026-08-05: §3 功能驗收執行完畢 — R1–R6 全數 Pass；回歸測試確認修正前失敗 4 條。
- 2026-08-05: 0 BLOCKER，REVIEW-046 標記 `done`。
