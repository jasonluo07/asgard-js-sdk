# BUILD-048 Stop `word-break: break-all` from splitting English words mid-word

## Meta

- Task ID: `BUILD-048`
- Status: `done`
- Issue: 無 GitHub issue —— 於 BUILD-047 的消費端實測截圖中發現的既有缺陷。
- Source spec: 無 PM spec 檔；缺陷描述與判準在本檔 Brief。
- Complexity: `S`

---

## Brief

訊息文字用 `word-break: break-all`（`text-template.module.scss:6`、`:9`）。這個值允許**任意兩個字元之間**斷行，所以英文單字會被從中間劈開——即使整個單字換到下一行放得下。

實測到的斷字（Odin Flow Agent preview，375px 收合面板）：

- `your message ca` / `me through empty`
- `just rese` / `arch`
- `or just are` / `n't sure where to start`

`break-all` 大概是為了「長 URL 不要撐破泡泡」加的。但那個需求由 `overflow-wrap: anywhere` 涵蓋得更精準：它**只在**某個字放不進一整行時才從字中間斷，正常散文永遠不會觸發。CJK 不受影響——中日文的斷行規則本來就允許字與字之間斷，改前改後換行完全一樣。

選 `anywhere` 而非 `break-word`：前者同時縮小 min-content 尺寸，長 token 因此無法把泡泡撐出 flex 父容器；後者不會。這個 repo 已有先例（`streamdown.module.scss:116`、`file-explorer-dialog.module.scss:26`）。

**Already exists:** 六處 `word-break: break-all`（text-template 兩處、references 三處、hint-template 一處、tool-call-group 一處）；`overflow-wrap: anywhere` 的既有用法可循。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`.

| §    | Rule (summary)                                                                   |
| ---- | -------------------------------------------------------------------------------- |
| §1.7 | No breaking public-API change without `@deprecated` transition（本任務不動 API） |
| §4.2 | No hardcoded color values in components（本任務不動顏色）                        |
| §6   | After implementation: extract repeated logic (≥2×)                               |
| §7   | No dead commented code, no untracked TODO / FIXME                                |

---

## Acceptance Criteria

- `R1` 當訊息含英文散文且行寬不足時，換行應發生在單字邊界，不得把單字從中間劈開。→ T1, T3
- `R2` 當訊息含一個長度超過整行的不可斷 token（如長 URL）時，仍應在該 token 內強制斷行，且容器不得產生水平溢出。→ T3
- `R3` 中日文訊息的換行行為不得改變。→ T3
- `R4` 同一缺陷存在於 references 與 hint 兩個散文表面，應一併修正。→ T2
- `R5` (Smoke check) `lint:packages`、`format:check`、`typecheck:packages`、`build:core && build:react`、`test:packages` 全過。→ T4

---

## Implementation Tasks

- [x] T1: `text-template.module.scss` —— `.text` 與其 `> span` 由 `word-break: break-all` 改為 `overflow-wrap: anywhere`，並在註解記下實測到的斷字例、為何不是 `break-word`、CJK 為何不受影響。
- [x] T2: `references.module.scss`（三處）與 `hint-template.module.scss`（一處）同樣改為 `overflow-wrap: anywhere`。
- [x] T3: Odin 實測 —— 裝入本地 build，比對同一段英文問候在 375px 收合面板的換行；另以 DOM 探針插入 200 字元不可斷 URL，量 `scrollWidth` 確認無水平溢出。
- [x] T4: `lint:packages` + `format:check` + `typecheck:packages` + `build:core && build:react` + `test:packages`。

---

## Coverage

Use Cases: R1, R2, R3, R4, R5

Files:

- `packages/react/src/components/templates/text-template/text-template.module.scss` (react) — `.text` 與 `> span`
- `packages/react/src/components/templates/references/references.module.scss` (react) — `.references_box`、`%reference_item_base`、`.reference_item > span`
- `packages/react/src/components/templates/hint-template/hint-template.module.scss` (react) — `.hint_root`

**刻意不改**：`tool-call-group.module.scss:237` 的 `.json_viewer__code`。那是等寬字型 + `white-space: pre-wrap` 的 JSON 檢視器，顯示的是識別字與路徑而非散文，沒有「單字被劈開」這個問題；改它不屬於本缺陷的範圍。

---

## 實測（T3）

Odin Flow Agent preview，375px 收合面板，同一句自動問候：

|                           | 換行結果                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Before**（`break-all`） | `your message ca` / `me through empty`、`just rese` / `arch`、`or just are` / `n't sure`                                                   |
| **After**（`anywhere`）   | `your message` / `came through empty`、`writing, reviewing, or` / `debugging code`、`Claude Code, APIs,` / `SDK setup` —— 全部斷在單字邊界 |

改動後量到的 computed style：`overflow-wrap: anywhere` / `word-break: normal`。

長 token 壓力測試（R2）：以 DOM 探針在 bot 訊息內插入一個 200 字元、含 query string 的 URL，在 343px 寬的訊息欄中折成 7 行，`probe.scrollWidth === 343 === botWidth`，且捲動容器 `scrollWidth === clientWidth`（無水平溢出）。即 `break-all` 原本要防的情況，`anywhere` 一樣防得住。

截圖：`.github/screenshots/word-break-before-split-words.jpg`（= BUILD-047 期間拍到的同一畫面，斷字清晰可見）、`word-break-after-intact-words.jpg`。

---

## Execution Log / Change Log

- 2026-08-06: 建立（Status: `draft → in-progress`）。缺陷是在 BUILD-047 的消費端截圖中發現的：`aren't` 被切成 `are` / `n't`。
- 2026-08-06: 五處改為 `overflow-wrap: anywhere`，JSON 檢視器一處刻意保留並記錄理由。
- 2026-08-06: Odin 實測換行修正 + 長 URL 壓力測試通過；lint（0 errors，1 筆既有 warning）/ format:check / typecheck / test（core 177 + react 114）/ build:core / build:react 全綠。
- 2026-08-06: PR #397 合併進 `main`（merge commit `db64e62e`），隨 0.3.50 出貨（Status: `in-progress → done`）。
