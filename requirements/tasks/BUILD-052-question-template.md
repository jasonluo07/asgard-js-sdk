# BUILD-052 Render the QUESTION message template as a fillable card

## Meta

- Task ID: `BUILD-052`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/64`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-029-問卷卡-question-template.md`
- Complexity: `M`

---

## Brief

The backend now emits a `QUESTION` message template — a multiple-choice card (1–4 questions, 2–4
options each, single- or multi-select) sent when the agent needs a decision rather than a guess. This
task renders it as a fillable form and, on submit, folds the picks into one markdown string that goes
out through the **existing send-message path** as an ordinary next user message.

**The card is not a handshake.** The run has already ended when the question arrives, so there is no
accept/reject call, no API, no run to resume, no pending state, and no expiry. The user may ignore the
card entirely and type their own words — that is the same path, not an exception — so the card must
never block the composer, show a modal, or gate input.

**Resolved cards collapse, not merely go read-only.** The frontend cannot know whether a historical
card was filled (the answer left as a plain message; neither the card nor the server records it), so a
rejoin replays every old card as "brand new". The criterion is purely derived: **if any user message
follows the card, its moment has passed** — collapse it to a one-line summary, expandable for review.

`composeQuestionAnswers` is a **contract with the model, not styling** — it ships as an independently
unit-tested module.

**Already exists:** `packages/core/src/constants/enum.ts` (`MessageTemplateType`),
`packages/core/src/types/sse-response.ts` (template union + `Message.template`),
`packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx` (template
switch + the `message.text` default branch that is the legacy fallback — **do not touch it**),
`packages/react/src/components/templates/table-template/` (component layout pattern),
`packages/react/src/components/chatbot/task-list/` + `subagent-list/` (the collapse-shell this card
mirrors), `packages/react/src/i18n.ts` (catalog + `t()`),
`packages/react/src/context/asgard-service-context.tsx` (`messages`, and the wrapped `sendMessage`
that is the same entry the composer uses).

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

- `R1` When a completed message carries `template.type === 'QUESTION'`, the system shall render a form
  card showing, per question, the `header` chip and the full `question` text. → T1, T3
- `R2` When a question has `multiSelect: false`, the system shall keep at most one option selected
  (picking B clears A); when `multiSelect: true`, it shall allow several at once; and the two shall be
  visually distinguishable (round vs square marker). → T3
- `R3` When any question is rendered, the system shall offer a free-text escape hatch on **every**
  question, and on submit shall carry the user's own words — never the literal "other" label. → T3
- `R4` While no question has an answer, the system shall keep the submit button disabled; once at least
  one question is answered it shall enable it, and shall return to disabled if all picks are cleared. → T3
- `R5` When the user submits, the system shall produce text obeying the fold contract exactly: question
  text verbatim, numbering consecutive over the **submitted** questions (not the original index),
  skipped questions omitted whole, multi-select joined with `, ` (never localized), and `---` separated
  by one blank line on each side. → T2
- `R6` When `composeQuestionAnswers` is exercised by Vitest, the system shall pass cases covering
  renumbering after a skipped first question, a single question, multi-select, free-text, and
  all-skipped returning the empty string. → T2
- `R7` When the user submits, the system shall send the folded text through the existing send-message
  path, so the result is indistinguishable from a message the user typed and starts a new run. → T4
- `R8` While a question card is present, the system shall leave the composer fully usable — no modal,
  no overlay, no "answer first" gate. → T3
- `R9` When any user message follows a card, the system shall render that card as a collapsed one-line
  summary (icon + `header`s joined by `·` + answered label + expand affordance), with the questions and
  options **absent from the DOM**, not merely hidden. → T5
- `R10` When a collapsed card is expanded, the system shall show the questions and options read-only —
  options not clickable and **no submit button**. → T5
- `R11` When the transcript is replayed on rejoin or refresh, the system shall recompute the collapse
  criterion purely from message order, yielding the same result before and after. → T5
- `R12` When the user submits a card, the system shall collapse that card immediately, without waiting
  for the next message to arrive; a second submit on the same card shall do nothing. → T3, T5
- `R13` When a card is present, the system shall not block streaming — other blocks of the same agent
  message shall render as usual. → T3
- `R14` When question or option strings are long, the system shall wrap or truncate them without
  pushing the layout open or overflowing horizontally. → T3
- `R15` When the locale changes, the system shall reflect the new locale immediately for `question.*`
  chrome in `en-US` / `zh-TW` (and `ja-JP`, which the catalog already carries), while leaving the
  questions and options themselves untranslated. → T6
- `R16` When an older consumer that does not know `QUESTION` renders the message, the system shall
  leave the existing `message.text` default-branch fallback intact and unchanged. → T1, T3
