# BUILD-047 Let the chat column's horizontal inset scale with its own width

## Meta

- Task ID: `BUILD-047`
- Status: `in-progress`
- Issue: 無 GitHub issue —— PM 口頭回饋（2026-08-06）：「Platform Agent 說的話的呈現，可能要把水平方向的 padding 加大些，現在這樣太貼有點奇怪」「Heimdall topic 生成好像也有類似問題」，附 Odin Flow Agent preview 展開狀態的截圖。
- Source spec: 無 PM spec 檔；問題定義與方案取捨在本檔 Brief。
- Complexity: `S`

---

## Brief

PM 抱怨的兩個畫面（Odin 的 Flow Agent preview、Heimdall 的 topic 生成／編輯頁）是同一個元件、同一個值：chat column 的水平內距 **16px**。它自 2025-03-16（`a50e1ab0`）進來後就沒動過（2026-07-15 的 `d8d15a3c` 只把底部 16px 改成 12px），而且在四個地方各寫一份：`.chatbot_body__content`、`.chatbot_body__docked_content`、`.chat_header`、`.chatbot_footer__content`（後者寫成 `var(--asg-spacing-4)`，剛好也是 16px）。

**為什麼只有 bot 訊息看起來貼邊**：bot 文字是無氣泡、滿寬的（`.text--bot { padding: 0; background: transparent }`），所以那 16px 就是文字到面板邊緣的**全部**距離；使用者氣泡自帶 `8px 12px`，視覺內縮 28px。而 16px 又不大於訊息之間的 16px 垂直間隙，眼睛得不到「這裡是邊界」的線索。

**為什麼同一個 SDK 在別的頁面看起來沒事**：Odin 的 Managed Agent 預覽頁把 `<Chatbot>` 放在頁面容器的 `px-12`（48px）裡（`AgentChatPreview.tsx:322`、`:383`），卡片外面本來就有留白可借。PM 抱怨的那個是 `fixed bottom-4 right-4` 的懸浮面板（`workflow-set-preview.tsx:507-511`），外層沒有任何 padding，收合是 `w-[375px]`、展開變 `w-[calc(70vw)] max-w-[1200px]` —— 16px 是為收合的 375px 調的，展開到近 700px 時完全沒跟著長。

**做法**：內距改成跟著 **column 自己的寬度**走，而不是視窗斷點。百分比 padding 是對 containing block 的 inline size 解析的，而那四個盒子都在同一個 `.chatbot__chat_column` 裡，所以四處會解析出同一個數字、永遠對齊（File Explorer 側欄打開讓欄變窄時也一起縮）。`max()` 把下限釘在窄 widget 原本調好的 16px，`min()` 給上限避免寬面板變成雜誌邊界。

**刻意不做**：

- 不開放公開接口（無 prop、無公開 CSS 變數）—— 用 SCSS 編譯期常數，改一次四處都動。代價是消費端無法自行覆寫，數值要調得改 SDK 發版。**此為使用者明示決定。**
- 不動 `.text--bot` 的 `padding: 0`（bot 訊息維持無氣泡滿寬）。
- 不動 `max-width: 1200px`。訊息閱讀寬度過寬（一行近 100 字）是**另一個獨立問題**，且收窄它救不了 PM 這個 case（他的面板才 700px、碰不到上限），視覺變動範圍卻大得多 —— 另開票由 PM 判斷。

