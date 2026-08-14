# REVIEW-059 Review: typecheck coverage for spec files and the demo app

## Meta

- Task ID: `REVIEW-059`
- Status: `done`
- BUILD Task: `BUILD-059`
- Reviewed commit: `working tree (uncommitted)` — reviewed before commit, as in REVIEW-057 / REVIEW-058
- Reviewed branch: `fix/435-436-typecheck-coverage`

> Checklist source: `.claude/skills/feature-workflow/REVIEW_RULE.md` §1.1 (the SDK-specific table), not
> `_review_template.md`'s Next.js checklist. Same rationale as REVIEW-057 / REVIEW-058.
>
> Note for the skill itself: `.claude/skills/review/SKILL.md` points at `REVIEW_RULE.md` **relative to its
> own directory**, where the file does not exist — it lives under `.claude/skills/feature-workflow/`. The
> skill also names `npm run lint:check`, which this repo does not define (`lint:packages` is the read-only
> equivalent; `lint` does not exist at all). Both are pre-existing skill-doc drift, recorded here rather
> than fixed, since this cycle does not own that file.

---

## §1 Static Code Review

Scope — `BUILD-059 ## Coverage` files. Two groups, reviewed differently:

**Config / docs** (not compiled source; §1.1 code checks are n/a): `nx.json`, `package.json`,
`.husky/pre-push`, `AGENTS.md`, `apps/react-demo/tsconfig.app.json`.

**TypeScript** (all in `apps/react-demo`, all demo-side):

- `apps/react-demo/src/app/mocks/theme-gallery.ts`
- `apps/react-demo/src/app/routes/events/events.tsx`
- `apps/react-demo/src/app/routes/history-scroll-bug/history-scroll-bug.tsx`
- `apps/react-demo/src/app/routes/markdown-theme/markdown-theme.tsx`
- `apps/react-demo/src/app/routes/tool-call/tool-call.tsx`

`packages/core` and `packages/react` are untouched — `git diff --name-only main -- packages/` is empty.

### §1.1 Checklist

| 檢查項目                                             | 對應規則  | Result                                                                                                              |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| 有無 `any` / `as any`                                | §1.1      | ✅ none — grep empty. The demo fixes all use real types (`Record<string, unknown>`, `ChatbotTheme`)                 |
| `@ts-ignore` / `eslint-disable` 規避型別或 lint      | §1.2      | ✅ none — grep empty. No error was suppressed; all five were fixed at the source                                    |
| library code 殘留 `console.log`                      | §1.3 §7   | ✅ none                                                                                                             |
| hardcode API key / endpoint / namespace              | §1.4      | ✅ none added                                                                                                       |
| RxJS 訂閱 / EventSource / timer 有 teardown          | §1.5      | ✅ n/a — no subscription touched                                                                                    |
| react 只從 core 公開進入點 import                    | §1.6      | ✅ `markdown-theme.tsx` now imports `ChatbotTheme` from `@asgard-js/react` (package name, not `src/`)               |
| core 有無 import react / react-dom / DOM             | §1.6 §2.1 | ✅ core untouched                                                                                                   |
| 公開 API 變更經 `@deprecated` 過渡                   | §1.7      | ✅ n/a — zero public-API change. Every fix moved the demo toward the existing contract                              |
| 新增公開型別 / 函式從 package 進入點導出             | §2.2      | ✅ n/a — nothing new is exported                                                                                    |
| message template 前置依賴齊備                        | §2.3      | ✅ n/a                                                                                                              |
| 使用 `botProviderEndpoint`                           | §2.4      | ✅ affected demo routes already use `botProviderEndpoint: 'skip'`                                                   |
| 導出函式標明 explicit return type                    | §3.1      | ✅ `handleTemplateBtnClick(...): void` keeps the annotation; ESLint's `explicit-function-return-type` is clean      |
| 共用型別集中、無跨檔重複 interface                   | §3.2      | ✅ no type was duplicated — `ChatbotTheme` is consumed from the package rather than re-declared                     |
| React props 完整型別化                               | §4.1      | ✅ the handler now matches `(payload: Record<string, unknown>, eventName: string, raw: string) => void`             |
| 元件 hardcode 色值                                   | §4.2      | ✅ see the §1.2 note below — all hits are demo-side and intentional; the one added line mirrors the SDK's own token |
| react / react-dom 維持 peerDependencies              | §4.4      | ✅ unchanged — `^18.0.0 \|\| ^19.0.0`                                                                               |
| core 與 react 版本號一致                             | §5        | ✅ both `0.3.65`                                                                                                    |
| 重複邏輯 (≥2) / 型別 / JSX (≥3) 已抽出               | §6        | ✅ n/a — no repetition introduced                                                                                   |
| `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME | §7        | ✅ one pre-existing `setTimeout`, out of scope — see below                                                          |

### §1.2 Mechanical Grep

Scanned the five TypeScript files in `Coverage.Files`:

```
--- any / as any ---              (empty)
--- ts-ignore / eslint-disable --- (empty)
--- console.log ---                (empty)
--- deep core/react src import --- (empty)
--- TODO / FIXME ---               (empty)
--- setTimeout ---                 history-scroll-bug.tsx:151
--- hardcoded colors ---           markdown-theme.tsx:39-58 (12 hits)
                                   theme-gallery.ts:59
                                   tool-call.tsx:102-105
