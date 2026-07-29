# REVIEW-032 Carry payload on the NUDGE outbound

## Meta

- Task ID: `REVIEW-032`
- Status: `done`
- BUILD Task: `BUILD-032`
- Reviewed commit: `ce31b78`（截圖 commit：`2b81a96`）
- Reviewed branch: `fix/39-nudge-payload`

---

## §1 Static Code Review

Scope = `BUILD-032 ## Coverage` 的 8 個檔案（core 2 / react 3 / demo 3）。

### §1.1 Checklist

| 檢查項目                                                         | 對應規則                       | 結果 |
| ---------------------------------------------------------------- | ------------------------------ | ---- |
| 有無 `any` / `as any`                                            | FRONTEND_RULE_COMMON §1.1      | ✅   |
| 有無 `@ts-ignore` / `eslint-disable` 規避型別或 lint 錯誤        | FRONTEND_RULE_COMMON §1.2      | ✅   |
| library code 有無殘留 `console.log`（非 debug-option 控制）      | FRONTEND_RULE_COMMON §1.3 §7   | ✅   |
| 有無 hardcode API key / endpoint / namespace                     | FRONTEND_RULE_COMMON §1.4      | ✅   |
| RxJS 訂閱 / EventSource / timer 是否都有 teardown                | FRONTEND_RULE_COMMON §1.5      | ✅   |
| `@asgard-js/react` 只從 `@asgard-js/core` 公開進入點 import      | FRONTEND_RULE_COMMON §1.6      | ✅   |
| `@asgard-js/core` 無 import `react` / `react-dom` / DOM API      | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅   |
| 公開 API 變更經 `@deprecated` 過渡（無未標示的 breaking change） | FRONTEND_RULE_COMMON §1.7      | ⚠️   |
| 新增公開型別 / 函式 / 元件從 package 進入點導出                  | FRONTEND_RULE_COMMON §2.2      | ✅   |
| 新增 message template 的前置依賴齊備                             | FRONTEND_RULE_COMMON §2.3      | N/A  |
| 使用 `botProviderEndpoint`（非 deprecated 的 `endpoint`）        | FRONTEND_RULE_COMMON §2.4      | ✅   |
| 導出函式 / 方法標明 explicit return type                         | FRONTEND_RULE_COMMON §3.1      | ✅   |
| 共用型別集中於 core `src/types/`，無跨檔重複 interface           | FRONTEND_RULE_COMMON §3.2      | ✅   |
| React 元件 props 完整型別化                                      | FRONTEND_RULE_COMMON §4.1      | ✅   |
| 元件無 hardcode 色值                                             | FRONTEND_RULE_COMMON §4.2      | ✅   |
| `react` / `react-dom` 維持 peerDependencies                      | FRONTEND_RULE_COMMON §4.4      | ✅   |
| core 與 react 版本號一致                                         | FRONTEND_RULE_COMMON §5        | ✅   |
| 重複邏輯（≥2 次）已抽出                                          | FRONTEND_RULE_COMMON §6        | ✅   |
| 無 `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME          | FRONTEND_RULE_COMMON §7        | ✅   |

補充說明：

- **§1.7 —— ⚠️ 本項原判定為 ✅「無 breaking change」，2026-07-29 覆查後更正為「有一處型別回歸，已知並接受」。**
  `Channel.nudge` 由 `(options?)` 變成 `(options?, payload?)`，新參數 optional 且加在尾端，既有
  `nudge()` / `nudge({ onSseMessage })` 呼叫端不受影響 —— 這部分成立。
  但 `UseChannelReturn['nudge']` 由 `() => Promise<void>` 變成 `(payload?) => Promise<void>`，**原判定「皆為相容加寬」
  是錯的**：對呼叫端是放寬，對**賦值**是收窄（函式參數逆變）。凡是目標型別會傳參數進來的插槽都會編譯失敗，實測：

  ```
  TS2322: Type '(payload?: Record<string, unknown> | …) => Promise<void>'
          is not assignable to type 'MouseEventHandler<HTMLButtonElement>'.
    Types of parameters 'payload' and 'event' are incompatible.
  ```

  也就是 `onClick={nudge}` 會壞（同一次編譯下 0.3.28 的 `() => Promise<void>` 沒有錯，故確為回歸）。SDK 裡唯一的 nudge
  觸發點就是一顆按鈕（`file-explorer-panel.tsx:473-474`），消費端自製喚醒鈕綁 `onClick` 是可預期的寫法。
  仍相容的有：`onNudge={nudge}`（目標 `() => void | Promise<void>`）、`nudge?.()`、
  `const f: () => Promise<void> = ctx.nudge`、自行實作 `Pick<UseChannelReturn,'nudge'>` 為零參數；
  `IAsgardServiceClient` 不含 `nudge`，自訂 client 實作者不受影響。

  **決議（使用者 2026-07-29）**：維持 patch `0.3.29`，不改簽章也不退回參數。理由：本 repo 無 breaking-change policy
  （`CLAUDE.local.md`「minor 和 patch 自行判斷」）；這個 break 是**編譯期**的、不是靜默的，修法一行
  （`onClick={() => nudge()}`）；且該編譯錯誤反而擋掉一個 runtime 風險 —— 沒有它的話 JS 消費端會把 SyntheticEvent
  當 payload 送進 `JSON.stringify` 而炸在 circular structure。保留呼叫端 payload 也是下游（Sindri）能一行修好的關鍵。
  已在 `use-channel.ts` / `asgard-service-context.tsx` 的 JSDoc 與 `packages/react/README.md` 明寫綁定方式。

  BUG-004 spec 原寫 `nudge(payload?, options?)`，實作刻意偏離為尾端追加，理由見 BUILD-032 `## Brief`。

