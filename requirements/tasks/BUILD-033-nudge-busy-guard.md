# BUILD-033 Refuse a nudge while a run holds the channel

## Meta

- Task ID: `BUILD-033`
- Status: `done`
- Issue: `內部票 — 無 PM issue`（源自 REVIEW-032 發版前覆查的 Findings Minor 0；比照 BUILD-026 的內部票慣例）
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-023-停止生成改為真正中止背景-run.md`（AC6 / UC-045 的「一個 channel 同時只能有一個 run」）
- Complexity: `S`

---

## Brief

`sendMessage` 會在 run 進行中 reject `ChannelBusyError`（F-023 AC6 / UC-045：一個 channel 同時只能有一個 run），
`nudge` 沒有這道守衛。它是隱形的，但仍然是一個 turn。

損害不只是多一個 run：`fetchSse` 會**覆寫 `this.currentRun` 而不 unsubscribe 舊的**（訂閱洩漏），並把
`runStatusSubject` 蓋成 `{ kind: 'nudge' }`。而 react 的 `canStop` 要求 `kind === 'user'` —— 於是使用者自己那個 run
的停止鈕當場消失，而且**再也停不掉**，同時兩個 run 寫同一份 transcript。

觸發窗口是真的：送出訊息到 sandbox 起來之間，File Explorer 正好處於空狀態、Nudge 鈕是可按的。

本票非近期改動造成，`0.3.29` 之前就存在。

**Already exists:** `sendMessage` 的 busy 守衛（`channel.ts:531-533`）、`ChannelBusyError`（已從 core 進入點導出）、
`stop-generation.spec.ts` 的 `makeHarness` / `startUserRun` / `statusOf` 測試骨架、
`.nudgeBtn:disabled` 樣式（`opacity: 0.6; cursor: default`，已存在）。

---

## Relevant Rules

| §    | Rule (summary)                                                                 |
| ---- | ------------------------------------------------------------------------------ |
| §1.1 | No `any` / `as any`                                                            |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors               |
| §1.3 | No `console.log` left in library code                                          |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown                     |
| §1.6 | `@asgard-js/core` never imports react / react-dom / DOM                        |
| §1.7 | No breaking public-API change without `@deprecated` transition                 |
| §2.2 | New public types / props exported from the package entry                       |
| §3.1 | Exported functions / methods declare explicit return types                     |
| §4.1 | React component props fully typed                                              |
| §4.2 | No hardcoded color values                                                      |
| §6   | Extract repeated logic (≥2×)                                                   |
| §7   | No `setTimeout` mock delays, no dead commented code, no untracked TODO / FIXME |

---

## Acceptance Criteria

- `R1` When `Channel.nudge()` is called while any run holds the channel, the system shall reject with
  `ChannelBusyError` and dispatch no request. → T1
- `R2` When a nudge is refused, the system shall leave the in-flight run's identity intact
  (`runStatus.kind === 'user'`, `requestId` preserved), so its stop control stays on screen. → T1
- `R3` When a nudge is refused, the system shall not replace `currentRun`, so the in-flight run is still
  torn down on `close()` rather than stranded. → T1
- `R4` When the channel is idle, `nudge()` shall dispatch exactly as before. → T1
- `R5` When a nudge is refused (or the host's `onNudge` rejects for any reason), the File Explorer panel
  shall swallow the rejection rather than raise an unhandled promise rejection from the click handler. → T2
- `R6` When a run holds the channel, the built-in File Explorer's Nudge button shall be disabled, and it
  shall become enabled again once the run settles. → T2, T3
- `R7` (Smoke check) `lint:packages` / `format:check` / `typecheck:packages` / both builds / `test:packages`
  all green, and the disabled behavior observed in the browser. → T4, T5

---

## Implementation Tasks

- [x] T1 (R1–R4): `packages/core/src/lib/channel.ts` — `nudge` 加上與 `sendMessage` 同型的 busy 守衛；
      `stop-generation.spec.ts` 新增 `nudge — one run at a time` describe（4 案例）。
- [x] T2 (R5, R6): `file-explorer-panel.tsx` — `handleNudge` 加 `catch`；新增 optional prop `nudgeDisabled`
      並接進 `disabled={nudging || nudgeDisabled}` 與 `handleNudge` 的早退。
- [x] T3 (R6): `chatbot-file-explorer.tsx` — 從 `useAsgardContext()` 取 `isRunning` 傳入 `nudgeDisabled`。
- [x] T4 (R7): `npm run lint:packages && npm run format:check && npm run typecheck:packages`；兩包 build；`test:packages`。
- [x] T5 (R7): 瀏覽器於 `/nudge-payload` 開啟內建 File Explorer，對 Nudge 鈕的 `disabled` 取樣觀察 run 前 / 中 / 後。

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6, R7

Files:

- `packages/core/src/lib/channel.ts` (core) — `nudge` 的 `ChannelBusyError` 守衛 + doc
- `packages/core/src/lib/stop-generation.spec.ts` (core) — 新增 `nudge — one run at a time` 4 案例
- `packages/react/src/components/chatbot/file-explorer/file-explorer-panel.tsx` (react) — `nudgeDisabled` prop、`handleNudge` 的 catch 與早退、按鈕 `disabled`
- `packages/react/src/components/chatbot/file-explorer/chatbot-file-explorer.tsx` (react) — 傳入 `nudgeDisabled={isRunning}`

---

## Verification evidence (R7)

TDD：4 個新案例先在未修改的實作下跑，3 個 red（`refuses to dispatch` / `leaves the in-flight run stoppable` /
`does not strand the in-flight run`），1 個 green（`still dispatches once the run has settled`，證明沒有破壞既有行為）。
加上守衛後 4/4 green。

閘門：`lint:packages` 0 error（1 個既有 warning 在未改動的 `file-view.tsx`）、`format:check` pass、
`typecheck:packages` pass、`build:core` + `build:react` pass、`test:packages` core **159/159**（+4）、react 46/46。

瀏覽器（`/nudge-payload`，開啟內建 File Explorer，對 Nudge 鈕的 `disabled` 每 250ms 取樣一次）：

```
sequence: eeeeeeeeeeeeeeeeeDDDDDD      （e = enabled、D = disabled）
                   ↑ 此處送出訊息
run 結束後：{"nudgeDisabledNow": false, "runIndicatorVisible": false}
```

即 idle 時可按、run 一開始即 disabled、run 結束恢復可按（不會卡住）。`.nudgeBtn:disabled`
（`opacity: 0.6; cursor: default`）為既有樣式，本票未新增視覺。

> 未附 disabled 狀態的截圖：demo 用的是 echo bot，單次 run 只有約一秒，難以穩定攔截該瞬間。上述 DOM 取樣是
> 比截圖更確實的證據，故以它為準，不以擺拍補圖。

---

## 下游追蹤（不在本票）

`nudgeDisabled` 對**自行擺放** `FileExplorerPanel` 的消費端不會自動生效 —— SDK 只在自己的內建接線
（`chatbot-file-explorer.tsx`）傳入。Sindri（`asgard-ai-agent-hub-web`）的面板長在 `<Chatbot>` 之外的 dockview 裡，
要享有同樣保護需自行傳入該 prop。核心防護（core 的守衛）不受此影響，任何消費端都拿得到。

---

## Execution Log / Change Log

- 2026-07-29: 由 REVIEW-032 發版前覆查的 Findings 開出內部票，使用者裁示不開 PM issue、直接修 (Status: `in-progress`)。
- 2026-07-29: T1–T5 完成；R1–R7 全數驗證；靜態閘門與測試全綠 (Status: `in-progress → done`)。
