# BUILD-034 Hoist the run indicator out of the footer

## Meta

- Task ID: `BUILD-034`
- Status: `done`
- Issue: 待開（`asgard-sdk-pm`）
- Downstream report: `https://github.com/asgard-ai-platform/asgard-heimdall-pm/issues/200`
- Complexity: `S`

---

## Brief

**`renderFooter` 會連同 run indicator 一起吃掉。** F-003 把「run 進行中」的指示線放進 `ChatbotFooter`
（`chatbot-footer.tsx:66`），但 `renderFooter` 的契約是**整個**取代該元件（`chatbot.tsx:485-493`），
於是任何自訂 footer 的 consumer 都會靜默失去這條線 —— 沒有警告、沒有逃生口。

這不是假設：`asgard-auto-post-chatbot-extension`（Heimdall AI，code-server webview）就是這樣中招的，
回報為 heimdall-pm#200「run 進行中 indicator 動畫穩定不出現」。該端看到的「不會動的線」其實是自家
footer 的 `borderTop: 1px solid #434343`（與 `--asg-color-border` 預設值同色），送出鈕照鎖是因為它自己
讀 `isConnecting` —— 三個現象都由「indicator 不在 DOM 上」完整解釋。**本 SDK 從未回歸**：
`running-indicator` 原始碼自 F-003 起零 commit，其編譯後 CSS 在 0.3.27 與 0.3.30 之間 byte 相同。

本 repo 自己的 `/render-footer` demo route 現在也有同一個洞，可直接當重現案例。

**根本原因是層級放錯**：這條線綁的是 `isRunning`（整條連線的狀態），與 footer 內部的任何東西無關；
它在語意上屬於 chat column 的版面，不是 composer 的一部分。

本票把 `<RunningIndicator>` 從 `ChatbotFooter` 內部**提到 chat column**，成為 footer slot 之前的獨立
grid item。所有 consumer 都拿得到，不論走不走 `renderFooter`。

**Hook 限制**：`chatbot.tsx` 那段 JSX 位於一個被當成 `AsgardServiceContextProvider` children 呼叫的
function 內，在該處直接呼叫 `useAsgardContext()` 會在 `Chatbot` 自己的 render 執行、拿不到 provider 值。
需要一個小的 connected 子元件（與 `ChatbotFooter` 現行做法相同）。

**版面風險點**：`.chatbot__chat_column` 的 `grid-template-rows` 由 4 格增為 5 格（header / thread /
menu / **seam** / footer）。這是本票唯一會影響既有 consumer 版面的改動，必須逐一 smoke check。

**不做**：不把 `RunningIndicator` 加進 public export（consumer 不需要自己掛了）；不動 `isRunning` 的
語意（F-023 AC9 排除 transcript replay 的行為保留）；不動 `running-indicator` 元件本身；不動 core。

**Already exists:** `packages/react/src/components/chatbot/running-indicator/`、
`chatbot-footer/chatbot-footer.tsx`、`chatbot.tsx`（`renderFooter` 分支）、
`chatbot.module.scss`（`.chatbot__chat_column`）、demo routes `/render-footer`、`/run-indicator`、
`/composer`、`/all-features`、`/all-features-wide`。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                          |
| ---- | --------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing             |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                        |
| §1.3 | No `console.log` left in library code                                                   |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM                             |
| §1.7 | No breaking public-API change without `@deprecated` transition                          |
| §3.1 | Exported functions / methods declare explicit return types                              |
| §4.1 | React component props fully typed (no `any`)                                            |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context       |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                   |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×) |
| §7   | No dead commented code, no untracked TODO / FIXME                                       |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a run is in progress, while the consumer supplies `renderFooter`, the system shall render the
  seam indicator immediately above the consumer's footer and sweep it for the whole run — where it
  currently renders nothing at all. → T1, T2, T5