**Already exists:** 四處要改的宣告；`packages/react/src/styles/` 的 token 產生器（`colors` / `palette` / `radius` / `spacing`，都是產出 `--asg-*` CSS 變數的 mixin，沒有「欄位內距」這個概念）；`chatbot-container.module.scss` 已有的 `@use '../../../styles'` 用法可循。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`.

| §    | Rule (summary)                                                                              |
| ---- | ------------------------------------------------------------------------------------------- |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                            |
| §1.7 | No breaking public-API change without `@deprecated` transition                              |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context           |
| §6   | After implementation: extract repeated logic (≥2×) — 這裡正是把重複四次的 16px 收成單一來源 |
| §7   | No dead commented code, no untracked TODO / FIXME                                           |

---

## Acceptance Criteria

- `R1` 當 chat column 寬度 ≤400px 時，水平內距應維持 16px（窄的嵌入式 widget 不受影響）。→ T3, T4
- `R2` 當 chat column 寬度落在 400–800px 之間時，水平內距應隨寬度線性增加（4%）。→ T4
- `R3` 當 chat column 寬度 ≥800px 時，水平內距應封頂於 32px。→ T4
- `R4` 訊息串、docked run-chrome strip、header、composer 四者在任一寬度下應解析出同一個內距值（左緣同一條線）。→ T2, T4
- `R5` 該內距不得成為公開 API：不得新增 prop、不得新增消費端可依賴的 CSS 變數。→ T1
- `R6` (Smoke check) `lint:packages`、`format:check`、`typecheck:packages`、`build:core && build:react`、`test:packages` 全過。→ T5

---

## Implementation Tasks

- [x] T1: 新增 `packages/react/src/styles/layout/_variables.scss`，定義 `$chat-gutter: max(16px, min(4%, 32px))`，並在註解寫下成因（bot 文字無氣泡、16px 不大於訊息間距、百分比對 containing block 解析）與「刻意不是 CSS 變數」的理由；由 `styles/_styles.scss` 的 `@forward` 帶出。
- [x] T2: 四處改用 `styles.$chat-gutter`，並把 `padding` 簡寫拆成 `padding-block` / `padding-inline`（`chatbot-body.module.scss` 兩處、`chat-header.module.scss`、`chatbot-footer.module.scss`）。
- [x] T3: 確認編譯產物：`dist/index.css` 四個 selector 各帶一份 `padding-inline:max(16px,min(4%,32px))`。
- [x] T4: react-demo 實測 —— 用 Preview Width 切換與程式化改寬，量 `getComputedStyle().paddingLeft`，並截圖 375px 與 960px（後者含 before/after 對照）。
- [x] T5: `lint:packages` + `format:check` + `typecheck:packages` + `build:core && build:react` + `test:packages`。

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6

Files:

- `packages/react/src/styles/layout/_variables.scss` (react, new) — `$chat-gutter` 與成因註解
- `packages/react/src/styles/_styles.scss` (react) — `@forward './layout/variables'`
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.module.scss` (react) — 訊息串 + docked strip
- `packages/react/src/components/chatbot/chat-header/chat-header.module.scss` (react)
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.module.scss` (react)

不納入的相鄰表面（查證後判定不屬於這條對齊線）：`service-error-state` 與 `api-key-input` 的 `padding: 24px`（佔滿面板的置中狀態），`sandbox-launch-hud`（`position: absolute; right: 1rem; bottom: 1rem` 的浮動 HUD）。

---

## 實測（T4）

react-demo `/templates`，量三處的 computed `paddingLeft`：

| column 寬度 | 訊息串 | header | composer | 對應情境                             |
| ----------- | ------ | ------ | -------- | ------------------------------------ |
| 375px       | 16px   | 16px   | 16px     | Flow Agent preview 收合、嵌入 widget |
| 380px       | 16px   | 16px   | 16px     | 下限                                 |
| 500px       | 20px   | 20px   | 20px     | 斜率段                               |
| 700px       | 28px   | 28px   | 28px     | **PM 截圖的展開面板**                |
| 800px       | 32px   | 32px   | 32px     | 封頂起點                             |
| 960px       | 32px   | 32px   | 32px     | 寬面板 / Heimdall                    |

960px 下 bot 文字左緣 = column 左緣 + 32px，與 header、composer 同一條線（R4）。

### 消費端實測（T4b）

`npm pack` 出 `0.3.49-local`，`--no-save --legacy-peer-deps` 裝進五個消費端的 `node_modules`，逐一在瀏覽器實測。每個都先確認頁面載入的確實是本地版（掃 `document.styleSheets` 找 `min(4%, 32px)`），再量 computed `paddingLeft`：

| 消費端       | 表面                          | column 寬 | 內距    | 對齊查證                                       |
| ------------ | ----------------------------- | --------- | ------- | ---------------------------------------------- |
| **Odin**     | Flow Agent preview（收合）    | 375px     | 16px    | header / thread / composer 三處同值            |
| **Odin**     | Flow Agent preview（展開）    | 1058px    | 32px    | bot 文字左緣 470 = 面板 438 + 32，三處同一條線 |
| **Heimdall** | topic 編輯的 AI 面板          | 1256px    | 32px    | thread / composer 皆 left 316（1200 上限置中） |
| **Sindri**   | conversation（含子代理面板）  | 1312px    | 32px    | thread / **docked** / composer 皆 left 472     |
| **Mimir**    | insight thread                | 1204px    | 32px    | header / thread / composer 皆 left 260         |
| **embed**    | bot-provider 頁（程式化改寬） | 375→900px | 16→32px | 375=16 / 420=16.8 / 600=24 / 900=32            |

**docked run-chrome strip 的畫面證據由 Sindri 補齊**（demo 無 subagent / task 資料，量不到）：它的「子代理」面板與訊息串同為 32px、left 472。

Heimdall 的自訂標題列（非 SDK 的 `chat_header`）文字停在 304，與訊息串的 316 差 **12px** —— 即 Brief 所述的已知代價，需在 `asgard-ai-auto-post-web` 另案補上。

截圖：`.github/screenshots/gutter-odin-flow-preview-{collapsed-375,expanded-1058}.jpg`、`gutter-heimdall-topic-1200.jpg`、`gutter-sindri-docked-768.jpg`、`gutter-mimir-thread-1204.jpg`。

> 初版曾以 react-demo `/templates` 的畫面作為 PR 證據，已撤換：該頁只傳 `theme={{ chatbot: { width, maxWidth, height } }}`、一個顏色都沒設，`--asg-color-bg` 未定義使 chatbot 背景為 `rgba(0,0,0,0)`，bot 文字又是 `rgb(255,255,255)`，於是白字透出 demo 的淺色底、幾乎不可讀。那是 demo 既有的配色缺陷（與本任務無關，本任務的 diff 不含任何 color / background 增刪），但拿它當截圖會誤導。

---

## Execution Log / Change Log

- 2026-08-06: 依 PM 口頭回饋建立（Status: `draft → in-progress`）。問題定義確認兩個抱怨畫面同源，且 Odin 另一頁「看起來沒事」是外層 `px-12` 借來的留白，非 SDK 差異。
- 2026-08-06: 方案取捨定案 —— 隨寬度分級（非固定值、非只改訊息串）、不開放公開接口、閱讀寬度上限另案處理。
- 2026-08-06: 實作完成；lint（0 errors，1 筆既有 warning）/ format:check / typecheck / test（core 177 + react 114）/ build:core / build:react 全綠；react-demo 實測六個寬度符合 R1–R4。
- 2026-08-06: PR #396 開出。
- 2026-08-06: 以 `0.3.49-local` tarball 實測 Odin / Heimdall / Sindri / Mimir / embed 五個消費端，全部符合 R1–R4；Sindri 補齊 docked strip 的畫面證據。PR 截圖由 react-demo 換成真實產品畫面（demo 配色缺陷詳見 T4b 註）。