- **§6**：consent 回覆與 nudge 都要「以 `text: ''` 過 `onBeforeSendMessage`、只取回傳 payload」，已抽成
  `resolveOutboundPayload`（`asgard-service-context.tsx`），兩處共用。
- **§2.2**：本票無新增公開型別 / 函式；`nudge` 的型別變更透過既有的 `UseChannelReturn` /
  `AsgardServiceContextValue` 出去。
- **§4.2**：demo route 的 `.module.scss` 用 `#888` 邊框，沿用 demo app 既有慣例（同 `docked-run-chrome.module.scss`）；
  §4.2 的規範對象是 `packages/react/src` 的元件，demo app 不在其列。

### §1.2 Mechanical Grep

```
### §1.1 any / as any
(empty)

### §1.2 ts-ignore / eslint-disable
packages/react/src/hooks/use-channel.ts:392:        // eslint-disable-next-line no-console

### §1.3 console.log
packages/react/src/hooks/use-channel.ts:393:        console.log(

### §1.6 core imports react / react-dom
(empty)

### §1.6 react deep-imports core internals (@asgard-js/core/src | core/src/lib)
(empty)

### §4.2 hardcoded colors (asgard-service-context.tsx, use-channel.ts)
(empty)

### §7 setTimeout
packages/core/src/lib/channel.spec.ts:342:const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
packages/core/src/lib/channel.ts:87:  private forceStopTimer?: ReturnType<typeof setTimeout>;
packages/core/src/lib/channel.ts:691:    this.forceStopTimer = setTimeout(() => {

### §7 TODO / FIXME
(empty)
```

四筆 hit 全部**不是本票的改動**（`git diff` 對這三個檔案的 `+`/`-` 行不含 `console` / `setTimeout` /
`eslint-disable`），且各自合規：

- `use-channel.ts:392-393` — `replyToolCallConsents` 內的 debug log，包在 `if (client?.debugMode)` 裡，正是 §1.3
  「gate behind an explicit debug option」允許的形式；`eslint-disable-next-line no-console` 是為了這行 log，不是用來
  規避型別錯誤（§1.2 的規範對象）。
- `channel.spec.ts:342` — 測試用的 microtask flush helper，不是 mock delay。
- `channel.ts:87 / :691` — F-023 force-stop 逾時計時器，有 `clearForceStopTimer()` teardown（§1.5）。

### §1.3 TypeScript / Lint / Format / Build

```bash
npm run typecheck:packages
npm run lint:packages
npm run format:check
npm run build:core && npm run build:react
npx nx run react-demo:lint
```

Results:

