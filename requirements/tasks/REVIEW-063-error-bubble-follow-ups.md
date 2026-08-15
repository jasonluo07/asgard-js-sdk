# REVIEW-063 Review: close the error bubble follow-ups

## Meta

- Task ID: `REVIEW-063`
- Status: `done`
- BUILD Task: `BUILD-063`
- Reviewed commit: `3b6dea4`
- Reviewed branch: `fix/417-error-bubble-follow-ups`

---

## §1 Static Code Review

Scope = the six files in `BUILD-063 ## Coverage`. `lint` / `typecheck` / `build` run project-wide.

### §1.1 Checklist

| Check item                                                              | Rule                           | Result                                                                                                                                                                            |
| ----------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                                                        | FRONTEND_RULE_COMMON §1.1      | ✅ — the two `as string` casts in the specs narrow a nullable DOM attribute, not `any`                                                                                            |
| `@ts-ignore` / `@ts-nocheck` / `eslint-disable` used to bypass errors   | FRONTEND_RULE_COMMON §1.2      | ✅                                                                                                                                                                                |
| `console.log` left in library code                                      | FRONTEND_RULE_COMMON §1.3 §7   | ✅                                                                                                                                                                                |
| Hardcoded API key / endpoint / namespace                                | FRONTEND_RULE_COMMON §1.4      | ✅                                                                                                                                                                                |
| RxJS subscription / EventSource / timer teardown                        | FRONTEND_RULE_COMMON §1.5      | ✅ n/a — no subscription touched                                                                                                                                                  |
| `@asgard-js/react` imports core via its public entry only               | FRONTEND_RULE_COMMON §1.6      | ✅                                                                                                                                                                                |
| `@asgard-js/core` free of `react` / `react-dom` / DOM                   | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅ core untouched                                                                                                                                                                 |
| Public API change goes through `@deprecated`                            | FRONTEND_RULE_COMMON §1.7      | ✅ — no exported signature changed; see Minor 1 for the behaviour delta                                                                                                           |
| New public types / functions / components exported from the entry       | FRONTEND_RULE_COMMON §2.2      | ✅ n/a — nothing new is public                                                                                                                                                    |
| Message-template prerequisites (type + enum before component)           | FRONTEND_RULE_COMMON §2.3      | ✅ n/a — no template added                                                                                                                                                        |
| Uses `botProviderEndpoint`, not `endpoint`                              | FRONTEND_RULE_COMMON §2.4      | ✅ demo route already used it                                                                                                                                                     |
| Exported functions declare explicit return types                        | FRONTEND_RULE_COMMON §3.1      | ✅ (`thinking(): ConversationThinkingMessage` in the new spec)                                                                                                                    |
| Shared types centralized; no duplicate interfaces                       | FRONTEND_RULE_COMMON §3.2      | ✅ no new type                                                                                                                                                                    |
| React component props fully typed                                       | FRONTEND_RULE_COMMON §4.1      | ✅ props untouched                                                                                                                                                                |
| Hardcoded color values in components                                    | FRONTEND_RULE_COMMON §4.2      | ✅ — `git diff main...HEAD` adds no colour value; see §1.2                                                                                                                        |
| `react` / `react-dom` stay peerDependencies                             | FRONTEND_RULE_COMMON §4.4      | ✅ unchanged                                                                                                                                                                      |
| core / react version parity                                             | FRONTEND_RULE_COMMON §5        | ✅ both `0.3.66`, untouched by this task                                                                                                                                          |
| Repeated logic (≥2×) / JSX (≥3×) extracted                              | FRONTEND_RULE_COMMON §6        | ✅ — the `useId` + `aria-controls` shape repeats twice across two different components; not extracted, since a shared hook for two attributes would be indirection without payoff |
| `setTimeout` mock delays / commented dead code / untracked TODO / FIXME | FRONTEND_RULE_COMMON §7        | ✅ — item 6 removed the one piece of dead code this file had                                                                                                                      |

**19 ✅ / 0 ❌.**

### §1.2 Mechanical Grep

Scoped to the Coverage files; the two §1.6 greps run over the whole package as the rule specifies.

```
### any / as any            (no output)
### ts-ignore / eslint-disable  (no output)
### console.log             (no output)
### core imports react      (no output)
### react deep-imports core (no output)
### setTimeout              (no output)
### TODO / FIXME            (no output)

### hardcoded colors (#hex | rgba)
hint-template.module.scss:9,54,80,82,87,110,130   — all pre-existing
(the remaining hits are `#412` / `#415` / `#416` / `#417` issue references in comments, not colours)

### diff-scoped recheck
git diff main...HEAD -- packages apps | grep '^+' | grep -E 'rgba\(|: *#[0-9a-fA-F]{3,6}'
  → no output ("OK: no colour value added")

### R6 — the dead rule is gone
grep -rn 'hint_root__error' packages apps   → no match
```

### §1.3 Build / Lint / Format

```
lint:packages: PASS — 0 errors (the 5 pre-existing `no-new-func` warnings in
               canvas-runtime-behavior.spec.ts and siblings are untouched)
