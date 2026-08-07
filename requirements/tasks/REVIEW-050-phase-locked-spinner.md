# REVIEW-050 Review: Lock every loading spinner to a shared phase

## Meta

- Task ID: `REVIEW-050`
- Status: `done`
- BUILD Task: `BUILD-050`
- Reviewed commit: `bf0eb9969c6668a4ab0c2bc50bf335b4ad7aac2a`
- Reviewed branch: `fix/55-phase-locked-spinner`

---

## §1 Static Code Review

### §1.1 Checklist

| 檢查項目                                 | 結果                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `any` / `as any`                         | ✅ 無                                                                          |
| `@ts-ignore` / `eslint-disable`          | ✅ 無                                                                          |
| library code 殘留 `console.log`          | ✅ 無                                                                          |
| hardcode API key / endpoint / namespace  | ✅ 不適用（未觸及設定路徑）                                                    |
| RxJS 訂閱 / EventSource / timer teardown | ✅ 有 —— `useSyncedSpin` 的 effect cleanup 呼叫 `animation.cancel()`，並有測試 |
| react 只從 core 公開進入點 import        | ✅ 無 `core/src` 深挖                                                          |
| core 反向 import react / react-dom / DOM | ✅ 無（本次改動全在 react package）                                            |
| 公開 API 變更經 `@deprecated` 過渡       | ✅ 無破壞性變更（見 §1.4）                                                     |
| 新增公開型別 / 元件從 package 進入點導出 | ✅ `useSyncedSpin` 已導出；`Spinner` 刻意不導出（見 §1.4）                     |
| message template 前置依賴                | ✅ 不適用（未新增 template）                                                   |
| 使用 `botProviderEndpoint`               | ✅ 不適用                                                                      |
| 導出函式標明 explicit return type        | ✅ 是（`useSyncedSpin` / `Spinner` / cleanup 皆標注）                          |
| 共用型別集中、無重複 interface           | ✅ 是（`SpinnerProps` 單一定義）                                               |
| React 元件 props 完整型別化              | ✅ 是                                                                          |
| 元件 hardcode 色值                       | ✅ 無 —— 顏色留在各呼叫端既有的 class 上，`Spinner` 只吃 `currentColor`        |
| react / react-dom 維持 peerDependencies  | ✅ 未更動                                                                      |
| core 與 react 版本號一致                 | ✅ `0.3.47` / `0.3.47`（本次未升版）                                           |
| 重複邏輯 / 型別 / JSX 已抽出             | ✅ 本 cycle 的主軸 —— 5 份重複 glyph + 7 份 keyframes 收斂為 1（見 §1.4）      |
| `setTimeout` mock / 死碼 / TODO / FIXME  | ✅ 無新增（見 §1.2 註）                                                        |

### §1.2 Mechanical Grep

掃描範圍：BUILD-050 `## Coverage` 的 22 個 `.ts`/`.tsx` 變更檔（以 `git diff --name-only` + untracked 取得，
陣列展開 `"${FILES[@]}"` 傳入 grep）。

> **踩到 REVIEW-046 記錄過的同一個坑**：第一次用未加引號的 `$DIRS` 傳多個路徑，zsh 不做單字分割，
> grep 收到一整條字串當單一路徑、回 `No such file or directory` —— 若沒看 exit code 會誤判成「空輸出 = 通過」。
> 已改陣列展開重跑。

```
✅ 空 — : any / <any> / as any
✅ 空 — @ts-ignore / @ts-nocheck / eslint-disable
✅ 空 — console.log
✅ 空 — TODO / FIXME
✅ 空 — #rrggbb / rgba(
✅ 空 — @asgard-js/core/src / core/src/lib（react 深挖 core）
✅ 空 — from 'react' / react-dom（core 反向相依，掃 packages/core/src）
⚠️  setTimeout —— file-view.tsx:115,119
```

`file-view.tsx` 的兩處 `setTimeout` 是既有的 autosave debounce，`git diff` 證實非本次引入
（`git diff … | grep '^+.*setTimeout'` 為空），不構成 §7 違規。

### §1.3 Build / Lint / Format / Test

```
PASS  npm run lint:packages      # 0 errors, 1 warning（file-view.tsx:175 既有 exhaustive-deps，非本次）
PASS  npm run format:check
PASS  npm run typecheck:packages
PASS  npm run build:core
PASS  npm run build:react        # 0 個 error TS
PASS  npm run test:packages      # core 177 passed / react 121 passed（本次 +8）
PASS  npx nx lint react-demo     # 0 errors（15 個既有 warning，新檔零命中）
```

### §1.4 Static Review Acceptance

✅ 通過：19 項　 ❌ 違規：0 項

- **§1.7 公開 API**：刪掉的 `LoaderCircleIcon`（file-explorer/icons.tsx）與 `LoaderIcon`（chat-header/icons.tsx）
  **從未是公開 API** —— `git show HEAD:…/file-explorer/index.ts` 與 `…/chat-header/index.ts` 皆無 loader 導出，
  兩者只被同目錄內部使用。故不需 `@deprecated`。
- **§2.2 導出決策**：`useSyncedSpin` 經 `hooks/index.ts` 進入 public entry（建置產物
  `dist/hooks/use-synced-spin.d.ts` 已確認），讓自行擺放面板的消費端能讓自家 spinner 跟 SDK 同步。
  `Spinner` **刻意不加進 `components/index.ts`** —— 它是內部細節，公開它等於承諾一個 glyph 外觀契約。