```
typecheck:packages: PASS — Successfully ran target typecheck for 2 projects
lint:packages:      PASS — 1 problem (0 errors, 1 warning)
                           warning 在未改動的 file-view.tsx:171（react-hooks/exhaustive-deps，既有）
format:check:       PASS — All matched files use Prettier code style!
build:core:         PASS — ✓ built in 1.42s
build:react:        PASS — ✓ built in 6.55s
react-demo:lint:    PASS — 15 problems (0 errors, 15 warnings)，全為既有 warning
```

### §1.4 Static Review Acceptance

- [x] §1.1 表格所有項目均已逐一核對並回報 ✅/❌
- [x] 無 ❌ 違規（四筆 grep hit 皆為既有且合規，已逐筆說明）
- [x] §1.2 所有 grep 指令已執行，輸出已貼出
- [x] `npm run typecheck:packages` / `npm run lint:packages` 無錯誤
- [x] `npm run build:core && npm run build:react` 綠燈

**§1 結果：0 violation。**

---

## §3 Functional Validation

### R# Result Matrix

| R#  | 驗收條件                                                               | 結果 | 說明                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `Channel.nudge` 送出 object payload                                    | Pass | Vitest `Channel — nudge (F-021 AC4) > sends the payload it is given`；先在未修改的實作下 red（`expected undefined to deeply equal { agent_hub: … }`），修好後 green。                |
| R2  | `Channel.nudge` 以 `resolvePayload()` 解 function payload              | Pass | Vitest `resolves a function payload, like the other three outbounds`；同樣先 red 後 green。                                                                                          |
| R3  | 無 payload 時 body 形狀與靜默行為不變                                  | Pass | Vitest `sends action=NUDGE with empty text and renders no message` 擴充後仍綠：`payload` 為 `undefined`、conversation 訊息數維持 0。                                                 |
| R4  | `useChannel().nudge(payload)` / `serviceContext.nudge(payload)` 往下傳 | Pass | Vitest `passes the payload straight through when no callback is configured` + 瀏覽器：按「Nudge（帶 turn 級 payload）」的 request body 含 `"turn":"explicit-override"`。             |
| R5  | `serviceContext.nudge()` 過 `onBeforeSendMessage` 且只取回傳 payload   | Pass | Vitest `runs nudge through onBeforeSendMessage and forwards the returned payload` + `shows the callback a caller-supplied payload so it can be merged`；瀏覽器 log 面板同步佐證。    |
| R6  | 既有零參數 / options-only 呼叫端不破（§1.7）                           | Pass | `use-channel.ts` 的 `channel.nudge({ onSseMessage }, payload)` 與 `chatbot-file-explorer.tsx` 的 `onNudge={nudge}` 皆通過 `typecheck:packages`；Sindri `tsc --noEmit` 亦無相關錯誤。 |
| R7  | 建置 / 測試全綠 + 瀏覽器 request body 帶 payload                       | Pass | 見下方證據。                                                                                                                                                                         |

### 證據（R7）

Vitest：core 155/155（+2）、react 46/46（+5，新檔 `asgard-service-context.spec.tsx`）。

瀏覽器（`/nudge-payload`，真實 bot provider，DevTools → Network → `message/sse` request body）：

```json
// 按「Nudge」
{"action":"NUDGE","customChannelId":"nudge-payload-demo","payload":{"agent_hub":{"agent_names":["researcher","writer"],"working_directory":"/work/demo-project"}},"text":""}

// 按「Nudge（帶 turn 級 payload）」
{"action":"NUDGE","customChannelId":"nudge-payload-demo","payload":{"agent_hub":{"agent_names":["researcher","writer"],"working_directory":"/work/demo-project"},"turn":"explicit-override"},"text":""}
```

兩者 HTTP 皆回 `400 invalid post back action NUDGE` —— demo 的 `VITE_SIMPLE_BOT_PROVIDER_ENDPOINT` 是正式站的一般
bot provider，本來就不支援 NUDGE。本票的驗收標的是 **request body**，回應不在驗收範圍。

消費端相容：Sindri（`asgard-ai-agent-hub-web` @ `origin/develop`，隔離 worktree）以 `npm pack` 裝入 `0.3.29-local`
後 `npx tsc --noEmit` 共 17 個錯，全為 fresh worktree 未產生 `next-env.d.ts` 的 asset module 宣告缺失（TS2307）與
`@testing-library/react` 版本問題（TS2305），無任何一個提及 `@asgard-js` / `nudge` / `serviceContext`。

### 邊界條件

