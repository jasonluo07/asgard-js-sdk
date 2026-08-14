# BUILD-059 Close the typecheck coverage gaps for spec files and the demo app

## Meta

- Task ID: `BUILD-059`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/435`, `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/436`
- Source spec: 內部票（issue body 即 spec，無 asgard-sdk-pm tracking 檔）
- Complexity: `M`

---

## Brief

`npm run typecheck:packages` 被 `AGENTS.md` 描述成「唯一會因型別錯誤失敗的指令」，而 husky `pre-push` 靠它擋住型別錯誤進遠端。但這道閘門目前有兩個破口：**測試檔案**（#435）與 **`apps/react-demo`**（#436）。

第一個破口的成因和 issue #435 的猜測不同。`tsc` 其實有編譯 spec 檔案 —— 兩個 package 的 `tsconfig.lib.json` `include` 都涵蓋 `src/**/*.ts(x)`，加 `--skip-nx-cache` 跑就會看到錯誤。真正沒擋下來的是 **Nx 的 cache inputs**：`@nx/js/typescript` 產生的 `typecheck` target 用 `production` named input，而 `production` 明確排除 `!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)`。於是改動 spec 檔案不會讓 cache 失效，Nx 直接重播上一次的成功結果，指令 exit 0。修法是在 `nx.json` 用 `targetDefaults` 把 `typecheck` 的 inputs 換成 `default` / `^default`。

第二個破口是 `apps/react-demo` 從來不在 `typecheck:packages` 的 `--projects` 清單裡。它現在累積了 **5 個**型別錯誤（issue #436 開票時是 2 個，之後又漂了 3 個）。逐一確認後 **5 個全部是 demo 自己寫錯或沒跟上 SDK 的改版**，`@asgard-js/core` / `@asgard-js/react` 的公開型別都不需要改。

**Already exists:** `nx.json`（namedInputs、plugins）、`packages/{core,react}/tsconfig.lib.json`（已有 `outDir: out-tsc/*` 的前例與註解）、`apps/react-demo/tsconfig.app.json`、`.husky/pre-push`、root `package.json` scripts。

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

> 本票不動任何公開 API，§1.7 / §2.2 / §2.3 不適用；demo 修正受 §1.1 / §1.2 拘束（不得用 `as any` 或 `@ts-ignore` 把錯誤壓下去）。

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a type error exists in a `*.spec.ts` / `*.spec.tsx` file under `packages/core/src` or `packages/react/src`, and the developer runs `npm run typecheck:packages` **without** `--skip-nx-cache`, the system shall exit non-zero and print the `error TS####` line for that file. → T1
- `R2` When the same spec-file type error is removed and `npm run typecheck:packages` is run twice in a row with no further edits, the system shall exit 0 on both runs and report a Nx cache hit on the second run (the gate must stay cheap for `pre-push`). → T1
- `R3` When the developer runs the root typecheck command, the system shall type-check `@asgard-js/core`, `@asgard-js/react` **and** `react-demo`, and exit non-zero if any of the three reports a type error. → T2
- `R4` When `apps/react-demo` is type-checked, the system shall report zero type errors, with **no change to any exported type of `@asgard-js/core` or `@asgard-js/react`**. → T3
- `R5` When `apps/react-demo` typecheck runs, the system shall write its emitted declarations and `.tsbuildinfo` outside `apps/react-demo/dist`, so that a subsequent `vite build` (`emptyOutDir: true`) does not destroy the incremental state nor leave stray `.d.ts` in the deployable output. → T2
- `R6` When `git push` triggers the husky `pre-push` hook, the hook shall run the typecheck that covers all three projects. → T4
- `R7` When a reader consults `AGENTS.md` → _Type checking_, the section shall state the actual coverage (spec files included, demo included) and list the current commands. → T5
- `R8` (Smoke check) When the developer runs `npm run lint:packages`, `npm run format:check`, `npm run typecheck`, `npm run build:core && npm run build:react`, `npm run test:packages`, and opens the react-demo `/events` route (`npm run serve:react-demo`, http://localhost:4200), the system shall be green on every command and the `/events` EMIT log shall still capture `eventName` + `payload` after the callback signature fix. → T6

---

## Implementation Tasks

- [x] T1 (R1, R2): `nx.json` — add `targetDefaults.typecheck.inputs = ["default", "^default", { externalDependencies: ["typescript"] }]` so spec files are part of the cache key. Verify with a throwaway canary in one core spec and one react spec.
- [x] T2 (R3, R5): root `package.json` — add `typecheck` (all three projects) and `typecheck:demo`; keep `typecheck:packages`. `apps/react-demo/tsconfig.app.json` — move `outDir` / `tsBuildInfoFile` to `out-tsc/react-demo` (mirrors `packages/*/tsconfig.lib.json`, with the same explanatory comment).
- [x] T3 (R4): fix the five demo type errors, each in the demo (never by loosening an SDK type):
  - `mocks/theme-gallery.ts:85` — mock `ErrorMessage` missing `inner` / `location`
  - `routes/events/events.tsx:80` — `onTemplateBtnClick` is `(payload, eventName, raw) => void`, demo used a single-object handler
  - `routes/history-scroll-bug/history-scroll-bug.tsx:30` — `MessageTemplate.quickReplies` is required
  - `routes/markdown-theme/markdown-theme.tsx:4` — `Theme` no longer exists on `@asgard-js/core`; the theme prop type is `ChatbotTheme` from `@asgard-js/react`
  - `routes/tool-call/tool-call.tsx:101` — `Record<ToolCallStatus, …>` missing the `cancelled` key
- [x] T4 (R6): `.husky/pre-push` — run the all-three-projects typecheck; refresh the comment.
- [x] T5 (R7): `AGENTS.md` — rewrite _Type checking_ (real cause of the old gap, new coverage, new command list) and add the new scripts to _Commands_.
- [x] T6 (R8): lint + format:check + typecheck + build + test; browser smoke on `/events`.

---

## Coverage

Use Cases: `R1`–`R8`（R1/R2/R3 由 canary matrix 實測；R4/R5 由指令與產物路徑實測；R6/R7 為檔案內容；R8 為指令 + 瀏覽器走查）

Files:

| 檔案                                                       | 動的是什麼                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `nx.json`                                                  | 新增 `targetDefaults.typecheck.inputs`（`production` → `default` / `^default`）  |
| `package.json`                                             | 新增 `typecheck`（三專案）與 `typecheck:demo`；`typecheck:packages` 原樣保留     |
| `.husky/pre-push`                                          | 改跑 `npm run typecheck`；註解補上涵蓋範圍                                       |
| `AGENTS.md`                                                | Commands 與〈Type checking〉更新為實際涵蓋範圍、成因、canary 自檢法              |
| `apps/react-demo/tsconfig.app.json`                        | `outDir` / `tsBuildInfoFile` 由 `dist` 移到 `out-tsc/react-demo`                 |
| `apps/react-demo/src/app/mocks/theme-gallery.ts`           | 錯誤泡泡 mock 補齊 `ErrorMessage` 的 `inner` / `location`                        |
| `apps/react-demo/src/app/routes/events/events.tsx`         | `onTemplateBtnClick` handler 改成 `(payload, eventName)`（**同時修好 runtime**） |
| `apps/react-demo/src/app/routes/history-scroll-bug/…​.tsx` | mock template 補 `quickReplies: []`                                              |
| `apps/react-demo/src/app/routes/markdown-theme/…​.tsx`     | `Theme`（core，已不存在）→ `ChatbotTheme`（react）                               |
| `apps/react-demo/src/app/routes/tool-call/tool-call.tsx`   | `statusConfig` 補 `cancelled`                                                    |

不動 `packages/core` 與 `packages/react` 的任何原始碼，公開 API 零變更。

---

## Execution Log / Change Log

- 2026-08-14: BUILD task created from issues #435 + #436 (Status: `draft`).
- 2026-08-14: 計畫經使用者確認，開始實作 (Status: `draft → ready → in-progress`).
- 2026-08-14: 全數 R# 完成，靜態檢查與 smoke 全綠 (Status: `in-progress → done`)。

### 實作過程的重要發現

**1. #435 的根因不是 tsconfig 涵蓋範圍，是 Nx cache inputs。**
兩個 package 的 `tsconfig.lib.json` `include` 本來就涵蓋 `src/**/*.ts(x)`，`tsc` 一直有編譯 spec。
`npm run typecheck:packages --skip-nx-cache` 會如實報錯；不加該旗標則 exit 0。差別在 `@nx/js/typescript`
給 `typecheck` target 的 inputs 是 `production`，而 `production` 明確排除
`!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)` ⇒ 改 spec 不會讓 cache 失效 ⇒ Nx 重播上一次的
成功。issue 提的兩個選項（改 tsconfig／改文件說法）都沒打到這一點。

**2. demo 的型別錯誤從 2 個漂到 5 個**，逐一確認後全部是 demo 端的問題，SDK 公開型別一個都不用改。

**3. `events.tsx` 的簽章錯誤不是純型別問題，`/events` route 在 runtime 是壞的。**
舊 handler 宣告 `(action: { type; eventName?; payload? })`，但 SDK 實際以
`onTemplateBtnClick(action.payload || {}, action.eventName || '', raw)` 呼叫 ⇒ 第一個參數是 payload、
`action.type` 永遠 `undefined` ⇒ `if (action.type === 'emit')` 永不成立 ⇒ **點按鈕從來不會產生任何 log**。
瀏覽器前後對照（同一顆「立刻訂票」按鈕）：修前 `NOT LOGGED`、修後 `LOGGED`（`book_ticket` + 完整 payload）。
這正是 issue #436 說的「demo 是唯一真實 consumer，型別漂移會讓它失去早期訊號」的具體案例。

**4. `apps/react-demo/dist` 同時是 vite 產物目錄與 tsc 的 `outDir`。**
`emptyOutDir: true` 每次 build 都會清掉 `tsconfig.app.tsbuildinfo`（實測 `dist/` 裡確實躺著它），
且 `.d.ts` 會混進可部署產物。兩個 package 早就為了同一個理由搬去 `out-tsc/`，demo 一併對齊。

### 驗證證據

canary matrix（三個專案各放一次 `const CANARY: number = 'must fail'`，**全部走不帶 `--skip-nx-cache` 的
`npm run typecheck`**）：

```
[baseline-1]                          exit=0  TS2322-lines=0  cache-hit-tasks=3
[baseline-2 (expect cache hits = 3)]  exit=0  TS2322-lines=0  cache-hit-tasks=3
=== canary in packages/core/src/lib/canvas-stream.spec.ts ===
[canary]                              exit=130 TS2322-lines=2 cache-hit-tasks=0
=== canary in packages/react/src/components/chatbot/chat-header/render-header-actions.spec.tsx ===
[canary]                              exit=130 TS2322-lines=2 cache-hit-tasks=0
=== canary in apps/react-demo/src/app/routes/events/events.tsx ===
[canary]                              exit=1   TS2322-lines=2 cache-hit-tasks=1
[restored]                            exit=0  TS2322-lines=0  cache-hit-tasks=2
```

baseline 連兩次皆 3/3 cache hit ⇒ R2（`pre-push` 維持便宜）成立。

其餘指令：`lint:packages` 0 errors / 4 warnings（皆為既有）、`format:check` all clean、
`build:core` + `build:react` 成功、`test:packages` 53 檔 462 測試全過
（core 11/208、react 42/254）。

R5 實測：build 後 `apps/react-demo/dist` 只剩 `assets` / `favicon.ico` / `index.html`（`tsconfig.app.tsbuildinfo`
已不在），宣告與 buildinfo 落在 `apps/react-demo/out-tsc/react-demo/`。

瀏覽器走查（五個受影響 route，console 0 error）：`/events` 見上；`/theme` 錯誤泡泡的「顯示更多」展開後
完整呈現 `code` / `message` / `inner` / `location`；`/markdown-theme` 三組 preset（Default / Light / Dark）
與 blockquote、表格皆正常；`/history-scroll-bug` 正常掛載；`/tool-call` 的 Step Card 自訂 renderer 仍讀得到
`statusConfig`（渲染出 `Done`）——demo 沒有 `cancelled` 的 fixture，該筆屬型別完整性所需。
