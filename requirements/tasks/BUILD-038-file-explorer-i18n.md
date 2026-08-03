# BUILD-038 Localize the File Explorer and replace its native prompts

## Meta

- Task ID: `BUILD-038`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/49`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-005-tool-call-i18n-locale-prop.md` (i18n mechanism), `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-021-sandbox-working-directory-file-explorer-側欄.md` (the panel itself)
- Complexity: `M`

---

## Brief

`packages/react/src/components/chatbot/file-explorer/` never adopted the SDK's own i18n — its
`i18n` import count is **0** — so all 56 user-visible strings are hardcoded Traditional Chinese.
Any consumer whose locale is not `zh-TW` gets a fully Chinese Files panel; Sindri defaults to
`en-US` and ships `en-US` / `zh-TW` / `ja-JP`, so its English and Japanese users hit this immediately.

Verified counts (grep of CJK string literals, not the stale figure in the issue body):
`file-explorer-panel.tsx` 47, `file-view.tsx` 7, `chatbot-file-explorer.tsx` 2 — **56**, matching the
issue title.

**Correction found during the build:** that count is one short. The first grep only matched CJK inside
quoted literals, so it missed `code-editor.tsx:73`, where the string is a bare JSX text node. The real
total is **57 across four files**. The acceptance check was therefore switched from "replace 56
strings" to "zero CJK remains in the directory", which is not fooled by how a string is written.

The same file also drives create-file / create-folder / rename through native `window.prompt`
(lines 369 / 380 / 391). Beyond being unlocalizable, a native modal ignores `AsgardThemeScope` and
**blocks the whole tab's JS** — during F-028 acceptance on Sindri dev this froze the page hard enough
that no CDP command could get through, so any consumer running Playwright/CDP E2E hits it too.

No public API change: locale already reaches components through `AsgardTemplateContext`, so this is
internal only and consumers just upgrade.

**Already exists:** `packages/react/src/i18n.ts` (`Locale`, `t(locale, key, vars)`, en-US fallback);
`useAsgardTemplateContext()` already carries `locale` (see `chat-composer.tsx:71`,
`chatbot-body.tsx:119` for the consumption pattern); `tool-call-consent/tool-call-consent-modal.tsx`
as the in-SDK modal precedent; 9 components already using `t()` correctly.

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)            |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §3.1 | Exported functions / methods declare explicit return types                                                                |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                       |
| §4.1 | React component props fully typed (no `any`)                                                                              |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context                                         |
| §4.4 | `react` / `react-dom` stay peerDependencies (not bundled)                                                                 |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a File Explorer component renders, the system shall obtain its locale from
  `useAsgardTemplateContext()` rather than any new prop, defaulting to `en-US`. → T2
- `R2` When the panel renders under a given locale, the system shall render every one of the 56
  previously hardcoded strings through `t()`, leaving zero CJK string literals in the
  `file-explorer/` source (excluding tests). → T1, T2
- `R3` When a File Explorer key is looked up, the system shall resolve it in all three catalogs
  (`en-US` / `ja-JP` / `zh-TW`). → T1
- `R4` When a key is missing from the active locale, the system shall fall back to `en-US` and never
  render a raw key to the user (existing `t()` behavior — must not be bypassed). → T1
- `R5` When the user triggers create-file, create-folder, or rename, the system shall collect the name
  through an in-SDK modal instead of `window.prompt`. → T3
- `R6` When the user triggers delete, the system shall ask for confirmation through the same in-SDK
  modal instead of `window.confirm`, so that zero `window.prompt` / `window.confirm` occurrences remain
  in the package. → T3
  <!-- Scope note: the confirm site (file-explorer-panel.tsx:402) is not in the issue's Expected
  behavior, but carries the identical three defects the issue cites for prompt (unlocalizable,
  ignores AsgardThemeScope, blocks the tab). Delete is a frequent action, so leaving it native would
  keep the CDP/E2E freeze the issue reports. Added on the user's explicit go-ahead. -->
- `R7` While either modal mode is open, the system shall keep the tab responsive (no blocking native
  dialog) and take its styling from the theme layer, not the OS. → T3
- `R8` When the user confirms with an empty name, or dismisses either modal, the system shall perform
  no filesystem mutation (matching the previous `prompt` cancel / empty-string and `confirm` cancel
  behavior). → T3