- 無 payload、無 callback → body 不含 `payload`（R3）。
- 有 callback、無 payload → callback 收到 `{ text: '', payload: undefined }`（R5）。
- 有 callback、有 payload → callback 看得到呼叫端的值，可合併（R5 第二例）。
- function 形式 payload → 於送出當下解析（R2）。

### §3.1 Acceptance

- [x] `## Coverage` 所列 R1–R7 均已執行 Step 1（讀 code / 型別）+ Step 2（Vitest / demo）+ Step 3（邊界）
- [x] 每個 R# 均已標記結果
- [x] 對應 Vitest 已執行並通過
- [x] 邊界條件已確認

**§3 結果：7/7 Pass、0 Fail。**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

0. **`Channel.nudge` 沒有 `ChannelBusyError` 守衛（既有缺陷，非本票造成，值得另開票）** ——
   `sendMessage` 在 `runStatus.kind` 非 null 時會 reject（`channel.ts:531-533`），`nudge` 沒有這道守衛，改動前後皆然
   （本票的 diff 只加了 `payload:` 那一行）。實測：使用者 turn 串流中呼叫 `nudge()`，`fetchSse` 會覆寫 `this.currentRun`
   **而不 unsubscribe 舊的**（訂閱洩漏），並把 `runStatusSubject` 改成 `{ kind: 'nudge' }`、丟掉該 run 的 `requestId`。
   後果：`canStop` 要求 `kind === 'user'`，停止鈕當場消失，那個 run 從此停不掉，且兩個 run 同時寫同一份 transcript。
   觸發路徑真實存在 —— File Explorer 空狀態的 Nudge 鈕在 run 進行中並未 disabled（`file-explorer-panel.tsx:474`）。

1. **Sindri 端還吃不到這個修復（跨 repo，需另開票，不屬本 cycle）** ——
   `asgard-ai-agent-hub-web` 的 `src/components/conversation/conversation-view.tsx` 在 `onBeforeSendMessage` 開頭有
   `const hasContent = !!params.text || (params.blobIds?.length ?? 0) > 0; if (!hasContent) return params;`。
   nudge 是 `text: ''` 且無 blobIds，會命中這道早退（原本是為了不讓「點名 / model」注入 consent 回覆），所以回傳的
   payload 仍是 `undefined`。SDK 這邊給的是能力，Sindri 需自行決定哪些欄位該跟著 nudge 走（至少
   `completion_model_name`，因為 asgard-core 的 SandboxBlueprint `completionModel` 讀 `prevPayload`）。
2. **端到端仍被後端擋住** —— BUG-005 /
   [asgard-sdk-pm#40](https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/40)（`asgard-core`，assignee
   `junhanlin`）未修之前，listen state 的 channel 送 NUDGE 仍會被 empty-text 檢查拒絕。兩張要一起修，F-021 AC4 /
   UC-038 才會通。

---

## Execution Log

- 2026-07-29: REVIEW task created, paired with BUILD-032 (Status: `draft`).
- 2026-07-29: BUILD-032 完成、`## Coverage` 已填 (Status: `draft → ready`).
- 2026-07-29: §1 完成 —— 18 項 ✅ / 1 項 N/A / 0 ❌；§3 完成 —— R1–R7 全 Pass。2 則 Minor 皆為跨 repo 追蹤事項，
  不阻擋本 cycle (Status: `ready → done`).
- 2026-07-29: **發版前以兩個獨立 subagent 做對抗式覆查，推翻了 §1.7 的原判定。** 兩者各自查出
  `UseChannelReturn['nudge']` 的參數新增會讓 `onClick={nudge}` 編譯失敗（函式參數逆變），已自行以 build 產物的 `.d.ts`
  實測復現、並確認 0.3.28 的形狀在同一次編譯下無錯 —— 確為回歸。另查出兩處我方撰寫的註解不實（payload「override」
  的說法、`onBeforeSendMessage` 觸發路徑漏列 `resetChannel`）與 README 兩處過時。§1.7 已改標 ⚠️ 並補上決議；
  註解與 README 於後續 PR 修正。覆查同時確認：consent 路徑的重構行為完全等價、新增測試對舊實作確實會 red
  （core 2/3、react 3/5 fail）、無 payload 時 wire body 與 0.3.28 位元相同。
