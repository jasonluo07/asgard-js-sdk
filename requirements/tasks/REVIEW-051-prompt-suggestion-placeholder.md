# REVIEW-051 Review: Surface the next-turn prompt suggestion in the composer placeholder

## Meta

- Task ID: `REVIEW-051`
- Status: `ready`
- BUILD Task: `BUILD-051`
- Reviewed commit: `<git commit SHA>`
- Reviewed branch: `<branch-name>`

---

## §1 Static Code Review

### §1.1 Checklist

| 檢查項目                                      | 結果 |
| --------------------------------------------- | ---- |
| `any` / `as any`                              |      |
| `@ts-ignore` / `eslint-disable`               |      |
| library code 殘留 `console.log`               |      |
| hardcode API key / endpoint / namespace       |      |
| RxJS 訂閱 / EventSource / timer teardown      |      |
| react 只從 core 公開進入點 import             |      |
| core 反向 import react / react-dom / DOM      |      |
| 公開 API 變更經 `@deprecated` 過渡            |      |
| 新增公開型別 / hook 從 package 進入點導出     |      |
| 新 EventType / fact 型別前置於使用處          |      |
| 使用 `botProviderEndpoint`                    |      |
| 導出函式標明 explicit return type             |      |
| 共用型別集中、無重複 interface                |      |
| React 元件 props 完整型別化                   |      |
| 元件 hardcode 色值                            |      |
| react / react-dom 維持 peerDependencies       |      |
| core 與 react 版本號一致                      |      |
| 重複邏輯 / 型別 / JSX 已抽出                  |      |
| `setTimeout` mock / 死碼 / TODO / FIXME       |      |
| 使用者可見字串全走 `t(locale, key)`、三語系齊 |      |

### §1.2 Mechanical Grep

掃描範圍：BUILD-051 `## Coverage` 列出的變更檔。

> 陣列展開務必寫成 `"${FILES[@]}"`——zsh 不對未加引號的變數做單字分割，grep 會把整條字串當單一路徑、
> 回 `No such file or directory`，不看 exit code 就會誤判成「空輸出 = 通過」（REVIEW-046 / REVIEW-050 已踩過兩次）。

```
<paste output here>
```

### §1.3 TypeScript and Lint

```bash
npm run typecheck:packages
npm run lint:packages
npm run format:check
```

Results:

```
typecheck: PASS / FAIL —
lint:      PASS / FAIL —
format:    PASS / FAIL —
```

### §1.4 Static Review Acceptance

- [ ] All §1.1 items marked ✅/❌
- [ ] All ❌ violations listed with file path and line number
- [ ] §1.2 grep run with exit codes checked, output pasted
- [ ] `npm run typecheck:packages` clean
- [ ] `npm run lint:packages` + `npm run format:check` clean

Any ❌ violation → report BLOCKER to BUILD-051; re-run §1 after fix.

---

## §3 Functional Validation

Vitest for the store / keyboard logic; **headed** browser on `/prompt-suggestion`
(`npm run serve:react-demo`, http://localhost:4200) for everything the user sees. Headless is not
acceptable evidence for the Tab / Shift+Tab focus behavior.

### R# Result Matrix

| R#  | Description                                          | Result                | Note |
| --- | ---------------------------------------------------- | --------------------- | ---- |
| R1  | 空輸入框顯示建議 + `⇥ Tab`                           | Pass / Fail / Blocked |      |
| R2  | Tab 填入、焦點留在輸入框、不送出、可編輯             | Pass / Fail / Blocked |      |
| R3  | 沒有建議時 `inputPlaceholder` 原樣、無提示字元       | Pass / Fail / Blocked |      |
| R4  | 已有字時不顯示建議；Tab 維持移焦、不覆蓋             | Pass / Fail / Blocked |      |
| R5  | `Shift+Tab` 一律不攔                                 | Pass / Fail / Blocked |      |
| R6  | IME 組字中 Tab 交還輸入法                            | Pass / Fail / Blocked |      |
| R7  | `title` / `aria-description` 有／無的兩種狀態都正確  | Pass / Fail / Blocked |      |
| R8  | 採用後 / 送出後 / 新 run 開始清空                    | Pass / Fail / Blocked |      |
| R9  | 重整 / rejoin 後無建議、不 loading、不報錯、不擋輸入 | Pass / Fail / Blocked |      |
| R10 | 一個 run 內兩則 → 顯示最後一則                       | Pass / Fail / Blocked |      |
| R11 | store 語意：晚訂閱者立刻拿到當前值                   | Pass / Fail / Blocked |      |
| R12 | en-US / zh-TW（含 ja-JP）文案齊、切語系即時反映      | Pass / Fail / Blocked |      |
| R13 | 舊消費端行為不變（純新增、無簽章變更）               | Pass / Fail / Blocked |      |
| R14 | (Smoke) build + 測試 + headed demo 走完 R1–R12       | Pass / Fail / Blocked |      |

### §3.1 Acceptance

- [ ] 每條 R# 都實際執行（靜態閱讀 + 瀏覽器操作 + 邊界情境）
- [ ] 每條 R# 標記 Pass / Fail / Blocked 並附說明
- [ ] 邊界情境確認：無建議、建議過長、preview mode、awaiting consent、連續兩輪
- [ ] UI 證據來自 headed 瀏覽器，截圖存 `.github/screenshots/`

Any Fail → BLOCKER to BUILD-051；描述 [actual behavior] vs [expected behavior]。

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

None.

---

## Execution Log

- 2026-08-12: REVIEW task created, paired with BUILD-051 (Status: `draft`).
