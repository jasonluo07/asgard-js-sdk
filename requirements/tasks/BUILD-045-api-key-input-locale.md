# BUILD-045 Give `ApiKeyInput` the locale its render path can actually supply

## Meta

- Task ID: `BUILD-045`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/391`
- Source spec: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/391` — issue body 本身即規格（含 blob URL 釘死的行號證據與建議修法）。比照 BUILD-041 ～ 044 以 issue 本體為 source spec。
- Complexity: `S`

---

## Brief

#389（0.3.45）把金鑰畫面的文案接進 i18n catalog，但接線接成兩半：`placeholder` 與 `error` 由 `chatbot.tsx` 用 `t(activeLocale, …)` 當 prop 傳進去，而 `ApiKeyInput` 自己渲染的 `Key` 標籤、顯示／隱藏密碼 `aria-label`、送出鈕則讀 `useAsgardTemplateContext()`。問題是這個元件**只在非驗證路徑渲染**，而該路徑為了避免開 SSE 連線刻意只包 theme provider、沒有 template provider——於是 context 永遠回預設 `en-US`，`<Chatbot locale="zh-TW">` 只翻到一半。

本任務讓 `ApiKeyInput` 收 `locale` prop（比照 `ChatHeaderHost` 既有做法）、context 留作 fallback，並讓 `chatbot.tsx` 傳 `activeLocale`。順帶把 `placeholder` / `error` 的預先解析拿掉——傳一次 `locale` 就夠，分裂接線一併收乾淨。

**Already exists:** `components/chatbot/api-key-input/api-key-input.tsx`（`ApiKeyInputProps`、6 處 `t(locale, …)`）、`components/chatbot/chatbot.tsx`（`activeLocale`、兩處 `<ApiKeyInput>` 呼叫、非驗證路徑的 return）、`components/chatbot/chat-header/chat-header-host.tsx`（`locale` 走 prop 的既有範例）、`i18n.ts`（`auth.*` key 已齊全，本任務不新增 key）。

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

- `R1` When a consumer renders `<Chatbot locale="zh-TW" authState="needApiKey">`, the system shall render **every** string on the API-key screen in `zh-TW` — field label, placeholder, show/hide-password label and submit button included. → T1, T2
- `R2` When a consumer renders `<Chatbot locale="zh-TW" authState="invalidApiKey">`, the system shall also render the invalid-key message in `zh-TW`. → T1, T2
- `R3` When `ApiKeyInput` is rendered standalone under an `AsgardTemplateContextProvider` and given no `locale` prop, the system shall keep resolving from that context (no behavioral regression for the AC7-style standalone use). → T2, T3
- `R4` When `locale` is omitted everywhere, the system shall render the whole screen in `en-US` with wording unchanged from `0.3.46`. → T3
- `R5` (Smoke check) When the developer runs `npm run typecheck:packages`, `npm run build:core && npm run build:react` and `npm run test:packages`, the system shall pass with no build, type or test errors. → T4

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R2): Add an optional `locale` prop to `ApiKeyInputProps`; resolve `const activeLocale = locale ?? contextLocale` so the prop wins and the context remains the fallback.
- [x] T2 (R1, R2, R3): In `chatbot.tsx`, pass `locale={activeLocale}` to both `<ApiKeyInput>` call sites and drop the now-redundant pre-resolved `placeholder` / `error` props.
- [x] T3 (R1–R4): Add a regression test that mounts `<Chatbot authState="needApiKey">` — that path skips the service provider, so it mounts in jsdom without SSE — and asserts the field label and submit button follow `locale`, plus the standalone-under-provider and no-locale cases. **Must fail on `main`.**
- [x] T4 (R5): Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react` + `npm run test:packages`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5

Files:

- `packages/react/src/components/chatbot/api-key-input/api-key-input.tsx` (react) — new optional `locale` prop; `activeLocale = locale ?? contextLocale`; 6 call sites switched
- `packages/react/src/components/chatbot/chatbot.tsx` (react) — both `<ApiKeyInput>` call sites pass `locale={activeLocale}`; the pre-resolved `placeholder` props removed
- `packages/react/src/components/chatbot/api-key-input/api-key-input-locale.spec.tsx` (react, new) — 5 cases covering R1–R4

---

## Execution Log / Change Log

- 2026-08-05: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/391 (Status: `draft`).
- 2026-08-05: 使用者已在 issue #391 讀過 Suggested fix 並授權開工，故直接進入實作（Status: `draft → in-progress`）。
- 2026-08-05: 回歸測試已確認在 `main`（0.3.46）上失敗 3 條、加上修正後 5 條全過。
- 2026-08-05: lint / format:check / typecheck / test（core 177 + react 105）/ build:core / build:react 全綠（Status: `in-progress → done`）。
