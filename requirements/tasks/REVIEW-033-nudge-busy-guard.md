# REVIEW-033 Refuse a nudge while a run holds the channel

## Meta

- Task ID: `REVIEW-033`
- Status: `done`
- BUILD Task: `BUILD-033`
- Reviewed commit: `7192130`
- Reviewed branch: `fix/nudge-busy-guard`

---

## §1 Static Code Review

Scope = `BUILD-033 ## Coverage` 的 4 個檔案（core 2 / react 2）。

### §1.1 Checklist

| 檢查項目                                                         | 對應規則                     | 結果 |
| ---------------------------------------------------------------- | ---------------------------- | ---- |
| 有無 `any` / `as any`                                            | FRONTEND_RULE_COMMON §1.1    | ✅   |
| 有無 `@ts-ignore` / `eslint-disable` 規避型別或 lint 錯誤        | FRONTEND_RULE_COMMON §1.2    | ✅   |
| library code 有無殘留 `console.log`                              | FRONTEND_RULE_COMMON §1.3 §7 | ✅   |
| 有無 hardcode API key / endpoint / namespace                     | FRONTEND_RULE_COMMON §1.4    | ✅   |
| RxJS 訂閱 / EventSource / timer 是否都有 teardown                | FRONTEND_RULE_COMMON §1.5    | ✅   |
| `@asgard-js/core` 無 import react / react-dom / DOM              | FRONTEND_RULE_COMMON §1.6    | ✅   |
| 公開 API 變更經 `@deprecated` 過渡（無未標示的 breaking change） | FRONTEND_RULE_COMMON §1.7    | ⚠️   |
| 新增公開 prop 從 package 進入點導出                              | FRONTEND_RULE_COMMON §2.2    | ✅   |
| 導出函式 / 方法標明 explicit return type                         | FRONTEND_RULE_COMMON §3.1    | ✅   |
| React 元件 props 完整型別化                                      | FRONTEND_RULE_COMMON §4.1    | ✅   |
| 元件無 hardcode 色值                                             | FRONTEND_RULE_COMMON §4.2    | ✅   |
| 重複邏輯（≥2 次）已抽出                                          | FRONTEND_RULE_COMMON §6      | ✅   |
| 無 `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME          | FRONTEND_RULE_COMMON §7      | ✅   |

補充說明：

- **§1.7 ⚠️（已知且刻意）**：`Channel.nudge()` 從「run 進行中照樣送出」改成「reject `ChannelBusyError`」，
  這是**行為改變**。判定為修正而非 breaking：舊行為會讓使用者的 run 永久失去停止能力（違反 F-023 AC2/AC8），
  沒有任何呼叫端會刻意依賴它。型別簽章不變，因此不需 `@deprecated`。
  `nudgeDisabled` 為新增的 **optional** prop，對既有 `FileExplorerPanel` 使用端完全相容
  （不傳 = `undefined` = 不 disable，與改動前一致）。
- **§2.2**：`nudgeDisabled` 透過既有的 `FileExplorerPanelProps` 出去，該型別已從套件進入點導出。
- **§6**：本票沒有新增重複邏輯；busy 判定與 `sendMessage` 的形式一致（各三行、各自帶不同註解說明後果），
  刻意不抽共用 helper —— 兩處的失敗語意不同（`sendMessage` 要在推 optimistic bubble 前擋、`nudge` 沒有 bubble），
  抽出來只會多一層間接。

### §1.2 Mechanical Grep

```
### §1.1 any / as any            → (empty)
### §1.2 ts-ignore / eslint-disable → (empty)
### §1.3 console.log             → (empty)
### §7 setTimeout                → (empty，本票 4 個檔案內)
### §7 TODO / FIXME              → (empty)
### §4.2 hardcoded colors        → (empty，改動的兩個 react 檔案內)
```

### §1.3 TypeScript / Lint / Format / Build

```
typecheck:packages: PASS
lint:packages:      PASS — 1 problem (0 errors, 1 warning)，warning 在未改動的 file-view.tsx:171（既有）
format:check:       PASS
build:core:         PASS
build:react:        PASS
```

### §1.4 Static Review Acceptance

- [x] §1.1 表格所有項目均已核對
- [x] 無 ❌ 違規（§1.7 標 ⚠️ 並附判定理由）
- [x] §1.2 grep 已執行
- [x] typecheck / lint 無錯誤
- [x] 兩包 build 綠燈

**§1 結果：0 violation（1 項 ⚠️ 已知行為改變，附理由）。**

---

## §3 Functional Validation

### R# Result Matrix

| R#  | 驗收條件                                               | 結果 | 說明                                                                                          |
| --- | ------------------------------------------------------ | ---- | --------------------------------------------------------------------------------------------- |
| R1  | run 進行中 `nudge()` reject `ChannelBusyError`、不送出 | Pass | Vitest `refuses to dispatch while a run is in flight`；先 red 後 green，`harness.runs` 維持 1 |
| R2  | 被拒後 in-flight run 的識別不被覆寫                    | Pass | Vitest `leaves the in-flight run stoppable`：`kind === 'user'`、`requestId === 'req-42'`      |
| R3  | 被拒後不置換 `currentRun`，原 run 仍可被 teardown      | Pass | Vitest `does not strand the in-flight run`：`close()` 後 `runs[0].unsubscribed === true`      |
| R4  | idle 時 `nudge()` 行為不變                             | Pass | Vitest `still dispatches once the run has settled`（此案例在修改前即 green，證明無回歸）      |
| R5  | 被拒的 nudge 不造成 unhandled rejection                | Pass | `handleNudge` 加 `catch`；型別檢查通過，click handler 不再外拋                                |
| R6  | run 進行中 Nudge 鈕 disabled、結束後恢復               | Pass | 瀏覽器 DOM 取樣 `eeeeeeeeeeeeeeeeeDDDDDD`；run 結束後 `disabled: false`                       |
| R7  | 靜態閘門 + 測試全綠                                    | Pass | core 159/159（+4）、react 46/46                                                               |

### 邊界條件

- idle → 可按、可送（R4）
- run 進行中 → 按鈕 disabled，且即使繞過 UI 直接呼叫也會被 core 擋下（R1，雙層防護）
- run 結束 → 恢復可按，不卡住（R6）
- 消費端自行擺放的面板不傳 `nudgeDisabled` → 行為與改動前相同，core 守衛仍生效

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **消費端自行擺放的面板需自行傳 `nudgeDisabled`** —— SDK 只在內建接線
   （`chatbot-file-explorer.tsx`）傳入。Sindri 的面板長在 `<Chatbot>` 之外的 dockview 裡，
   要有同樣的 UI 保護需自行接上（core 的守衛則無條件生效）。已記於 BUILD-033 的下游追蹤段。
2. **未附 disabled 狀態截圖** —— demo 的 echo bot 單次 run 約一秒，難以穩定攔截。以 DOM 取樣為證據，
   不以擺拍補圖。

---

## Execution Log

- 2026-07-29: REVIEW task 建立並與 BUILD-033 配對。
- 2026-07-29: §1 完成 —— 12 項 ✅ / 1 項 ⚠️（已知行為改變，附理由）/ 0 ❌；§3 完成 —— R1–R7 全 Pass
  (Status: `done`)。
