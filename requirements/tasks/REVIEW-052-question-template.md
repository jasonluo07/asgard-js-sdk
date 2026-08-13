# REVIEW-052 Review: render the QUESTION message template as a fillable card

## Meta

- Task ID: `REVIEW-052`
- Status: `done`
- BUILD Task: `BUILD-052`
- Reviewed commit: `<filled at commit time — branch feat/64-question-template>`
- Reviewed branch: `feat/64-question-template`

---

## §1 Static Code Review

Scope: the files listed in BUILD-052 `## Coverage` (core enum + sse-response, the new
`question-template/` directory, the renderer, the templates barrel, `i18n.ts`).

### §1.1 Checklist

| Check item                                            | Rule      | Result                                                                                                                                                                        |
| ----------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                                      | §1.1      | ✅ none                                                                                                                                                                       |
| `@ts-ignore` / `eslint-disable`                       | §1.2      | ✅ none                                                                                                                                                                       |
| `console.log` in library code                         | §1.3 §7   | ✅ none                                                                                                                                                                       |
| Hardcoded API key / endpoint / namespace              | §1.4      | ✅ none (demo route reads `window.location.origin`, not shipped)                                                                                                              |
| RxJS / EventSource / timer teardown                   | §1.5      | ✅ n/a — the component holds no subscription or timer; it reads context and calls `sendMessage`                                                                               |
| react imports core via the public entry only          | §1.6      | ✅ all imports are `@asgard-js/core`                                                                                                                                          |
| core imports react / react-dom / DOM                  | §1.6 §2.1 | ✅ none — core change is types + one enum member                                                                                                                              |
| Breaking public API without `@deprecated`             | §1.7      | ✅ purely additive (new enum member, new types appended to the union, new component)                                                                                          |
| New public types / components exported from the entry | §2.2      | ✅ core via `export type * from './sse-response'`; react via `templates/index.ts` → `components` → package entry. **Verified in built `dist/`**                               |
| Template type + enum exist before the component       | §2.3      | ✅ T1 landed before T3                                                                                                                                                        |
| `botProviderEndpoint`, not `endpoint`                 | §2.4      | ✅ demo config uses `botProviderEndpoint`                                                                                                                                     |
| Explicit return types on exported functions           | §3.1      | ✅ `composeQuestionAnswers(): string`, `isQuestionResolved(): boolean`, `QuestionTemplate(): ReactNode`                                                                       |
| Shared types centralized in core `src/types/`         | §3.2      | ✅ `Question` / `QuestionOption` / `QuestionMessageTemplate` in core; react defines no duplicate                                                                              |
| React props fully typed                               | §4.1      | ✅ `QuestionTemplateProps`, `OptionRowProps`                                                                                                                                  |
| Hardcoded color values in components                  | §4.2      | ✅ every hex in the `.scss` is a `var(--asg-color-*, …)` fallback — the same idiom as `task-list.module.scss` (14 occurrences there). No bare literal                         |
| react / react-dom stay peerDependencies               | §4.4      | ✅ untouched                                                                                                                                                                  |
| core and react share a version                        | §5        | ✅ both `0.3.61`, unchanged (deliberately unreleased)                                                                                                                         |
| Repeated logic / types / JSX extracted                | §6        | ✅ `OptionRow` extracted (used for both listed options and the free-text row); the two contract functions are their own modules; mock question sets share `questionPlainText` |
| `setTimeout` mock delays / dead code / stray TODO     | §7        | ✅ none in the coverage set                                                                                                                                                   |

### §1.2 Mechanical Grep

Scanned the Coverage paths. **A positive control (`grep 'QUESTION'` → 5 hits) was run first** because the
first attempt passed the path list as one argument and produced four _false_ empty results.

```
§1.1 any / as any ............... exit=1 (no match) ✅
§1.2 ts-ignore / eslint-disable .. exit=1 (no match) ✅
§1.3 console.log ................. exit=1 (no match) ✅
§7   setTimeout .................. exit=1 (no match) ✅
§1.6 core → react ................ exit=1 (no match) ✅
§1.6 react → core/src ............ exit=1 (no match) ✅
§4.2 hex / rgba outside var() .... exit=1 (no match) ✅
positive control 'QUESTION' ...... exit=0, 5 hits (proves the scan reads the files)
```

### §1.3 TypeScript and Lint

`npm run lint:check` does not exist in this repo (only `lint:core` / `lint:react` / `lint:packages`).
Used `lint:packages`, which is read-only. Type checking used `typecheck:packages`, not the build —
per `AGENTS.md`, vite builds report type errors on stdout while exiting `0`.

