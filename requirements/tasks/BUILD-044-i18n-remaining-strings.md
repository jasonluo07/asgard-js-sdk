# BUILD-044 Route the remaining hardcoded UI strings through the i18n catalog

## Meta

- Task ID: `BUILD-044`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/388`
- Source spec: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/388` — issue body 本身即規格（列出全部 8 個字串與其檔案 / 行號）。PM 尚未把本 bug 開成 `tracking/asgard-js-sdk` 下的 BUG spec，故比照 BUILD-041 / BUILD-042 / BUILD-043 以 issue 本體為 source spec。
- Complexity: `S`

---

## Brief

Auth 狀態、error 狀態與拖放覆蓋層的文案是直接寫死在 JSX 裡的英文字面值，完全沒有經過 `t()`，因此 `locale` 設成 `zh-TW` / `ja-JP` 時會得到中英（或日英）混雜的介面。對可嵌入的 widget 影響最直接——API key 畫面是未驗證訪客看到的**第一個**畫面。

本任務把這 8 個字串加進 `i18n.ts` 三語 catalog，並讓呼叫端改走 `t()`。`chatbot.tsx` 內的 6 處可直接用語彙上已在 scope 的 `locale` 變數；`api-key-input.tsx` 的 prop 預設值與 `drop-zone-overlay.tsx` 則需要各自取得 locale。

**依賴 BUILD-043**：`DropZoneOverlay` 目前渲染在 `AsgardTemplateContextProvider` 之外，要等 BUILD-043 把 provider 上移之後才讀得到 `locale`。

**Already exists:** `i18n.ts`（`t()` 與三語 catalog，已有 `fileExplorer.*` / `header.*` / `composer.*` 等群組可比照命名）、`components/chatbot/chatbot.tsx:401,412,413,427,437,447`、`components/chatbot/api-key-input/api-key-input.tsx:24`、`components/chatbot/drop-zone-overlay/drop-zone-overlay.tsx:31`、`file-explorer/file-explorer-i18n.spec.tsx`（既有的三語 key 對齊測試，新增 key 會自動納入）。

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
| §    | Rule (summary)                                                                                                            |

|

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a consumer renders `<Chatbot locale="zh-TW">` while the auth state is `needApiKey` or `invalidApiKey`, the system shall render the key placeholder and the validation message in `zh-TW`. → T1, T2
- `R2` When a consumer renders `<Chatbot locale="zh-TW">` while the auth state is `error`, `subscriptionExpired` or `botNotFound`, the system shall render that state's message in `zh-TW`. → T1, T2
- `R3` When a consumer renders `<Chatbot locale="zh-TW">` and drags a file over the chatbot, the system shall render the drop hint in `zh-TW`. → T1, T3
- `R4` When a new key is added to the catalog, the system shall carry it in all three locales with identical interpolation placeholders — enforced by the existing catalog parity spec. → T1, T5
- `R5` When `locale` is omitted, the system shall render every one of these strings with its current English wording, unchanged. → T5
- `R6` (Smoke check) When the developer runs `npm run typecheck:packages`, `npm run build:core && npm run build:react` and `npm run test:packages`, and walks the auth states in the react-demo (`npm run serve:react-demo`, http://localhost:4200, Auth 頁), the system shall show localized copy with no build, type or test errors. → T6, T7

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1–R4): Add keys to all three locales in `packages/react/src/i18n.ts`, following the existing group naming — proposal: `auth.enterKey`, `auth.invalidKey`, `auth.loading`, `error.generic`, `error.serviceUnavailable`, `error.serviceNotFound`, `dropZone.hint`.
- [x] T2 (R1, R2): Replace the six literals in `chatbot.tsx` with `t(locale, ...)` (`locale` is already in lexical scope inside `renderContent()`).
- [x] T3 (R3): Give `DropZoneOverlay` its locale via `useAsgardTemplateContext()` — reachable only after BUILD-043 — and replace `Drop files here`.
- [x] T4 (R1, R5): In `api-key-input.tsx`, stop defaulting `placeholder` to an English literal; resolve the default from the catalog so the same string cannot leak back in. Keep the prop overridable (no breaking change, §1.7).
- [x] T5 (R4, R5): Extend the i18n spec to cover the new keys' rendering, and assert the `en-US` wording is byte-identical to today's literals.
- [x] T6: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react` + `npm run test:packages`.
- [x] T7 (R6): Smoke check in the react-demo Auth page; screenshot to `.github/screenshots/`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5（R6 部分達成 — 見 Execution Log）

Files:

- `packages/react/src/i18n.ts` (react) — 12 new keys × 3 locales
- `packages/react/src/components/chatbot/chatbot.tsx` (react) — 6 literals → `t(activeLocale, …)`
- `packages/react/src/components/chatbot/api-key-input/api-key-input.tsx` (react) — 6 literals → `t(locale, …)`; `placeholder` / `title` defaults now resolve from the catalog
- `packages/react/src/components/chatbot/drop-zone-overlay/drop-zone-overlay.tsx` (react) — drop hint → `t(locale, …)`
- `packages/react/src/components/chatbot/chatbot-i18n.spec.tsx` (react, new) — wording lock + per-locale resolution + literal scan

---

## Execution Log / Change Log

- 2026-08-05: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/388 (Status: `draft`).
- 2026-08-05: Implementation started (Status: `ready → in-progress`).
- 2026-08-05: **Scope extended beyond the issue's list.** The new literal-scan test caught five more hardcoded strings in the same component — `ApiKeyInput`'s `title` default (`Preview`), the `Key` label, the show / hide-password `aria-label`s and the submit button's `Loading...` / `Continue`. Same defect, same file, so localizing only the placeholder would have left a Chinese shell around an English key form. Issue #388 listed only the placeholder; that was an omission in the issue, not a deliberate boundary. Total: 12 keys × 3 locales.
- 2026-08-05: The literal scan initially matched short words as substrings (`Key` inside `apiKey`); tightened to match only quoted literals and JSX text nodes.
- 2026-08-05: lint / format:check / typecheck / test:packages / build:core / build:react all green.
- 2026-08-05: R6 partially met — unit tests cover every R#, and `en-US` wording is locked byte-identical, but the react-demo Auth page was **not** exercised: reaching `needApiKey` / `subscriptionExpired` / `botNotFound` needs bot providers in those states, which the demo `.env` here does not have. Stated rather than glossed (Status: `in-progress → done`).