- `R2` When the consumer supplies no `renderFooter`, the system shall render the seam in exactly its
  current position and appearance (footer's top edge, same height / colour / timing), with no visual diff
  against the pre-change build. → T1, T2, T3, T5
- `R3` When the run reaches its terminal event, the system shall stop the sweep and leave the static seam
  line, on both footer paths. → T1, T5
- `R4` When the chat column renders, while the seam occupies its own grid row, the system shall keep the
  footer pinned to the container's bottom and the thread scrolling internally — no `.chatbot__chat_column`
  grid row regression on any existing route. → T3, T6
- `R5` When `ChatbotFooter` renders, the system shall no longer contain a `RunningIndicator` of its own,
  so the seam is drawn exactly once regardless of footer path. → T2
- `R6` When the docked `TaskList` / `SubagentList` strip is visible, the system shall keep it directly
  above the seam (the placement BUILD-031 / F-010 / F-012 fixed), not below or overlapping it. → T3, T6
- `R7` (Smoke check) When the developer runs `npm run serve:react-demo` and walks `/render-footer`,
  `/run-indicator`, `/composer`, `/all-features`, `/all-features-wide`, `/task-list`, `/docked-run-chrome`,
  the system shall show the seam in the right place on every route, animating only during a run, with no
  layout shift versus the pre-change build. → T6, T7

---

## Implementation Tasks

- [x] T1 (R1, R2, R3): `chatbot.tsx` — add a small connected component (e.g. `RunIndicatorSlot`) that reads
      `isRunning` from `useAsgardContext()` and renders `<RunningIndicator running={isRunning} />`; mount it
      immediately before the `renderFooter ? … : <ChatbotFooter …/>` ternary so it is a sibling grid item of
      the footer slot on both paths.
- [x] T2 (R2, R5): `chatbot-footer.tsx` — remove the internal `<RunningIndicator>` and its import; update the
      comment block that explains the seam (it now describes where the seam lives, not that the footer owns
      it). `chatbot-footer.module.scss` — update the header comment that claims the seam is drawn by
      `<RunningIndicator>` at the footer's top edge.
- [x] T3 (R2, R4, R6): `chatbot.module.scss` — `.chatbot__chat_column` `grid-template-rows` 4 → 5
      (`max-content 1fr max-content max-content max-content`); update the comment that states "the four rows
      still map to those children in order".
- [x] T4: Check whether any other comment or doc still asserts the footer owns the seam
      (`running-indicator.tsx` / `.module.scss` headers, `chatbot-body.tsx`, `task-list` / `subagent-list`
      SCSS headers, `docs/`), and correct the ones that are now wrong.
- [x] T5 (R1, R3): Extend the `/render-footer` demo route so its custom footer exercises a real run
      (it currently has a send path but no scripted long run) — this route is the durable regression case for
      the heimdall-pm#200 class of bug.
- [x] T6 (R4, R6, R7): Smoke check the routes listed in R7, before and after.
- [x] T7 (R7): Capture before / after screenshots to `.github/screenshots/`.
- [x] T8: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run test:packages` + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: `R1`–`R7`（heimdall-pm#200 的 SDK 端根本修法；連帶保住 F-003 既有 AC 與 BUILD-031 的 docked
strip 定位）

Files:

- `packages/react/src/components/chatbot/chatbot.tsx`（react）— 新增 connected 的 seam slot 元件，掛在
  footer slot 之前
- `packages/react/src/components/chatbot/chatbot.module.scss`（react）— `.chatbot__chat_column` grid rows
  4 → 5，更新註解
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx`（react）— 移除內部
  `<RunningIndicator>` 與 import，更新註解
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.module.scss`（react）— 更新註解
- `apps/react-demo/src/app/routes/render-footer/render-footer.tsx`（demo）— 讓自訂 footer 跑得動一段真實
  run，作為 #200 的長期回歸案例
- `apps/react-demo/src/mock-server/sse-mock.ts`（demo）— 視需要為 `/render-footer` 掛一條可重複觸發的
  scenario channel

---

## Verification Plan

驗證主場是 react-demo（`npm run serve:react-demo`，http://localhost:4200），**不需要任何 consumer 端
打包安裝** —— 這正是把修法放回 SDK 的主要好處之一。

1. **R1 重現轉通過**：`/render-footer` 改動前後對照。改動前該 route 完全沒有 seam 元素（`#200` 的重現）；
   改動後 run 期間應有 seam 且 segment 的 computed `transform` 連續取樣皆相異。
2. **R2 零視覺回歸**：`/run-indicator`（F-003 的既有 10 秒 run）改動前後截圖比對，seam 的
   `getBoundingClientRect()` 應完全相同。
3. **R4 版面不動**：`/composer`、`/all-features`、`/all-features-wide`、`/task-list`、
   `/docked-run-chrome` 逐一比對 footer `bottom` 是否仍等於 container `bottom`、thread 是否仍內捲。
   這是 grid rows 4→5 的風險點，必須逐 route 量測而非目視。
4. **R6**：docked strip 的 `bottom` 應緊鄰 seam 的 `top`。

量測方式比照 BUILD-031：以 playwright 對關鍵元素做 `getBoundingClientRect()` 與 computed style 取樣。

---

## Verification Evidence

改動前的狀態以 `git stash` 取得（dev server 熱重載），同一顆瀏覽器、同一視窗尺寸，前後量測同一組欄位。

**R1 —— `/render-footer`（自訂 footer，#200 的重現案例）**

| 項目                 | 改動前                                           | 改動後                                                        |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| seam 元素是否存在    | **`false`**（整個 DOM 找不到 running_indicator） | **`true`**                                                    |
| chat column 子元素   | header / main_row / menu / footer                | header / main_row / menu / **seam** / footer                  |
| `grid-template-rows` | `56px 486px 45px 53px`                           | `56px 484px 45px 2px 53px`                                    |
| run 期間 segment     | 不存在                                           | 全程存在，5 次取樣 transform **全異**（126→191→256→320→−105） |
| run 期間送出鈕       | 鎖定                                             | 鎖定（與動畫同步，5 次取樣皆 `disabled`）                     |
| run 結束後           | —                                                | segment 消失、靜態 seam 保留 2px、`role` 屬性移除（R3）       |

**R2 —— `/run-indicator`（預設 footer，零視覺回歸）**

| 項目                                 | 改動前                                    | 改動後                                    | 差異                                  |
| ------------------------------------ | ----------------------------------------- | ----------------------------------------- | ------------------------------------- |
| seam `getBoundingClientRect()`       | top 677 / left 412 / width 375 / height 2 | top 677 / left 412 / width 375 / height 2 | **完全相同**                          |
| thread 高度                          | 504                                       | 504                                       | 0                                     |
| footer `bottom`                      | 757                                       | 757                                       | 0                                     |
| footer `bottom` − container `bottom` | 0                                         | 0                                         | 0                                     |
| `grid-template-rows`                 | `56px 504px 80px 0px`                     | `56px 504px 2px 78px 0px`                 | footer 80→78，seam 獨立 2px，合計不變 |
| seam 是否在 footer 內                | `true`                                    | `false`                                   | 本票的目的                            |

**R4 / R6 —— 版面不動**（grid 4→5 的風險點，逐 route 量測而非目視）

| Route                | footer `bottom` − container `bottom` | seam→footer 間距 | docked strip→seam 間距 | thread 內捲 |
| -------------------- | ------------------------------------ | ---------------- | ---------------------- | ----------- |
| `/render-footer`     | 0                                    | 0                | 無 strip               | ✓           |
| `/run-indicator`     | 0                                    | 0                | 無 strip               | ✓           |
| `/docked-run-chrome` | 0                                    | 0                | **0**（緊貼，R6）      | ✓           |
| `/all-features-wide` | 0                                    | 0                | 無 strip               | ✓           |

`/all-features-wide` 另確認 seam 寬度與 footer 寬度差 **0**（File Explorer aside 開啟時兩者一起縮）。

**grid row 指派是位置性的，但不脆弱**：`renderMenu` 未提供時不產生元素，seam 會落在第 3 格、footer 第 4 格、
第 5 格留空（`/run-indicator`、`/all-features-wide` 實測即為此）。因為除 `1fr`（thread）外每一格都是
`max-content`，誰落在哪一格都不影響版面 —— 唯一的要求是 thread 仍在 `1fr`，四條 route 皆成立。

**其餘檢查**：`typecheck:packages` 2 projects 通過；`lint:packages` 2 projects 通過（1 個既有 warning，
在 `use-file-explorer-controller` 的 `useMemo` deps，與本票無關）；`test:packages` core 159 + react 46 全通過。
`apps/react-demo` 的 `tsc` 有 8 個**既有**型別錯（`ChatbotTheme` 未匯出等），本票新增/修改的
`render-footer.tsx` 不在其中。

**截圖**（T7）：`.github/screenshots/heimdall-pm-200-render-footer-{before,after}.png` —— `/render-footer`
**run 進行中**的交界特寫。

第一版拍整頁，結果兩張看起來一模一樣：2px 的線在頁面尺度下根本分辨不出來，等於沒有傳達任何資訊。改成
貼齊 footer 上緣裁切（±14px、`deviceScaleFactor: 3`）後才看得出差異 —— before 只有一條靜態灰線（此時
run 正在進行），after 同一條線上有 primary 色漸層掃過。

兩張都在 run 進行中拍攝，且**只有 `packages/` 被還原**（`git checkout HEAD~1 -- packages`），demo route
保持一致，所以兩圖差異僅來自 SDK 本身。截圖腳本同時斷言了 DOM 狀態：before `segmentPresent: false`、
after `segmentPresent: true` 且 `transform: matrix(1,0,0,1,240.2,0)`（掃動中段）。

---

## Downstream

SDK 發版後，`asgard-auto-post-chatbot-extension` 端只需：

1. 升 `@asgard-js/*` 至含本票的版本
2. 刪掉 `CustomFooter` 最外層的 `borderTop: '1px solid #434343'`（`src/webview/index.tsx:484`）——
   否則會與 SDK 的 seam 疊成雙線

該端先前的 hand-roll 修法（PR #72）作廢。

其他自訂 footer 的 consumer 若也自畫了分隔線，同樣需拿掉；本票屬行為變更，須記入 release note。