```
typecheck:packages: PASS — Successfully ran target typecheck for 2 projects
lint:packages:      PASS — 0 errors, 3 warnings (all pre-existing on main:
                    chat-composer aria-description, file-view exhaustive-deps,
                    per-source-view-state useless-fragment). None introduced here.
format:check:       FAIL → FIXED. `requirements/tasks/_index.md` lost its table alignment
                    during a scripted edit; `prettier --write` applied, re-run green.
build:core+react:   PASS
react-demo tsc:     5 errors, all pre-existing (measured on a stashed tree: 5 before, 5 after)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked
- [x] No ❌ violations outstanding (the one format failure was fixed and re-verified)
- [x] All §1.2 greps run, with a positive control
- [x] `typecheck:packages` clean
- [x] `lint:packages` — 0 errors

## §3 Functional Validation

Coverage Use Cases: UC-049, UC-050. Validated against `npm run serve:react-demo` on
http://localhost:4200/question-template (three shells: wide full-bleed, R11 rejoin, narrow 375×640)
plus Vitest.

### R# Result Matrix

| R#  | Description                                                              | Result | Note                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | QUESTION renders as a form card with header chip + full question         | Pass   | Browser + jsdom; option `description` renders too                                                                                                                                                                                      |
| R2  | Single-select exclusive, multi-select cumulative, visually distinct      | Pass   | Browser: picking Redis flipped PostgreSQL to `aria-checked=false`; both multi options stayed true. Round vs square marker visible in `f-029-01`                                                                                        |
| R3  | Free-text escape hatch on every question, carries the user's words       | Pass   | Browser + jsdom; asserted the composed text does **not** contain the "other" label                                                                                                                                                     |
| R4  | Submit disabled until answered, disabled again when cleared              | Pass   | Browser + jsdom; an opened-but-empty free-text row does not enable it                                                                                                                                                                  |
| R5  | Fold contract exact                                                      | Pass   | **Read off the actual request body**: `1. 資料要放在哪一種儲存？\n\nRedis\n\n---\n\n2. 第一版要先具備哪些能力？\n\n使用者認證, 可觀測性`                                                                                               |
| R6  | `composeQuestionAnswers` unit-tested                                     | Pass   | 9 cases incl. renumber-after-skip, multi-select, free text, all-skipped → `''`                                                                                                                                                         |
| R7  | Submitted through the existing send path, indistinguishable from typing  | Pass   | Two request bodies compared: identical shape (`action`/`customChannelId`/`customMessageId`/`text`), only `text` differs. A new run followed                                                                                            |
| R8  | Composer stays usable; no modal / overlay                                | Pass   | Browser: `textarea.disabled === false` throughout; zero `[role=dialog]` / `[aria-modal]` nodes                                                                                                                                         |
| R9  | Later user message → collapsed one-line summary, options absent from DOM | Pass   | Browser: card subtree had 0 option nodes and no question text; summary read `資料儲存 · 首版能力 已回覆`                                                                                                                               |
| R10 | Expanded resolved card is read-only, no submit button                    | Pass   | Browser: 8 options all `disabled`, no submit, no free-text input                                                                                                                                                                       |
| R11 | Rejoin recomputes the same collapse                                      | Pass   | New `question-template-rejoin-demo` channel replays a transcript with two cards; the overtaken one came back collapsed, the trailing one answerable — **identical across two reloads**, with nothing about answered-ness in the replay |
| R12 | Collapses immediately on submit; second submit is a no-op                | Pass   | Browser + jsdom (`sendMessage` called exactly once)                                                                                                                                                                                    |
| R13 | Streaming not blocked — sibling blocks still render                      | Pass   | The turn's text message rendered alongside the card                                                                                                                                                                                    |
| R14 | Long strings wrap without pushing the layout open                        | Pass   | Wide 961px and narrow 343px: no horizontal overflow on card, shell, or document                                                                                                                                                        |
| R15 | Locale switches the chrome; questions stay untranslated                  | Pass   | zh-TW → en-US flipped submit / other / skip hint / `Answered`; the backend question text was unchanged                                                                                                                                 |
| R16 | Legacy `message.text` fallback intact                                    | Pass   | `git diff` shows the `default` branch untouched; the wire carries the prose in both `text` and `template.text`                                                                                                                         |
| R17 | (Smoke) build + Vitest + demo walkthrough                                | Pass   | build green; core 196 / react 217 (+29)                                                                                                                                                                                                |

### §3.1 Acceptance

- [x] Every R# executed (static read + browser operation + boundary conditions)
- [x] Each R# marked with its evidence
- [x] No e2e spec exists for this SDK; Vitest + demo used instead
- [x] Boundary conditions confirmed: empty answer set, whitespace-only free text, all-cleared picks,
      double submit, card as last message, multiple historical cards, extreme string length

**Verification quality note.** Two false passes were caught and corrected during this review rather than
being reported as green: (a) the first §1.2 grep run silently scanned nothing, fixed with a positive
control; (b) `packages/core/dist` initially lacked `QuestionMessageTemplate` — an nx cache artifact, not
a defect; a `--skip-nx-cache` rebuild showed the type and the union entry present. Separately, the
BUILD stage mutation-tested the collapse assertions (removing the DOM-absence branch fails R9 + R12).

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

None.

---

## Execution Log

- 2026-08-12: REVIEW task created, paired with BUILD-052 (Status: `draft`).
- 2026-08-12: §1 Static review — 19/19 checklist items ✅; 7 greps clean (with a positive control after
  an initial false pass); typecheck / lint / build green; one format:check failure found and fixed.
- 2026-08-12: §3 Functional validation — R1–R17 all Pass. 0 BLOCKERs (Status: `ready → done`).
