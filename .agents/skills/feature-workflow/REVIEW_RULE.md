# SDK Feature Review Rules (asgard-js-sdk)

> 本文件供 AI 在 BUILD task 完成後執行系統性驗收。
> 驗收順序：§1 程式碼靜態審查 → §3 功能 / 行為驗收。
> 每個 section 獨立可執行；review scope 以 BUILD task 的 `## Coverage`（Files / Use Cases）欄位為準。
> 本審查只有兩個程序 section：§1 靜態、§3 功能；文末的「Review Summary」是輸出模板，不是審查程序 section。
> 對象是 **TS SDK library**（`@asgard-js/core` + `@asgard-js/react`）；規則對照 `FRONTEND_RULE_COMMON.md`。

視覺比對（對照 chat-kit prototype）是開發者自身實務（見 `CLAUDE.md` 開發與驗證流程），不屬於本審查。

---

## §1 Static Code Review

對照 `FRONTEND_RULE_COMMON.md` 逐條掃描 **BUILD task `## Coverage` 所列的變更檔案**，**不需要啟動 demo**。

### §1.1 Checklist

依序檢查以下項目，每項回報 ✅ 通過 / ❌ 違規（附檔案路徑與行號）：

| 檢查項目                                                                                         | 對應規則                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------ |
| 有無 `any` / `as any`                                                                            | FRONTEND_RULE_COMMON §1.1      |
| 有無 `@ts-ignore` / `eslint-disable` 規避型別或 lint 錯誤                                        | FRONTEND_RULE_COMMON §1.2      |
| library code 有無殘留 `console.log`（非 debug-option 控制）                                      | FRONTEND_RULE_COMMON §1.3 §7   |
| 有無 hardcode API key / endpoint / namespace                                                     | FRONTEND_RULE_COMMON §1.4      |
| RxJS 訂閱 / EventSource / timer 是否都有 teardown（takeUntil / unsubscribe / useEffect cleanup） | FRONTEND_RULE_COMMON §1.5      |
| `@asgard-js/react` 是否只從 `@asgard-js/core` 公開進入點 import（無深挖 `core/src/...`）         | FRONTEND_RULE_COMMON §1.6      |
| `@asgard-js/core` 有無 import `react` / `react-dom` / DOM API（禁止反向相依）                    | FRONTEND_RULE_COMMON §1.6 §2.1 |
| 公開 API 變更是否經 `@deprecated` 過渡（無未標示的 breaking change）                             | FRONTEND_RULE_COMMON §1.7      |
| 新增公開型別 / 函式 / 元件是否從 package 進入點導出（`export type` 明確）                        | FRONTEND_RULE_COMMON §2.2      |
| 新增 message template 型別 / enum / 元件的前置依賴是否齊備（見 §2.3 表）                         | FRONTEND_RULE_COMMON §2.3      |
| 是否使用 `botProviderEndpoint`（非 deprecated 的 `endpoint`）                                    | FRONTEND_RULE_COMMON §2.4      |
| 導出函式 / 方法是否標明 explicit return type                                                     | FRONTEND_RULE_COMMON §3.1      |
| 共用型別是否集中於 core `src/types/`，無跨檔重複 interface                                       | FRONTEND_RULE_COMMON §3.2      |
| React 元件 props 是否完整型別化（無 `any`）                                                      | FRONTEND_RULE_COMMON §4.1      |
| 元件有無 hardcode 色值（hex / rgba），而非走 theme / CSS 變數                                    | FRONTEND_RULE_COMMON §4.2      |
| `react` / `react-dom` 是否維持 peerDependencies（未被打包進 bundle）                             | FRONTEND_RULE_COMMON §4.4      |
| core 與 react 版本號是否一致                                                                     | FRONTEND_RULE_COMMON §5        |
| 重複邏輯（≥2 次）/ 型別 / JSX 片段（≥3 次）是否已抽出                                            | FRONTEND_RULE_COMMON §6        |
| 有無 `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME                                        | FRONTEND_RULE_COMMON §7        |

### §1.2 Mechanical grep（必須執行；空輸出 = ✅ 通過，有輸出 = ❌ 違規）

以下指令掃描**變更檔案所屬的目錄**（Coverage 列出的路徑）；若 Coverage 未列明確目錄，才掃全 `packages/`。

```bash
# §1.1 any / as any
grep -rn --include="*.ts" --include="*.tsx" ': any\b\|<any>\|as any' <coverage-dirs>

# §1.2 ts-ignore / eslint-disable
grep -rn --include="*.ts" --include="*.tsx" '@ts-ignore\|@ts-nocheck\|eslint-disable' <coverage-dirs>

# §1.3 / §7 console.log
grep -rn --include="*.ts" --include="*.tsx" 'console\.log' <coverage-dirs>

