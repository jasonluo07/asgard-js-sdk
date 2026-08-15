# BUILD-063 Close the error bubble follow-ups

## Meta

- Task ID: `BUILD-063`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/417`
- Source spec: issue body (internal ticket — loose ends from PR #412 / #416, found by an independent review)
- Complexity: `M`

---

## Brief

Seven small follow-ups left by the error-bubble work (#412 / #416), six of them inside
`hint-template.tsx` / `hint-template.module.scss` and one in the react-demo route. Three are stale or
unverified comments, two are sizing / clamping decisions that were made for a payload that has since
changed, one is an a11y gap on the `Show more` toggle, and one is unreachable SCSS. Nothing here changes
what a consumer sees today except items 2 and 4, both of which make the bubble show _more_ of what it
already holds.

**Already exists:** `packages/react/src/components/templates/hint-template/` (`ErrorHint`, `isPresent`,
the `.error_*` SCSS block), `apps/react-demo/src/app/routes/error-details/` (four seeded cases),
`packages/react/src/components/templates/thinking-block/` (the sibling toggle named in item 5).

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                    |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                               |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                         |
| §1.4 | No hardcoded API key / endpoint / namespace — pass via `config`                                                |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup) |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only      |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                 |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`          |
| §2.3 | Template type + enum exist before the react component                                                          |
| §2.4 | Use `botProviderEndpoint`, not the deprecated `endpoint`                                                       |
| §3.1 | Exported functions / methods declare explicit return types                                                     |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                            |
| §4.1 | React component props fully typed (no `any`)                                                                   |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context                              |
| §4.4 | `react` / `react-dom` stay peerDependencies (not bundled)                                                      |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                          |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                        |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME               |

**Task-specific:** items 1 / 3 are comment corrections — §7's "no dead commented code" extends to comments
that describe code that no longer exists. Item 6 removes unreachable SCSS that the issue deliberately left
in place until it was tracked; it is tracked now.

---

## Measured starting state

Read live from `/error-details` in the react-demo with all three toggles expanded (11px / 15.95px line
height, `max-height: 160px` → 10 visible lines):

| demo case       | JSON lines | wrapped lines | height needed | what falls below the fold           |
| --------------- | ---------- | ------------- | ------------- | ----------------------------------- |
| `err-full`      | 12         | 14            | 223px         | `location` tail + closing braces    |
| `err-long`      | 12         | 17            | 271px         | `inner`, `location`, closing braces |
| `err-nomessage` | 12         | 12            | 191px         | `location` tail + closing braces    |

`message` alone wraps to 3 lines in `err-full` and 6 in `err-long`; `location` is 6 lines with all four
fields `""` in every case. That is the crowding item 2 describes, quantified.

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a developer reads the `.error_inner` comment, the system shall describe what the element
  actually holds (`JSON.stringify(details, null, 2)`, newlines escaped to literal `\n`) and record that a
  multi-line stack now renders as one long line — the trade #412 §2 chose on purpose. → T1
- `R2` When an error's details are expanded, `.error_inner` shall cap at **280px** (was 160px) so all three
  seeded demo cases render without scrolling, while a multi-kilobyte `inner` still scrolls inside the
  bubble. `message` **stays** in the dump — the dump's purpose is one blob to paste into a ticket, and
  dropping a field to save three lines works against that. → T2
- `R3` When a developer reads the `location` comment in `hint-template.tsx`, it shall say only what the
  fixtures show and shall state plainly that real `asgard.run.error` traffic was never checked, naming the
  consequence if the assumption is wrong (`hasDetails` always true → the no-toggle branch is dead in
  production). Softened rather than confirmed: the issue offers both, and confirming needs traffic we
  cannot reliably provoke. → T3
- `R4` When the details region is expanded, the summary shall no longer be clamped to two lines; while
  collapsed it shall still clamp to two, per #412 §3. → T4
- `R5` When a screen-reader user meets a thread containing several expandable blocks, each toggle shall be
  distinguishable and shall point at the region it controls. Applies to **both** `hint-template`'s
  `Show more` (add `aria-controls` + an accessible name carrying its error summary) and `thinking-block`'s
  header and inner `show more` (which today carry no `aria-expanded` at all). → T5
- `R6` When the stylesheet is inspected, the unreachable `.hint_root__error` rule shall be gone and no
  other rule shall have lost its selector. → T6
- `R7` When a developer reads the `err-nomessage` note in the demo route, it shall also mention that the
  case carries `traceId: 'trace-nomessage'` and therefore renders a toggle too. → T7
- `R8` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and walks
  `/error-details` in the react-demo, all four seeded cases shall render as their notes describe, with no
  build errors and no regression to the collapsed bubble. → T9

---

## Implementation Tasks