format:check:  PASS — all matched files
typecheck:     PASS — 3/3 projects (core + react + react-demo)
build:         PASS — build:core and build:react both green
test:packages: PASS — 60 files / 546 tests (core 13/250, react 47/296; +1 file / +5 tests)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅/❌
- [x] All ❌ violations listed with file path and line number — none
- [x] All §1.2 grep commands run and output pasted
- [x] `npm run typecheck` run — no TypeScript errors
- [x] `npm run lint:packages` run — no ESLint errors
- [x] `npm run build:core && npm run build:react` green

**0 BLOCKERs.**

---

## §3 Functional Validation

`Coverage.Use Cases` = `R1`–`R8`, so §3 runs. Harness: Vitest for the two a11y contracts and the clamp,
react-demo at http://localhost:4200 with attributes and geometry read live through Chrome DevTools after a
cache-ignoring reload.

### R# Result Matrix

| R#  | Description                                            | Result | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `.error_inner` comment matches what the element holds  | Pass   | Now names `JSON.stringify(details, null, 2)`, the `\n` escaping, and records #412 §2's deliberate trade                                                                                                                                                                                                                                                                                                                                                        |
| R2  | Cap 280px — demo cases fit, huge payloads still scroll | Pass   | Computed `max-height: 280px`; needed 223 / 271 / 191px with `scrollHeight === clientHeight` on all three (no scrolling). A 4000-char `inner` injected into one `<pre>`: needed 1148px, visible 280px, `scrolls: true`                                                                                                                                                                                                                                          |
| R3  | `location` comment claims nothing unobserved           | Pass   | States the fixture-only basis and spells out the consequence (`hasDetails` always true → no-toggle branch dead in production)                                                                                                                                                                                                                                                                                                                                  |
| R4  | Clamp only while collapsed                             | Pass   | The three expanded summaries lost `__clamped`; the long one grew 39px → 117px. `err-bare` (no toggle) keeps it. Pinned by a new Vitest                                                                                                                                                                                                                                                                                                                         |
| R5  | Toggles distinguishable and pointing at their region   | Pass   | `/error-details`: 3 toggles, `aria-label`s all distinct, `aria-controls` absent while collapsed (no dangling IDREF) and resolving once open, visible text still "Show more". `/all-features-wide`: thinking header now `aria-expanded` false→true with a resolving `aria-controls`, and the a11y tree reports it `expandable` — it did not before. Inner `show more` needs >160 chars, absent from the demo transcript, so pinned in `thinking-block.spec.tsx` |
| R6  | Dead `.hint_root__error` gone, no selector lost        | Pass   | `grep` clean; `error-bubble-theming.spec.ts` (2 tests) still green                                                                                                                                                                                                                                                                                                                                                                                             |
| R7  | Demo note completed                                    | Pass   | Now names the `traceId` and why the case still shows a toggle                                                                                                                                                                                                                                                                                                                                                                                                  |
| R8  | (Browser smoke test) four seeded cases walked          | Pass   | Collapsed bubble unchanged; build green                                                                                                                                                                                                                                                                                                                                                                                                                        |

### §3.1 Acceptance

- [x] All R# executed (Step 1 static read + Step 2 browser / Vitest + Step 3 boundary conditions)
- [x] Each R# marked Pass / Fail / Blocked with explanation
- [x] Boundary conditions confirmed — collapsed vs expanded, no-toggle case, streaming vs completed
      thinking, an oversized payload, and the dangling-IDREF edge on both components

**0 BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **Four existing tests were changed, not just added to.** They queried the toggle by the exact
   accessible name `Show more` — which is the defect item 5 reports — so they encoded the broken
   behaviour. They now match `/^Show more:/`. Worth flagging explicitly because "the fix changed existing
   assertions" is normally a smell; here the assertions were the thing being fixed.
2. **`aria-controls` is conditional on the open state** in both components, because each unmounts its
   region when collapsed. That is correct (a dangling IDREF is worse than an absent attribute) but means a
   collapsed toggle tells assistive tech only _that_ it expands, not _what_. Rendering the region always
   and hiding it with `hidden` would allow an unconditional `aria-controls`; not done, since it would mount
   the JSON dump for every error bubble in a thread whether or not anyone opens it.
3. **Item 3 was softened, not confirmed** (the user's call). If real `asgard.run.error` traffic is ever
   captured, the `location` comment and the `does not count an all-blank nested object as a detail` test
   should both be revisited — the comment now says so in place.

---

## Execution Log

- 2026-08-15: REVIEW task created, paired with BUILD-063 (Status: `draft`).
- 2026-08-15: BUILD-063 reached `done`; §1 static review started (Status: `ready → in-progress`).
- 2026-08-15: §1 complete — 19 ✅ / 0 ❌; lint 0 errors, format clean, typecheck 3/3, build green, tests
  60 files / 546 pass. §3 complete — R1–R8 all Pass. 0 BLOCKERs; 3 Minor notes recorded
  (Status: `in-progress → done`).
