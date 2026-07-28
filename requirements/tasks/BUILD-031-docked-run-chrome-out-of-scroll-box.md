# BUILD-031 Dock the run-chrome panels outside the thread scroll box

## Meta

- Task ID: `BUILD-031`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/32`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/bugs/BUG-003-docked-task-subagent-面板落在訊息-scroll-匡內對話進行中閃爍位移.md`
- Complexity: `S`

---

## Brief

BUG-003：`ChatbotBody` 目前把 run 層活狀態（`SubagentList` / `TaskList`，`chatbot_body__docked`）渲染在 **thread 的 `overflow-y` scroll 匡內**（`scrollContainerRef` → `chatbot_body__content` 尾端），靠 `margin-top: auto` 下沉。因為它在 scroll flow 內，而 thread 高度隨串流持續變動、又被 `useResizeObserver` 觸發 auto-scroll 跟隨，run 進行中面板位置被反覆推擠 → 閃爍 / 位移，偏離 F-010 / F-012 AC 明訂的「docked 在 thread↔ 輸入交界上方（seam 之上）」。

本票把該區塊**移出 scroll 匡**，改成 `.chatbot_body_wrapper` 內、`.chatbot_body`（scroll 匡）之後的 `flex-shrink: 0` 固定區——位於 thread 與 composer 之間、RunningIndicator seam 之上，不參與捲動、也不再被 thread 的 ResizeObserver 觀察到。兩者皆空 → 整區不 render、不占位（維持現有的「無面板時 composer 貼齊最後一則訊息」間距）。

**版面安全**：`.chatbot_body_wrapper` 位於 `.chatbot__chat_column` grid 的 `1fr` row 內（`main_row → thread_area → body_wrapper`），本票**不新增／不移除任何 grid 直接子元素**，grid row 指派完全不變（Body 仍吃 `1fr`、footer 仍釘底）。

**react-only**，不動 `@asgard-js/core`；不動 `hideRunChrome` 逃生口語意；不動 `TaskList` / `SubagentList` 元件內部。