- [x] T1 (R1): Rewrite the `.error_inner` comment in `hint-template.module.scss`.
- [x] T2 (R2): Raise `.error_inner`'s `max-height` to 280px; leave the dump's field set alone.
- [x] T3 (R3): Soften the `location` comment in `hint-template.tsx`.
- [x] T4 (R4): Make `-webkit-line-clamp` conditional on the collapsed state (class toggled from
      `ErrorHint`'s `open`).
- [x] T5 (R5): `hint-template.tsx` — `useId`-derived `aria-controls` on the toggle pointing at the details
      region, plus an accessible name that includes the error summary. `thinking-block.tsx` — same
      treatment for the header button and the inner `show more`, both of which lack `aria-expanded`.
- [x] T6 (R6): Delete the unreachable `.hint_root__error` block.
- [x] T7 (R7): Correct the `err-nomessage` note in `error-details.tsx`.
- [x] T8: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck` +
      `npm run build:core && npm run build:react` + `npm run test:packages`.
- [x] T9 (R8): Smoke check — walk `/error-details`, re-measure the expanded dump heights, confirm the
      collapsed bubble is unchanged and the toggle exposes the right a11y attributes.

---

## Coverage

Use Cases: `R1` `R2` `R3` `R4` `R5` `R6` `R7` `R8`

Files (all `@asgard-js/react` + one demo route; `@asgard-js/core` untouched):

- `packages/react/src/components/templates/hint-template/hint-template.tsx` — softened `location` comment
  (R3), `error_hint_summary__clamped` applied only while collapsed (R4), `useId` + `aria-controls` +
  summary-bearing `aria-label` on the toggle (R5)
- `packages/react/src/components/templates/hint-template/hint-template.module.scss` — rewritten
  `.error_inner` comment (R1), cap 160px → 280px (R2), clamp split into a modifier (R4), dead
  `.hint_root__error` removed (R6)
- `packages/react/src/components/templates/hint-template/hint-template.spec.tsx` — five queries repointed
  at the new accessible name, **+2 tests** pinning the a11y contract and the conditional clamp
- `packages/react/src/components/templates/thinking-block/thinking-block.tsx` — `aria-expanded` on the
  header (it had none), `aria-controls` on header and inner `show more` (R5)
- `packages/react/src/components/templates/thinking-block/thinking-block.spec.tsx` — **new**, 3 tests
- `apps/react-demo/src/app/routes/error-details/error-details.tsx` — `err-nomessage` note (R7)

---

## Verification

**Static** — `npm run lint:packages` 0 errors, `npm run format:check` clean, `npm run typecheck` 3/3,
`build:core` + `build:react` green, `npm run test:packages` **60 files / 546 tests** (core 13/250,
react 47/296; +1 file / +5 tests).

**Browser** — react-demo, Chrome DevTools, attributes and geometry read live after a cache-ignoring reload:

| R#  | How verified                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Result |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| R1  | Comment read back against the code it describes                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Pass   |
| R2  | `/error-details`, all three toggles open: computed `max-height: 280px`; needed 223 / 271 / 191px, `scrollHeight === clientHeight` on all three (**no scrolling**). A 4000-char `inner` injected into one `<pre>` gave needed 1148px / visible 280px / `scrolls: true` — the cap still bounds a huge payload                                                                                                                                                                                                        | Pass   |
| R3  | Comment now states the fixture-only basis and the consequence if it is wrong                                                                                                                                                                                                                                                                                                                                                                                                                                       | Pass   |
| R4  | Same route: the three expanded summaries lost the `__clamped` class; the long one grew 39px → 117px. `err-bare` (no toggle, never expanded) keeps the clamp                                                                                                                                                                                                                                                                                                                                                        | Pass   |
| R5  | `/error-details`: 3 toggles, all `aria-label`s distinct, `aria-controls` absent while collapsed (no dangling IDREF) and resolving to a live element once open, visible text still "Show more". `/all-features-wide`: the thinking header now reports `aria-expanded` false → true with a resolving `aria-controls`; the a11y tree shows it as `expandable`, which it was not before. The inner `show more` needs >160 chars, which the demo transcript never reaches — pinned in `thinking-block.spec.tsx` instead | Pass   |
| R6  | `grep -rn 'hint_root__error' packages apps` → no match; no other selector lost                                                                                                                                                                                                                                                                                                                                                                                                                                     | Pass   |
| R7  | Demo note now names the `traceId` and explains why the case still shows a toggle                                                                                                                                                                                                                                                                                                                                                                                                                                   | Pass   |
| R8  | Four seeded cases walked; collapsed bubble unchanged, build green                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Pass   |

**Note on the changed test expectations.** Four existing tests queried the toggle by the exact accessible
name `Show more`. That name is precisely what item 5 called broken — every bubble exposed the identical
string — so the assertions were repointed at `/^Show more:/` rather than the fix being bent to keep them
passing. Two new tests pin the stronger contract (two bubbles → distinct names, `aria-controls` resolves).

---

## Execution Log / Change Log

- 2026-08-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/417 (Status: `draft`).
- 2026-08-15: Three open decisions settled with the user — keep `message` in the dump and raise the cap to
  280px (item 2); soften rather than confirm the `location` comment (item 3); fix `thinking-block`'s a11y in
  the same task (item 5). Implementation started (Status: `draft → in-progress`).
- 2026-08-15: All R1–R8 verified; lint / format / typecheck / build / test green; browser walk on
  `/error-details` and `/all-features-wide` (Status: `in-progress → done`).