# §1.6 core 反向相依 react（掃 core package）
grep -rn --include="*.ts" --include="*.tsx" "from 'react'\|from \"react\"\|react-dom" packages/core/src/

# §1.6 react 深挖 core 內部（禁止 core/src 路徑）
grep -rn --include="*.ts" --include="*.tsx" "@asgard-js/core/src\|core/src/lib" packages/react/src/

# §4.2 元件 hardcode 色值
grep -rn --include="*.tsx" --include="*.ts" '#[0-9a-fA-F]\{3,6\}\|rgba(' packages/react/src/

# §7 setTimeout mock
grep -rn --include="*.ts" --include="*.tsx" 'setTimeout' <coverage-dirs>
```

### §1.3 Output Format

```
## 靜態審查結果

✅ 通過：N 項
❌ 違規：N 項

### 違規明細

1. [FRONTEND_RULE_COMMON §X.Y] <違規描述>
   - packages/<core|react>/src/<path>:<line>
     `<違規程式碼片段>`
```

### §1.4 Build / Lint / Format（型別檢查以 build 為準）

```bash
npm run lint:packages          # ESLint（core + react），read-only 檢查
npm run format:check           # Prettier
npm run build:core && npm run build:react   # tsc 型別檢查（經 vite build）+ 產物驗證
```

Results:

```
lint:packages: PASS / FAIL — <貼出錯誤>
format:check:  PASS / FAIL — <貼出錯誤>
build:         PASS / FAIL — <貼出型別/建置錯誤>
```

### §1.5 Static Review Acceptance

- [ ] §1.1 表格所有項目均已逐一核對並回報 ✅/❌
- [ ] 所有 ❌ 違規已列出檔案路徑與行號
- [ ] §1.2 所有 grep 指令已執行，輸出已貼出
- [ ] `npm run lint:packages` 無 ESLint 錯誤
- [ ] `npm run build:core && npm run build:react` 綠燈（無型別 / 建置錯誤）

有 ❌ 違規 → 回報 BLOCKER 給 BUILD task 修正，修正後重跑 §1。

---

## §3 Functional Validation

依據 BUILD task 的 `R#` 驗收條件逐項確認。SDK 無 dev server / 路由，功能驗收採以下手段（依序優先）：

1. **單元測試（Vitest）**：core 的邏輯 / RxJS stream / 型別行為優先用測試覆蓋。
2. **Demo app 目視**：`npm run build:core && npm run build:react` 後 `npm run serve:react-demo`（http://localhost:4200），進 `/templates` 等對應頁面實際操作驗證 UI / 互動 / 串流行為。

> **重要**：BUILD task 完成前應已自行跑過測試 / demo；本 section 是**確認與二次驗證**，非首次發現問題。發現新缺陷 → 回報 BLOCKER 讓 BUILD task 修正，而非在此自行修正。

### §3.1 Validation Procedure

針對每個 `R#`：

**Step 1 — 靜態讀 code 判斷**：型別、public API 簽章、export 是否符合，先標 ✅/❌。

**Step 2 — 測試 / demo 確認**：

- 有對應 Vitest → 執行並確認綠燈。
- 需 UI / 串流互動 → 在 react-demo 逐步操作，確認每步 UI 狀態符合預期（含 loading / error / 空狀態 / 斷線續傳等邊界）。

**Step 3 — 邊界與錯誤路徑**：針對 `R#` 提及的錯誤 / 空 / loading / 連線中斷狀態逐一確認。

### §3.2 Output Format

```
## 功能驗收結果

### R1 <驗收條件描述>
✅ 通過 / ❌ 失敗
（失敗時：實際結果 vs 預期結果）
```

### §3.3 Functional Validation Acceptance

- [ ] BUILD task `## Coverage` 所列的所有 `R#` 均已執行 Step 1–3
- [ ] 每個 `R#` 均已標記 ✅ / ❌（含實際結果說明）
- [ ] 有對應 Vitest 時已執行並通過
- [ ] 所有邊界條件（loading / error / 空 / 斷線）均已確認

有 ❌ 失敗 → 立即停止，回報 BLOCKER 給 BUILD task；描述 [實際行為] vs [預期行為]；修正後重跑 §3。

---

## Review Summary

§1 與 §3 都完成後，輸出總結：

```
## Review 總結

**BUILD task**：<BUILD-NNN>
**日期**：YYYY-MM-DD
**Commit**：<git commit hash>

| Section | 結果 | 備註 |
|---------|------|------|
| §1 Static Code Review | ✅ / ❌ | N 項違規 |
| §3 Functional Validation | ✅ / ❌ | N 個 R# 通過，N 個失敗 |

## 待修清單（BLOCKER）

1. [程式碼] ...
2. [功能] ...

## 結論

> §1 與 §3 皆通過 → 驗收完成，可進行下一步。
> 有 BLOCKER → 回 BUILD task 修正。
```
