# BUILD-032 Carry payload on the NUDGE outbound

## Meta

- Task ID: `BUILD-032`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/39`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/bugs/BUG-004-channel-nudge-未帶-payload-nudge-turn-的-prevpayload-為空.md`
- Complexity: `S`

---

## Brief

`Channel.nudge()` 是 `@asgard-js/core` 唯一沒有帶 `payload` 的 outbound —— 它不呼叫 `resolvePayload()`，react 層也沒讓它過
`onBeforeSendMessage`，所以使用端無論怎麼設定都無法讓 payload 跟著 NUDGE 出去。後端的 `prevPayload` 是每個 turn 從 incoming
payload 重建的（不沿用上一輪），因此空 payload 會讓 NUDGE 喚醒出一台**沒有 subagent、沒掛 source set、working directory 退回
`/work`** 的空 sandbox（無錯誤訊息），或在 entry 有 `InputSchema` 時直接 `InvalidArgument`。

本票把 NUDGE 接回其他三條 outbound 共用的 payload 路徑：core 的 `resolvePayload()`、react 的 `onBeforeSendMessage`。
改動落在 `packages/core/src/lib/channel.ts`、`packages/react/src/hooks/use-channel.ts`、
`packages/react/src/context/asgard-service-context.tsx`，全部 additive（`payload` 為 optional）、不破 public API。

**Already exists:** `Channel.resolvePayload()`（`packages/core/src/lib/channel.ts:320`，另三條 outbound 都會過）、
`Channel.replyToolCallConsents(answers, options?, payload?)`（同型的「payload 附加在既有簽章尾端」先例）、
`wrappedReplyToolCallConsents`（`asgard-service-context.tsx:335`，以 `text: ''` 呼叫 `onBeforeSendMessage`、只取回傳 `payload` 的先例）、
`Channel — nudge (F-021 AC4)` 既有測試（`packages/core/src/lib/channel.spec.ts:527`）。

**與 spec 的一處刻意偏離（簽章順序）**：BUG-004「修復方向」寫的是 `Channel.nudge(payload?, options?)`。實作改採
**`Channel.nudge(options?, payload?)`** —— `Channel` 是 public API（`packages/core/src/index.ts:11` 導出），現有呼叫端
（含 `use-channel.ts`）都以 `nudge({ onSseMessage })` 傳 options 當第一參數，把 `payload` 插到最前面會讓那個物件被當成
payload，直接違反同一份 spec 自己寫的「不破 public API」與 §1.7。`replyToolCallConsents(answers, options?, payload?)`
已是同一個 repo 的既定先例，故對齊之。行為（payload 有沒有上線）與 spec 完全一致，只有參數順序不同。

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

- `R1` When `Channel.nudge(options, payload)` is called with an object payload, the system shall put that
  object on the `action=NUDGE` request body's `payload` field. → T1
- `R2` When `Channel.nudge(options, payload)` is called with a **function** payload, the system shall call it
  through the same `resolvePayload()` path the other three outbounds use and send the returned object. → T1
- `R3` When `Channel.nudge()` is called with no payload, the system shall keep the pre-change body shape
  (`action` / `customChannelId` / `customMessageId` / `text: ''`, `payload` undefined) and shall not push a user
  message into the conversation — i.e. the existing F-021 AC4 behavior is unchanged. → T1
- `R4` When a consumer calls `useChannel().nudge(payload)` / `serviceContext.nudge(payload)`, the system shall
  forward that payload down to `Channel.nudge`. → T2, T3
- `R5` When `onBeforeSendMessage` is configured and `serviceContext.nudge()` is called, the system shall invoke
  the callback with `{ text: '', payload }` and forward **only** the returned `payload` — matching the existing
  consent-reply path — so a session-level payload attaches to NUDGE without the consumer passing it explicitly. → T3
- `R6` When existing call sites call `channel.nudge({ onSseMessage })` / `nudge()` with no arguments, the system
  shall keep compiling and behaving as before (no breaking public-API change, §1.7). → T1, T2, T3
