# BUILD-001 Message Stream Assembly Robustness

## Meta

- Task ID: `BUILD-001`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/11`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-011-message-與-thinking-串流組裝健壯性.md` (+ `use-cases/UC-017`, `UC-018`)
- Complexity: `M`

---

## Brief

Harden the message-stream reducer (`packages/core/src/lib/conversation.ts`) so adversarial SSE frame orders — caused by the backend skipping `start`/`delta` and sending `complete` directly, or by Last-Event-ID replay (F-002) delivering duplicate / out-of-order frames — never corrupt the conversation (no dropped text, no stuck typing, no blanked message, no crash). The design principle: `complete` is the self-sufficient, authoritative terminal; assembly is order-independent, idempotent, and a completed message **never regresses** to typing/streaming. Also fixes the react renderer edge where a completed message with no `template` shows an empty `<div/>` instead of its plain text.

**Scope boundary:** this task hardens **message** assembly only. The **thinking** family (`asgard.message.thinking.*` — new `EventType`s, handlers, and thinking robustness tests) is delegated to **F-001** per the F-011 spec (lines 40/50/57/59); F-011 establishes the robustness rules that F-001's thinking handlers will follow.

**Already exists:** `packages/core/src/lib/conversation.ts` (`onMessageStart` overwrites unconditionally → regresses on late start; `onMessageDelta` `return this` on missing entry → drops, and flips typing back after complete; `onMessageComplete` already self-sufficient). `packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx` (`switch (template?.type)` → `default: <div />`). No core test infra yet (vitest is installed at root but core has no config).

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing (test fixtures may cast via `unknown`)     |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                       |
| §1.3 | No `console.log` left in library code                                                                                  |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only              |
| §1.7 | No breaking public-API change without `@deprecated` transition (reducer behavior change is internal, not a type break) |
| §3.1 | Exported functions / methods declare explicit return types                                                             |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces                                                 |
| §4.1 | React component props fully typed (no `any`)                                                                           |
| §4.2 | No hardcoded color values in the renderer fallback — theme via existing template components / CSS variables            |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                  |
| §6   | Extract repeated logic (≥2×) — the terminal-state guard is shared by start + delta handlers                            |
| §7   | No `setTimeout` mock delays in library code; the demo mock (react-demo) may stage frame order                          |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When `message.complete` arrives for a messageId with no prior `start`/`delta`, the reducer shall materialize the terminal from that frame alone (`isTyping=false`, text/template from the frame) — no typing bubble, no dropped text. → T1, T2
- `R2` When `message.delta` arrives with no existing entry (delta-before-start / mid-stream join), the reducer shall **lazy-create** the entry and append its text (never silently drop); `start` is optional. → T1, T2
- `R3` Once a messageId has completed, a late `start` / `delta` / duplicate `complete` shall be **ignored** — never flip `isTyping` back to true, never clear `typingText` or overwrite the terminal text, never create a second message (idempotent terminal guard). → T1, T2
- `R4` Any subset / out-of-order / duplicate frame sequence shall not throw; `typingText` concatenation shall never yield a literal `"null…"` (prevented by the terminal guard). → T1, T2
- `R5` A completed bot message whose `template` is absent shall render its plain `message.text` (not an empty `<div/>`). → T3
- `R6` (Smoke check) core Vitest covers the four adversarial message sequences (complete-only, delta-before-start, start/delta-after-complete, duplicate-complete) all green; `npm run build:core && npm run build:react` green; a react-demo adversarial route whose mock fires those sequences shows messages render correctly / stably; screenshot/GIF committed to `.github/screenshots/`. → T2, T4, T5

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1–R4): `conversation.ts` — add a shared terminal-state guard (a completed bot message = `type==='bot' && !isTyping`); `onMessageStart` ignores late start on a terminal message; `onMessageDelta` ignores late delta on a terminal message AND lazy-creates when no entry exists; confirm `onMessageComplete` stays self-sufficient + idempotent.
- [x] T2 (R6): `packages/core/vitest.config.ts` (minimal, node env) + `packages/core/src/lib/conversation.spec.ts` — the four adversarial message sequences.
- [x] T3 (R5): `conversation-message-renderer.tsx` — `default` case renders `message.text` as plain text when present (reuse the text template / plain rendering; theme-safe), empty only when there is truly nothing.
- [x] T4 (R6): react-demo adversarial route + mock that fires the four frame orders on demand (does not disturb other routes); browser verify each renders correctly; screenshot/GIF to `.github/screenshots/`.
- [x] T5: `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6 (UC-017 缺前綴直達 complete + delta lazy-init; UC-018 終態防回退 + 冪等).
Files:

- `packages/core/src/lib/conversation.ts` — `isTerminalBot` guard; `onMessageStart` / `onMessageDelta` hardened (terminal guard + lazy-init).
- `packages/core/src/lib/conversation.spec.ts` (new) — 5 adversarial + normal sequences.
- `packages/core/vitest.config.ts` (new) — core unit-test config (node env).
- `packages/core/eslint.config.cjs` — `@nx/dependency-checks` `ignoredFiles` += `vitest.config` + `src/**/*.spec.ts`.
- `packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx` — no-template `default` → plain-text fallback.
- `apps/react-demo/src/mock-server/sse-mock.ts` — scoped adversarial handler (`stream-robustness-demo` channel).
- `apps/react-demo/src/app/routes/stream-robustness/{stream-robustness.tsx,.module.scss,index.ts}` (new) — demo route.
- `apps/react-demo/src/app/app.tsx`, `components/layout/layout.tsx` — route + nav registration.
- `.github/screenshots/f-011/stream-robustness-demo.png` (new) — verification artifact.

Verification: `npx vitest run --config packages/core/vitest.config.ts` **5/5** ✅ · build:core + build:react ✅ · lint:packages (core+react) ✅ · prettier (own files) ✅. Browser `/stream-robustness`: R1 complete-only renders terminal on load; R2 delta-before-start lazy-accumulates; R3 late start/delta after complete ignored (completed answer preserved, no leak, no stuck typing); R4 dup-complete idempotent (single message); R5 no-template → plain text (not empty); no console errors. (`format:check` repo-wide shows ~134 pre-existing unformatted files under `references/` / `spec/` / local — not touched by this task.)

---

## Execution Log / Change Log

- 2026-07-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/11 (F-011 + UC-017/UC-018) (Status: `draft`).
- 2026-07-14: Implemented T1–T5 — reducer terminal guard + lazy-init; core vitest (5/5); renderer no-template fallback; scoped adversarial demo route + mock; static gate green; browser-verified R1–R6 with committed screenshot (Status: `in-progress → done`).