**Already exists:** `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx`（`chatbot_body__docked` 區塊、`contentStyles`）、`chatbot-body.module.scss`（`.chatbot_body__docked` / `.chatbot_body__content`）、`packages/react/src/components/chatbot/task-list/`、`packages/react/src/components/chatbot/subagent-list/`、demo routes `/task-list`、`/subagent-list`、`/all-features-wide`。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.4 | No hardcoded API key / endpoint / namespace — pass via `config`                                                           |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)            |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §2.3 | Template type (`core/src/types/sse-response.ts`) + enum (`core/src/constants/enum.ts`) exist before the react component   |
| §2.4 | Use `botProviderEndpoint`, not the deprecated `endpoint`                                                                  |
| §3.1 | Exported functions / methods declare explicit return types                                                                |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                       |
| §4.1 | React component props fully typed (no `any`)                                                                              |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context                                         |
| §4.4 | `react` / `react-dom` stay peerDependencies (not bundled)                                                                 |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                     |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When `hideRunChrome` is false and at least one task or subagent exists, the system shall render the `SubagentList` / `TaskList` strip as a **sibling of** — not a descendant of — the thread's `overflow-y` scroll container (`[data-scrollable="true"]`), positioned between that container and the composer (above the RunningIndicator seam). → T1, T2
- `R2` When the user scrolls the thread up and down, while the strip is visible, the system shall keep the strip's viewport position unchanged and scroll only the messages. → T1, T2
- `R3` When messages stream in and the thread's content height changes, while the strip is visible, the system shall keep the strip at a stable vertical position (no shift / flicker), and the strip's own height changes shall not be observed by the thread's auto-scroll `ResizeObserver`. → T1
- `R4` When both `tasks` and `subagents` are empty, the system shall render no strip at all, so it occupies no space and the composer keeps its existing clearance to the last message. → T1, T2
- `R5` When `hideRunChrome` is true, the system shall render no built-in strip, leaving the consumer's `renderMenu` / `renderFooter` placement as the only run-chrome (existing escape hatch unchanged). → T1
- `R6` When a thread long enough to overflow is rendered, while the strip is visible, the system shall keep the footer pinned at the bottom of the container and scroll the thread internally (no `.chatbot__chat_column` grid row regression). → T2
- `R7` When the strip is rendered, the system shall align its content with the thread content and the composer — same horizontal inset and the same `chatbot.contentMaxWidth`-driven max width. → T1, T2
- `R8` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and exercises the docked panels in the react-demo (`npm run serve:react-demo`, http://localhost:4200) on `/task-list`, `/subagent-list`, `/all-features-wide` and the new BUG-003 route, the system shall show a stationary strip above the seam through scrolling and streaming, with no build errors. → T6, T7

---

## Implementation Tasks

- [x] T1 (R1, R3, R4, R5, R7): `chatbot-body.tsx` — move the `!hideRunChrome && (subagents.length > 0 || tasks.length > 0)` block out of `.chatbot_body__content` (inside `scrollContainerRef`) and render it as a sibling after the scroll container inside `.chatbot_body_wrapper`; wrap the two lists in an inner content div carrying `contentStyles` so max width matches the thread / composer.
- [x] T2 (R1, R2, R4, R6, R7): `chatbot-body.module.scss` — replace `.chatbot_body__docked`'s `margin-top: auto` scroll-flow docking with the fixed-strip styles (`flex-shrink: 0` on the strip; inner content `margin: 0 auto` + max-width + horizontal inset + `row-gap`); reassess `.chatbot_body__content`'s `min-height: 100%` (its stated purpose was the removed `margin-top: auto` docking) and only drop it if verified visually neutral.
- [x] T3 (R1): Update the comments that still describe the old placement — `chatbot-body.tsx` (docked-panel derivation + JSX comments), `chatbot-footer.tsx` (“render at the tail of the thread … instead of being pinned here”), `task-list.module.scss` / `subagent-list.module.scss` headers (“Rendered at the tail of the thread flow (ChatbotBody content), which already supplies the 16px horizontal inset”).
- [x] T4 (R2, R3, R6): Add an isolated react-demo route for BUG-003 (long, overflowing thread + tasks + subagents, plus a way to keep content streaming/growing) so the fixed positioning is durably verifiable; do not modify existing demo mocks / routes.
- [x] T5: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react`.
- [x] T6 (R8): Smoke check in the react-demo — walk `/task-list`, `/subagent-list`, `/all-features-wide` (Crazy theme, wide) and the new route; verify R1–R7.
- [x] T7 (R8): Capture before / after screenshots to `.github/screenshots/`.

---

## Coverage

Use Cases: `R1`–`R8`（BUG-003；連帶覆蓋 F-010 / F-012 的「docked 在 seam 之上」定位 AC，related UC-016 / UC-019）

Files:

- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx`（react）— docked 區塊移出 scroll 匡、成為 `.chatbot_body_wrapper` 的第二個子元素；新增 `.chatbot_body__docked_content` 內層（帶 `contentStyles`）；更新註解
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.module.scss`（react）— `.chatbot_body__docked` 由 scroll flow 內的 `margin-top: auto` 改為 `flex-shrink: 0` 固定區 + `border-top`；新增 `.chatbot_body__docked_content`；移除 `.chatbot_body__content` 已無用途的 `min-height: 100%`
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx`（react）— 僅更新描述舊定位的註解
- `packages/react/src/components/chatbot/task-list/task-list.module.scss`（react）— 僅更新註解
- `packages/react/src/components/chatbot/subagent-list/subagent-list.module.scss`（react）— 僅更新註解
- `apps/react-demo/src/mock-server/sse-mock.ts`（demo）— 新增 `docked-run-chrome-*` scenario（長串流 + 中途變動 run chrome）
- `apps/react-demo/src/app/routes/docked-run-chrome/{docked-run-chrome.tsx,docked-run-chrome.module.scss,index.ts}`（demo，新增）
- `apps/react-demo/src/app/app.tsx`（demo）— 註冊 `/docked-run-chrome`

---

## Verification Evidence

`/docked-run-chrome`，1440×900，各取樣 90 次 / 250ms（跨越整段串流）：

| 項目                                | 修復前（scroll 匡內）              | 修復後（固定區）                        |
| ----------------------------------- | ---------------------------------- | --------------------------------------- |
| strip 是否在 scroll 匡內            | `true`                             | `false`（`.chatbot_body_wrapper` 次子） |
| thread 成長                         | scrollHeight 714 → 1761            | 604 → 1524（28 次成長事件）             |
| strip top 取值                      | **12 個不同位置**（444–522）       | **每個 strip 高度只對應唯一 top**       |
| 同一 strip 高度（固定內容）下的 top | 高度 221 時飄過 10 個值（444–499） | 高度 223→455、246→431，各僅一值         |
| 捲到頂時                            | strip top = 1701，整個離開視野     | strip top = 431 不動，只有訊息在捲      |

其餘：footer `bottom` 恆等於 container `bottom`（R6）；strip 內層與 thread 內容、composer 內容的 `left`/`right` 三者完全相同（窄版 492/867、`/all-features-wide` 142/1342，R7）；Crazy 主題下 `border-top` 取到 `--asg-color-border`（`#92ff8c`），非寫死（§4.2）；兩者皆空時 wrapper 只剩 1 個子元素、最後一則訊息與 footer 維持原本 12px（R4）；`hideRunChrome: true` 下 strip / TaskList / SubagentList 皆不存在（R5）。回歸：`/task-list`、`/subagent-list`、`/templates`、`/all-features-wide` 皆正常，`min-height: 100%` 移除後短對話不捲動、訊息仍靠頂、footer 仍釘底。

Screenshots：`.github/screenshots/bug-003-{before-docked-strip-in-scroll-flow,before-scrolled-up-panels-gone,after-docked-strip-fixed,after-scrolled-up-panels-stay,after-wide-crazy-theme}.png`

---

## Execution Log / Change Log

- 2026-07-28: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/32 (Status: `draft`).
- 2026-07-29: 使用者確認計畫並選定固定區加 `border-top` 分隔線（prototype 作法）；Status: `draft → ready → in-progress`，開分支 `fix/32-docked-run-chrome-out-of-scroll-box`。
- 2026-07-29: T1–T7 完成。lint 0 error（1 個既有 `file-view.tsx` warning，與本票無關）、`format:check` 全綠、`typecheck:packages` 通過、`build:core` + `build:react` 成功、`test:packages` 41 + core 全數通過。R1–R8 於瀏覽器實測通過（證據見上）(Status: `in-progress → done`).