- `R7` (Smoke check) When the developer runs `npm run lint:packages && npm run format:check && npm run typecheck:packages`,
  `npm run build:core && npm run build:react` and `npm run test:packages`, the system shall report no errors and all
  Vitest cases green; and when a nudge is fired from the browser against a real bot provider, the
  `POST …/message/sse` request body shall contain the payload (verified in Chrome DevTools → Network). → T5, T6

> **超出本票範圍**：即使 payload 帶上了，NUDGE 在 agent-hub 情境仍會被 `asgard-core` 的 listen-state empty-text 檢查擋掉
> （**BUG-005** / [asgard-sdk-pm#40](https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/40)，後端側、assignee `junhanlin`）。
> 因此 R7 的瀏覽器驗證止於「request body 有沒有帶 payload」，**不包含 sandbox 真的被喚醒**——後者要等 BUG-005 修好才可能。

---

## Implementation Tasks

- [x] T1 (R1, R2, R3, R6): `packages/core/src/lib/channel.ts` — `nudge(options?, payload?)` 加上
      `payload: this.resolvePayload(payload)`，更新 doc comment 說明 payload 的用途與後端 `prevPayload` 重建語意。
- [x] T2 (R4, R6): `packages/react/src/hooks/use-channel.ts` — `UseChannelReturn['nudge']` 開放 optional payload 參數，
      `nudge` callback 往下傳給 `channel.nudge`。
- [x] T3 (R4, R5, R6): `packages/react/src/context/asgard-service-context.tsx` — 新增 `wrappedNudge`（比照
      `wrappedReplyToolCallConsents`），contextValue / deps 改用它；更新 `onBeforeSendMessage` 的 JSDoc（現在涵蓋三條 outbound）。
- [x] T4 (R1, R2, R3, R5): 補測 —— `packages/core/src/lib/channel.spec.ts` 擴充 nudge 案例（object / function / 無 payload）；
      新增 `packages/react/src/context/asgard-service-context.spec.tsx` 斷言 `wrappedNudge` 會過 `onBeforeSendMessage`
      並只轉傳回傳的 `payload`。
- [x] T5 (R7): `npm run lint:packages && npm run format:check && npm run typecheck:packages`；
      `npm run build:core && npm run build:react`；`npm run test:packages`。
- [x] T6 (R7): 瀏覽器實測 —— 新增 demo route `/nudge-payload`（真實 bot provider + `onBeforeSendMessage` 注入 session
      payload + 兩顆 Nudge 鈕），用 Chrome DevTools 讀 `POST …/message/sse` 的 request body 確認 payload 上線；截圖存
      `.github/screenshots/`。另以 `npm pack` 把本地 SDK 裝進 Sindri（`asgard-ai-agent-hub-web`，worktree 隔離）跑
      `tsc --noEmit`，確認簽章加寬不破消費端。
      **為什麼不是在 Sindri 點 File Explorer 的 Nudge 鈕**：Sindri 的 `onBeforeSendMessage` 對「無內容」的 outbound 會
      原樣早退（見下方 Downstream note），今天在 Sindri 按 Nudge 送出的 payload 仍會是 `undefined` —— 那驗不到本票的改動。
      demo route 是能直接驗到「payload 有沒有跟著 NUDGE 上線」的最短路徑。

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6, R7（對應 BUG-004 / F-021 AC4 / UC-038 Main Flow 2-4）

Files:

- `packages/core/src/lib/channel.ts` (core) — `nudge(options?, payload?)` 加 `resolvePayload(payload)` + doc
- `packages/core/src/lib/channel.spec.ts` (core) — nudge describe 抽 `nudgeChannel()` helper，+2 案例（object / function payload）、既有案例加斷言 `payload` 為 undefined
- `packages/react/src/hooks/use-channel.ts` (react) — `UseChannelReturn['nudge']` 開放 payload 參數，callback 往下傳
- `packages/react/src/context/asgard-service-context.tsx` (react) — 新增 `resolveOutboundPayload` + `wrappedNudge`；`wrappedReplyToolCallConsents` 改用同一個 helper（§6）；contextValue / deps / JSDoc 更新
- `packages/react/src/context/asgard-service-context.spec.tsx` (react, new) — 5 案例：nudge 過 `onBeforeSendMessage`、callback 看得到呼叫端 payload、無 callback 直通、皆無 payload 時送 undefined、consent 回覆維持同一條路徑
- `apps/react-demo/src/app/routes/nudge-payload/{nudge-payload.tsx,nudge-payload.module.scss,index.ts}` (demo, new) — `/nudge-payload` 驗證路由
- `apps/react-demo/src/app/app.tsx` (demo) — 註冊 `/nudge-payload`
- `.github/screenshots/nudge-payload-demo.png` — 驗證截圖

---

## Verification evidence (R7)

`npm run lint:packages`（0 error / 1 既有 warning，在未改動的 `file-view.tsx`）、`npm run format:check`（pass）、
`npm run typecheck:packages`（pass）、`npm run build:core && npm run build:react`（pass）、
`npm run test:packages`（core 155/155、react 46/46，含新增 2 + 5 案例）、`nx run react-demo:lint`（0 error）。

TDD：兩個 core 新案例先在未修改的實作下 red（`expected undefined to deeply equal { agent_hub: … }`），改完後 green。

瀏覽器（`/nudge-payload`，真實 bot provider，DevTools → Network → `message/sse` request body）：

```json
// 按「Nudge」——session payload 由 onBeforeSendMessage 帶上
{"action":"NUDGE","customChannelId":"nudge-payload-demo","payload":{"agent_hub":{"agent_names":["researcher","writer"],"working_directory":"/work/demo-project"}},"text":""}

// 按「Nudge（帶 turn 級 payload）」——callback 看得到呼叫端傳的值，合併後上線
{"action":"NUDGE","customChannelId":"nudge-payload-demo","payload":{"agent_hub":{"agent_names":["researcher","writer"],"working_directory":"/work/demo-project"},"turn":"explicit-override"},"text":""}
```

兩者 HTTP 皆回 `400 invalid post back action NUDGE` —— demo 用的 `VITE_SIMPLE_BOT_PROVIDER_ENDPOINT` 是**正式站**的一般
bot provider，不支援 NUDGE。與本票無關（本票的驗收標的是 request body），也不是 BUG-005（那是 dev 的 agent-hub bot
provider 在 listen state 的 empty-text 檢查）。

消費端相容性：Sindri（`asgard-ai-agent-hub-web`，`origin/develop` worktree）以 `npm pack` 裝入 `0.3.29-local` 後
`npx tsc --noEmit` 共 17 個錯，全為 fresh worktree 未產生 `next-env.d.ts` 造成的 asset module 宣告缺失（TS2307）與
`@testing-library/react` 版本問題（TS2305），**無任何一個提及 `@asgard-js` / `nudge` / `serviceContext`**。

---

## Downstream note（不在本票範圍，需另開票）

Sindri 目前**還吃不到這個修復**：`src/components/conversation/conversation-view.tsx` 的 `onBeforeSendMessage` 開頭是

```ts
const hasContent = !!params.text || (params.blobIds?.length ?? 0) > 0;
if (!hasContent) return params;
```

nudge 是 `text: ''` 且無 blobIds，會命中這道早退（那道守衛原本是為了不讓「點名 / model」注入 consent 回覆），
所以回傳的 `payload` 仍是 `undefined`。SDK 這邊給的是**能力**，Sindri 要自己決定「哪些欄位該跟著 nudge 走」
（至少 `completion_model_name`，因為 asgard-core 的 SandboxBlueprint `completionModel` 讀 `prevPayload`）。
建議在 `asgard-ai-agent-hub-web` 另開一張票處理，不混進本 PR。

---

## Execution Log / Change Log

- 2026-07-29: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/39 (Status: `draft`).
- 2026-07-29: 使用者授權「有問題自行判斷」，跳過 plan 確認關卡直接開工 (Status: `draft → in-progress`)。
- 2026-07-29: T1–T6 完成；R1–R7 全數驗證；lint / format / typecheck / build / test 全綠，瀏覽器實測 request body 帶 payload (Status: `in-progress → done`)。
