# BUILD-043 Let `locale` reach every part of the chatbot

## Meta

- Task ID: `BUILD-043`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/387`
- Source spec: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/387` — issue body 本身即規格（含 `chatbot.tsx` 的 JSX 層次證據與兩種修法比較）。PM 尚未把本 bug 開成 `tracking/asgard-js-sdk` 下的 BUG spec，故比照 BUILD-041 / BUILD-042 以 issue 本體為 source spec。上游背景：`references/asgard-sdk-pm/tracking/asgard-js-sdk/features/` 的 F-021（File Explorer）。
- Complexity: `S`

---

## Brief

`<Chatbot locale="zh-TW">` 目前只在地化聊天欄本身，內建的 File Explorer 面板永遠是 `en-US`。原因不在面板，而在版面：`AsgardTemplateContextProvider` 位於 `renderContent()` 內（也就是 chat column 之內），而 F-021 AC6 為了讓面板開啟時一併收窄 header 與 composer，把 File Explorer aside 移成 chat column 的**兄弟節點**——於是 aside 落在 provider 之外，`useAsgardTemplateContext()` 取到預設值。`<DropZoneOverlay>` 同樣在外面。

本任務把 provider **上移**到包住 `ChatbotContainer`，讓 aside 與 overlay 落在同一個 context 之內，並移除 `renderContent()` 內原本那一層（避免重複巢狀）。provider 的每個 prop 在上移後的位置都已在 scope 內，不需要額外傳遞。

**實作期修正（2026-08-05）**：原本的 Brief 寫「auth／error 分支也一併進入 context」，這是錯的。非驗證狀態（`needApiKey` / `invalidApiKey` / `error` / `subscriptionExpired` / `botNotFound`）走的是檔案下方**另一個 return**，該路徑刻意不建立 `AsgardServiceContextProvider`（避免開 SSE），也沒有 template provider，且不渲染 File Explorer 與 overlay。本任務不改變那條路徑。BUILD-044 不受影響——`renderContent()` 內的 `locale` 來自語彙 scope，`t(locale, …)` 兩條路徑都能用。

這同時解除 BUILD-044（#388）的前置條件：`DropZoneOverlay`（僅存在於已驗證路徑）取得 locale 之後才有辦法把 `Drop files here` 接進 catalog。

**Already exists:** `context/asgard-template-context.tsx`（`AsgardTemplateContextProvider` 與 `useAsgardTemplateContext`）、`components/chatbot/chatbot.tsx:452-475`（現有 provider 呼叫與完整 prop 清單）、`components/chatbot/file-explorer/file-explorer-panel.tsx:145` 與 `file-explorer/chatbot-file-explorer.tsx:89`（兩處 `const { locale = 'en-US' } = useAsgardTemplateContext()`）、`i18n.ts`（`fileExplorer.*` / `header.fileExplorer` 三語已齊全）、`file-explorer/file-explorer-i18n.spec.tsx`（既有測試只驗 catalog，不掛載 `<Chatbot>`）。

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

- `R1` When a consumer renders `<Chatbot locale="zh-TW">` and opens the built-in File Explorer, the system shall render the panel's strings in `zh-TW` without the consumer supplying an additional `AsgardTemplateContextProvider`. → T1, T2
- `R2` When a consumer renders `<Chatbot locale="zh-TW">`, the system shall resolve the File Explorer header toggle's `aria-label` / `title` (`header.fileExplorer`) in `zh-TW`. → T1, T2
- `R3` When the template context is hoisted, the system shall keep exactly one `AsgardTemplateContextProvider` in the tree — no nested duplicate — and every existing prop shall keep the same value it had before. → T1
- `R4` When `locale` is omitted, the system shall keep resolving every string as `en-US`, unchanged from current behavior. → T3
- `R5` (Smoke check) When the developer runs `npm run typecheck:packages`, `npm run build:core && npm run build:react` and `npm run test:packages`, and exercises the File Explorer in the react-demo (`npm run serve:react-demo`, http://localhost:4200), the system shall show a localized panel with no build, type or test errors. → T4, T5

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R2, R3): In `packages/react/src/components/chatbot/chatbot.tsx`, hoist `<AsgardTemplateContextProvider>` so it wraps `ChatbotContainer` (inside `AsgardServiceContextProvider`), and delete the copy inside `renderContent()`'s `authenticated` branch. Keep the prop list identical. Update the two JSX comments that describe the old nesting so they do not become stale.
- [x] T2 (R1, R2): Confirm no component under the aside needs anything beyond `locale` from the newly reachable context; leave `ChatHeaderHost`'s existing `locale` **prop** as is (it does not read context).
- [x] T3 (R1, R3, R4): Add a regression test. Mounting the authenticated `<Chatbot>` needs a live `AsgardServiceClient` (SSE), so assert the **structural invariant** instead, in the same source-inspection idiom the existing `file-explorer-i18n.spec.tsx` already uses: `chatbot.tsx` contains exactly one `AsgardTemplateContextProvider`, and it encloses `ChatbotContainer`. Pair it with a render test proving the panel follows the context. The structural assertion must fail on `main`.
- [x] T4: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react` + `npm run test:packages`.
- [x] T5 (R5): Smoke check in the react-demo; screenshot to `.github/screenshots/` (the change is visually significant).

---

## Coverage

Use Cases: R1, R2, R3, R4, R5

Files:

- `packages/react/src/components/chatbot/chatbot.tsx` (react) — provider hoisted above `ChatbotContainer`; inner copy removed; stale nesting comments rewritten
- `packages/react/src/components/chatbot/chatbot-locale-scope.spec.tsx` (react, new) — structural invariant + panel-follows-context render tests
- `.github/screenshots/sdk-387-no-wrapper-{default,en-US,ja-JP}.png` — consumer smoke check

---

## Execution Log / Change Log

- 2026-08-05: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/387 (Status: `draft`).
- 2026-08-05: Implementation started (Status: `draft → in-progress`).
- 2026-08-05: Brief corrected mid-build — the non-authenticated path has no template provider and never did; the hoist covers the authenticated tree only.
- 2026-08-05: Regression test proven to fail on `main` (2 structural assertions) and pass with the fix.
- 2026-08-05: lint / format:check / typecheck / test / build:core / build:react all green.
- 2026-08-05: Smoke check — packed `0.3.45-local` into `asgard-embed-frontend`, **removed that app's outer `AsgardTemplateContextProvider` workaround**, and confirmed `<Chatbot locale>` alone localizes header + File Explorer in zh-TW / en-US / ja-JP. Screenshots attached (Status: `in-progress → done`).