- `R9` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and exercises
  the Files panel via Vitest and/or the react-demo (`npm run serve:react-demo`, http://localhost:4200),
  the system shall render the panel in the selected locale and complete a create / rename / delete via
  the new modal, with no build errors. → T6

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R2, R3, R4): Add `fileExplorer.*` keys to all three catalogs in `packages/react/src/i18n.ts`, following the existing key-prefix convention
- [x] T2 (R1, R2): Replace hardcoded strings in `file-explorer-panel.tsx` (47), `file-view.tsx` (7), `chatbot-file-explorer.tsx` (2) with `t(locale, …)`, sourcing `locale` from `useAsgardTemplateContext()`
- [x] T3 (R5, R6, R7, R8): Add an in-SDK modal supporting both an input mode and a confirm mode (following the `tool-call-consent-modal` precedent), and route the three `window.prompt` sites plus the one `window.confirm` site through it, preserving cancel / empty-name semantics
- [x] T4: Add Vitest coverage for the localized panel and both modal modes (confirm / cancel / empty paths)
- [x] T5: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react`
- [x] T6 (R9): Smoke check — build, run Vitest, exercise the Files panel in the react-demo across locales; attach screenshots to `.github/screenshots/`

---

## Coverage

Use Cases: R1–R9

Files:

- `packages/react/src/i18n.ts` — 39 new `fileExplorer.*` keys across all three catalogs (79 keys each, verified aligned)
- `packages/react/src/components/chatbot/file-explorer/file-explorer-dialog.tsx` — **new**; promise-based input/confirm modal
- `packages/react/src/components/chatbot/file-explorer/file-explorer-dialog.module.scss` — **new**; themed via `--asg-color-*`
- `packages/react/src/components/chatbot/file-explorer/file-explorer-panel.tsx` — 47 strings localized; 3 `window.prompt` + 1 `window.confirm` routed through the dialog; `pasteLabel` hoisted so menu and toolbar share it (§6)
- `packages/react/src/components/chatbot/file-explorer/file-view.tsx` — 7 strings localized; `locale` added to the `body` useMemo deps (it was newly referenced inside)
- `packages/react/src/components/chatbot/file-explorer/chatbot-file-explorer.tsx` — 2 strings localized (reuse existing `header.fileExplorer`)
- `packages/react/src/components/chatbot/file-explorer/code-editor.tsx` — 1 string localized (the one missed by the initial count)
- `packages/react/src/components/chatbot/file-explorer/file-explorer-i18n.spec.tsx` — **new**; 11 cases

---

## Execution Log / Change Log

- 2026-08-03: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/49 (Status: `draft`).
- 2026-08-03: Implemented (Status: `draft → in-progress → done`).
  - Static: `tsc --build` exit 0; `prettier --check` clean; `eslint` 0 errors. One pre-existing warning is
    left alone (`file-view.tsx:174` missing `scheduleSave` dep) — not introduced here, and fixing it
    changes save behavior, so it is out of scope. The `locale` dep on that same hook **was** added,
    because this task is what introduced the reference.
  - Tests: core 165, react 72 (11 new). Two of the new cases are regression guards that read the
    directory's own source — one asserts no CJK literal remains, one asserts no `window.prompt` /
    `window.confirm` call expression returns. They fail if anyone reintroduces either.
  - `npm run lint:packages` / `typecheck:packages` still hit the Nx Cloud `401 … not connected` error
    in this environment; ran `eslint` and `tsc --build` directly instead.
- Smoke check (react-demo `/file-explorer`, real browser): panel renders in **en-US** — toolbar reads
  New folder / Upload / Download / Copy / Cut / Paste / Delete / Refresh, toolbar aria "File actions".
  Created `smoke-test-dir` through the input modal (tree updated). Delete opened the **confirm** mode
  with the directory variant, "Delete “smoke-test-dir” and everything inside it?", no input field;
  cancelling left the entry in place (R8).
  - **R7 evidence:** the JS that inspected the open dialog ran to completion and returned. Under
    `window.confirm` that call would have hung — which is exactly the e2e freeze the issue reports.
  - Screenshots: `.github/screenshots/49-file-explorer-input-dialog-en.jpg`,
    `.github/screenshots/49-file-explorer-confirm-dialog-en.jpg`
  - Not covered by the demo: ja-JP / zh-TW rendering, because the demo route mounts
    `FileExplorerPanel` without a template-context provider, so it always resolves the `en-US` default.
    Those locales are covered by unit tests instead (R3/R4).