- **§6 重構掃描**：這正是本 cycle 的目的。`loader-circle` 的 arc path 原本在 5 個檔各抄一份
  （subagent-list / task-list / tool-call-group 檔內私有 + file-explorer/icons + chat-header/icons），
  spin keyframes 在 7 個 scss 各寫一份 —— 全部收斂成 `Spinner` + `useSyncedSpin`。
- **既有觀察（非本次引入）**：`*.spec.d.ts` 會被 `vite-plugin-dts` 打進 `dist/`
  （`create-sandbox-fs-providers.spec.d.ts` 等既有檔同樣如此）。本次新增的 spec 沿用同一行為，不列為違規。

---

## §3 Functional Validation

### R# Result Matrix

| R#  | 驗收條件                                    | 結果    | 證據                                                                                                                                                       |
| --- | ------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 不同時刻 mount 的 spinner 相位一致（< 1°）  | ✅ Pass | `/spinner-sync` 三組面板間隔約 370ms 陸續掛載，8 個 spinner 取樣角度**唯一值 144.936°、spread 0.000000°**；另一輪取樣為 212.58° / 172.908°，同樣 spread 0° |
| R2  | 週期統一 1s（含原 0.8s 的 attachment ring） | ✅ Pass | 瀏覽器取樣 `uniqueDurations: ["1000"]`；ring 另有 `attachment-preview-spin.spec.tsx` 斷言 `{duration: 1000, iterations: Infinity}`                         |
| R3  | `prefers-reduced-motion: reduce` 全部停轉   | ✅ Pass | 以 `initScript` 強制 `matchMedia` 命中後重載，`getAnimations().length` 皆 `0`、`transform: none`；單元測試另有一條                                         |
| R4  | 無 Web Animations API（jsdom）不拋錯        | ✅ Pass | `use-synced-spin.spec.tsx`「renders without throwing when the runtime has no Web Animations API」                                                          |
| R5  | unmount 取消 animation                      | ✅ Pass | 同檔「cancels the animation on unmount」                                                                                                                   |
| R6  | 全 repo 無殘留 spin `@keyframes`            | ✅ Pass | `grep -rn 'keyframes\|animation:' packages/react/src --include='*.scss' \| grep -i spin` → 空                                                              |
| R7  | build + 套件測試 + demo 走查                | ✅ Pass | 見 §1.3；demo 目視見下方                                                                                                                                   |

**bug 本身的重現（對照組）**：在同一頁面注入舊做法（純 CSS `animation`，4 個環間隔 250ms 插入），
量得角度 `356.97° / 263.97° / 173.98° / 84.38°`、**spread 272.59°** —— 正是 BUG-007 描述的「開口亂指」。
修復後同條件 spread 為 0°。修法有效性因此不是推論而是量測。

### §3.1 Acceptance

7 / 7 Pass，0 Fail。

**邊界條件**：reduced-motion（R3）、無 WAAPI 執行環境（R4）、unmount 清理（R5）皆已覆蓋。
demo 目視另確認：SubagentList（agent glyph + 展開後的 child tool glyph）、TaskList、
ChatHeader busy action（18px、灰、外觀不變）。
截圖：`.github/screenshots/bug-007-spinner-phase-synced.png`。

---

## Findings

### Critical (must fix before done)

無。

### Important (should fix in this cycle)

無。

### Minor (nice to have)

1. **`attachment-preview` 的 ring 差點沒被驗到，是測試先失敗才發現走的是另一條路徑**。初版測試用
   `kind: 'document'` 的附件，結果 `animateCalls` 為空 —— 因為 ring（`StatusOverlay`）只掛在**圖片**縮圖上，
   document 走的是 chip、根本沒有 ring。若當時沒寫這條測試、只靠「hook 掛上去了就會動」的推論，
   這個唯一非 `Spinner` 元件的路徑會是零驗證。
2. **`tool-call-group` 與 file-explorer 的 spinner 未在瀏覽器實測**：兩者的 loading 狀態在 demo 中是瞬時的
   （mock fs 同步回應、既有 route 沒有 pending 的 tool-call）。判定依據是「被移除的 class 內容只有
   `animation` 一行」的 scss 原文核對 + 型別檢查 + 測試。可信但不是眼見為憑；日後若要補，需要一個能停在
   pending 狀態的 demo route。
3. **`chat-header` 的 reduced-motion 行為確實變了**（減速到 2s → 停轉），這是計畫階段就標出並由使用者確認的取捨，
   非缺陷。BUG-007 的 AC3 原文寫「停轉行為維持不變」，但七處中只有 chat-header 不是停轉 —— 措辭與現況有出入，
   實作採 spec〈修復方向〉段「`prefers-reduced-motion` 停轉統一收進 Spinner」的意圖。
4. **spec 的 spec_refs 與現況有兩處小出入**（不影響結論）：spec 說 file-explorer 是 0.9s，實際 code 是 1s；
   spec 說「7 處」是指 7 個 scss，實際 tsx 呼叫點有 10 個（`code-editor.tsx` 借用 file-view 的 scss，未列在 spec）。
5. **本次為自審**，同 REVIEW-043 ～ 046。

---

## Execution Log

- 2026-08-07: REVIEW task created, paired with BUILD-050 (Status: `draft`).
- 2026-08-07: §1 靜態審查執行完畢 — 19 項通過、0 違規；grep 第一次因 zsh 變數 quoting 未實際掃到（REVIEW-046 記錄過的同一個坑），改陣列展開後重跑。
- 2026-08-07: §3 功能驗收執行完畢 — R1–R7 全數 Pass；R1 以獨立重量測確認 spread 0°，並在同頁重現舊做法得 spread 272.59° 作為對照。
- 2026-08-07: 0 BLOCKER，REVIEW-050 標記 `done`。