- `R17` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and exercises
  the card via Vitest and the react-demo route `/question-template`
  (`npm run serve:react-demo`, http://localhost:4200), the system shall walk R1–R16 with no build
  errors. → T8

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [ ] T1 (R1, R16): core — add `MessageTemplateType.QUESTION` to `constants/enum.ts`; add
      `QuestionOption` / `Question` / `QuestionMessageTemplate` to `types/sse-response.ts` and join the
      `Message.template` union (mirroring where `TABLE` / `ATTACHMENT` sit). Types before first use (§2.3).
      No new subject / store — this is a template, not an event.
- [ ] T2 (R5, R6): react — `compose-question-answers.ts` as a standalone pure module with an explicit
      return type, plus its Vitest covering the five required cases. Write the tests first (contract, not styling).
- [ ] T3 (R1–R4, R8, R12, R13, R14, R16): react — `components/templates/question-template/`
      (`index.ts` + `question-template.tsx` + `question-template.module.scss`), following the
      `table-template` layout; single/multi markers, per-question free-text row, submit-disabled rule,
      long-string containment via SCSS. Register the `QUESTION` case in
      `conversation-message-renderer.tsx` **without touching the `default` branch**.
- [ ] T4 (R7): wire submit to the wrapped `sendMessage` from `useAsgardServiceContext()` — the same
      entry the composer uses. The component itself never touches the network.
- [ ] T5 (R9, R10, R11, R12): react — derive "resolved" purely from message order (any later user
      message) as a small pure helper with its own Vitest; build the collapse shell mirroring
      `task-list` / `subagent-list`, keeping collapsed content out of the DOM.
- [ ] T6 (R15): react — add `question.*` keys to `packages/react/src/i18n.ts` for `en-US` / `zh-TW` /
      `ja-JP`, sourced from the prototype catalog.
- [ ] T7 (R1, R5): export the new public API from the package entries with explicit `export type` (§2.2).
- [ ] T8: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run build:core && npm run build:react` + `npm run test:packages`.
- [ ] T9 (R17): Smoke check — add react-demo route `/question-template` (new route, do not modify
      existing mocks) and walk every R# in the browser; screenshot to `.github/screenshots/`.

---

## Coverage

Use Cases: UC-049, UC-050 — R1–R17 (R6 by Vitest only; R11 verified in the browser via the new
`question-template-rejoin-demo` replay channel)

Files:

**`@asgard-js/core`**

- `packages/core/src/constants/enum.ts` — `MessageTemplateType.QUESTION`
- `packages/core/src/types/sse-response.ts` — `QuestionOption` / `Question` / `QuestionMessageTemplate`, joined to the `Message.template` union

**`@asgard-js/react`**

- `packages/react/src/components/templates/question-template/question-template.tsx` (new)
- `packages/react/src/components/templates/question-template/question-template.module.scss` (new)
- `packages/react/src/components/templates/question-template/compose-question-answers.ts` (new)
- `packages/react/src/components/templates/question-template/compose-question-answers.spec.ts` (new, 9 cases)
- `packages/react/src/components/templates/question-template/is-question-resolved.ts` (new)
- `packages/react/src/components/templates/question-template/is-question-resolved.spec.ts` (new, 6 cases)
- `packages/react/src/components/templates/question-template/question-template.spec.tsx` (new, 14 cases)
- `packages/react/src/components/templates/question-template/index.ts` (new)
- `packages/react/src/components/templates/index.ts` — barrel export
- `packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx` — `QUESTION` case added; the `default` branch is untouched (verified by diff)
- `packages/react/src/i18n.ts` — `question.*` × 7 keys × 3 locales

**`apps/react-demo`** (verification only, not shipped)

- `apps/react-demo/src/app/routes/question-template/*` (new route, 3 shells: wide / rejoin / narrow 375)
- `apps/react-demo/src/mock-server/sse-mock.ts` — QUESTION scripts + the R11 rejoin replay + its metadata gate
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — route registration

---

## Execution Log / Change Log

- 2026-08-12: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/64 (Status: `draft`).
- 2026-08-12: Plan confirmed by user (Status: `draft → ready`).
- 2026-08-12: Implementation started (Status: `ready → in-progress`).
- 2026-08-12: All R# verified. Static: typecheck green, lint 0 errors (3 pre-existing warnings, none new),
  format green, build:core + build:react green, Vitest core 196 / react 217 (+29). Browser: walked
  R1–R5, R7–R15 on `/question-template` at both widths; R7 confirmed from the request body (identical
  shape to a typed message, only `text` differs); R11 confirmed from a replayed transcript across two
  reloads. Verified no new demo-app type errors (5 before, 5 after). Collapse assertions mutation-tested
  (R9 + R12 fail when the DOM-absence branch is removed). (Status: `in-progress → done`).