```

**None are violations.**

- `history-scroll-bug.tsx:151` — pre-existing, untouched by this task, and it is the repro's own
  "inject history after mount" timer, not a faked API delay. §7's ban targets library code simulating
  streaming; this is a demo route whose entire purpose is that timing.
- `markdown-theme.tsx:39-58` — the route exists to prove markdown colors follow `theme`, so the literals
  **are the fixture**. Untouched by this task; only the type annotation on the array changed.
- `theme-gallery.ts:59` — a string inside a displayed code sample, not a style value.
- `tool-call.tsx:102-105` — a custom-renderer example in the demo, not a library component. Line 105 is
  the one line this task added; it matches its three siblings and reuses the SDK's own cancelled color
  (`tool-call-group.module.scss:144`, `#8c8c8c`), so the example stays consistent with the built-in UI.

### §1.3 TypeScript and Lint

```
typecheck (core + react + react-demo): PASS — exit 0, "Successfully ran target typecheck for 3 projects"
lint:packages:                        PASS — exit 0, 4 problems (0 errors, 4 warnings; all pre-existing, none in scope)
react-demo:lint:                      PASS — exit 0, 15 problems (0 errors, 15 warnings; none in any Coverage file)
format:check:                         PASS — "All matched files use Prettier code style!"
build:core + build:react:             PASS
test:packages:                        PASS — 53 files / 462 tests (core 11/208, react 42/254)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked
- [x] No ❌ violations in scope
- [x] All §1.2 greps run and output pasted
- [x] Type check run — no errors
- [x] Lint run — no errors (both packages and the demo)

---

## §3 Functional Validation

### R# Result Matrix

| R#  | Description                                                   | Result | Note                                                                                                                                                            |
| --- | ------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | spec 檔的型別錯誤會讓 `typecheck` 失敗（**不加** skip-cache） | Pass   | canary matrix：core spec → `exit=130`，react spec → `exit=130`，兩者皆印出 `error TS2322`。修改前同一份 canary 是 `exit 0` + 3/3 cache hit                      |
| R2  | 移除錯誤後連跑兩次皆 exit 0，第二次為 cache hit               | Pass   | `baseline-1` 與 `baseline-2` 皆 `exit=0`、`cache-hit-tasks=3` ⇒ `pre-push` 成本未變                                                                             |
| R3  | root 指令涵蓋三個專案、任一有錯即失敗                         | Pass   | `npm run typecheck` = `nx run-many --projects=@asgard-js/core,@asgard-js/react,react-demo`。demo canary → `exit=1`（另兩個專案仍 cache hit，證明失敗來自 demo） |
| R4  | demo 型別錯誤歸零，且不動 SDK 公開型別                        | Pass   | `Successfully ran target typecheck for 3 projects`；`git diff --name-only main -- packages/` 為空                                                               |
| R5  | demo 的 tsc 產物與 buildinfo 不落在 `dist`                    | Pass   | build 後 `apps/react-demo/dist` = `assets` / `favicon.ico` / `index.html`（改動前該目錄含 `tsconfig.app.tsbuildinfo`）；產物落在 `out-tsc/react-demo/`          |
| R6  | `pre-push` 跑涵蓋三個專案的 typecheck                         | Pass   | 直接執行 `sh .husky/pre-push` → `Successfully ran target typecheck for 3 projects`，exit 0                                                                      |
| R7  | `AGENTS.md` 描述與實際涵蓋範圍一致                            | Pass   | Commands 三條指令齊備；〈Type checking〉改寫為「三個專案、含 `*.spec.*`」，並記下兩個舊破口與 canary 自檢法                                                     |
| R8  | 全套指令綠燈 + `/events` 仍記錄 EMIT                          | Pass   | 見 §1.3；`/events` 點「立刻訂票」→ log 出 `book_ticket` 與完整 payload                                                                                          |

### 邊界與回歸走查

五個受影響的 demo route 全部在瀏覽器走過，console 0 error：

| Route                 | 觀察                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `/events`             | 修前 `NOT LOGGED` / 修後 `LOGGED`（見下方 Findings 1）                                                                         |
| `/theme`              | 錯誤泡泡「顯示更多」展開後完整呈現 `code` / `message` / `inner` / `location`（`hint-template.tsx` 的 details toggle 讀這三欄） |
| `/markdown-theme`     | Default / Light / Dark 三組 preset 皆在，blockquote 與表格正常                                                                 |
| `/history-scroll-bug` | 正常掛載，重現說明與訊息串完整                                                                                                 |
| `/tool-call`          | Step Card 自訂 renderer 讀得到 `statusConfig`（渲染出 `Done`）                                                                 |

`cancelled` 這一態 demo 沒有 fixture（狀態切換只有 Completed / Pending / Error 三顆按鈕），因此新增的那筆
無法在 UI 上走到 —— 它是 `Record<ToolCallStatus, …>` 的型別完整性所需，不是可觀察行為。

### §3.1 Acceptance

- [x] All R# executed（canary 實測 + 指令輸出 + 產物路徑 + 瀏覽器操作）
- [x] Each R# marked with evidence
- [x] Vitest run and passing（53 檔 / 462 測試）
- [x] Boundary conditions confirmed（cache hit 路徑、cache miss 路徑、三個專案各自的失敗路徑、五個 route 的渲染）

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **`/events` 在改動前是 runtime 壞的，不只是型別紅字。** 舊 handler 宣告
   `(action: { type; eventName?; payload? })`，但 SDK 是以
   `onTemplateBtnClick(action.payload || {}, action.eventName || '', raw)` 呼叫 ⇒ `action.type` 永遠
   `undefined` ⇒ `if (action.type === 'emit')` 永不成立 ⇒ 點按鈕不會產生任何 log。瀏覽器前後對照已記錄在
   BUILD-059。這不是本 cycle 需要再處理的事（已修），列在這裡是因為它正是 issue #436 論點的實證：demo
   一旦離開型別閘門，壞掉可以完全沒有人發現。
2. **`.claude/skills/review/SKILL.md` 有兩處與本 repo 不符**（`REVIEW_RULE.md` 的相對路徑、
   `npm run lint:check` 不存在）。見本檔 Meta 的註記。屬 skill 文件的既有漂移，未在本 cycle 修改。
3. **`typecheck` 的 inputs 改用 `default` 後，`.scss` / `.md` 這類非型別檔案也會進 cache key**，代價是
   偶爾多跑一次 `tsc`（本機實測約一至二秒）。若日後嫌吵，可自訂一個 named input 把它們排除；目前選擇
   簡單且不會漏的版本。

---

## Execution Log

- 2026-08-14: REVIEW task created, paired with BUILD-059 (Status: `draft`).
- 2026-08-14: §1 Static review — 19/19 checklist items ✅，scope 內 0 violation；grep 的 setTimeout 與色值命中全為既有或 demo fixture；typecheck（三專案）/ lint（packages + demo）/ format / build / test 全綠 (Status: `draft → in-progress`).
- 2026-08-14: §3 Functional validation — R1–R8 全數 Pass；R1/R2/R3 以三專案 canary matrix 實測（改動前同一份 canary exit 0，改動後 exit 非 0），R5 以 build 後的產物路徑實測，R6 直接執行 hook 驗證。0 BLOCKERs；3 Minor findings，皆非阻擋項 (Status: `in-progress → done`).
