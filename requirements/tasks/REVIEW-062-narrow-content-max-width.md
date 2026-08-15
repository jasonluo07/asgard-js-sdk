# REVIEW-062 Review: narrow the default content column to a readable measure

## Meta

- Task ID: `REVIEW-062`
- Status: `done`
- BUILD Task: `BUILD-062`
- Reviewed commit: `0692ff3`
- Reviewed branch: `fix/54-narrow-content-max-width`

---

## §1 Static Code Review

Scope = the eight files in `BUILD-062 ## Coverage`. `lint` / `typecheck` / `build` run project-wide.

### §1.1 Checklist

| Check item                                                              | Rule                           | Result                                                                      |
| ----------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `any` / `as any`                                                        | FRONTEND_RULE_COMMON §1.1      | ✅                                                                          |
| `@ts-ignore` / `@ts-nocheck` / `eslint-disable` used to bypass errors   | FRONTEND_RULE_COMMON §1.2      | ✅                                                                          |
| `console.log` left in library code                                      | FRONTEND_RULE_COMMON §1.3 §7   | ✅                                                                          |
| Hardcoded API key / endpoint / namespace                                | FRONTEND_RULE_COMMON §1.4      | ✅                                                                          |
| RxJS subscription / EventSource / timer teardown                        | FRONTEND_RULE_COMMON §1.5      | ✅ n/a — no subscription touched                                            |
| `@asgard-js/react` imports core via its public entry only               | FRONTEND_RULE_COMMON §1.6      | ✅                                                                          |
| `@asgard-js/core` free of `react` / `react-dom` / DOM                   | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅ core untouched                                                           |
| Public API change goes through `@deprecated`                            | FRONTEND_RULE_COMMON §1.7      | ✅ — no signature change; see Minor 1                                       |
| New public constant exported from the package entry                     | FRONTEND_RULE_COMMON §2.2      | ✅ `DEFAULT_CONTENT_MAX_WIDTH` via `context/index.ts` → `src/index.ts`      |
| Message-template prerequisites (type + enum before component)           | FRONTEND_RULE_COMMON §2.3      | ✅ n/a — no template added                                                  |
| Uses `botProviderEndpoint`, not `endpoint`                              | FRONTEND_RULE_COMMON §2.4      | ✅ n/a                                                                      |
| Exported functions declare explicit return types                        | FRONTEND_RULE_COMMON §3.1      | ✅ (`resolve(): AsgardThemeContextValue`, `Probe(): ReactNode` in the spec) |
| Shared types centralized; no duplicate interfaces                       | FRONTEND_RULE_COMMON §3.2      | ✅ no new type                                                              |
| React component props fully typed                                       | FRONTEND_RULE_COMMON §4.1      | ✅ props untouched                                                          |
| Hardcoded color values in components                                    | FRONTEND_RULE_COMMON §4.2      | ✅ — this change adds none; see §1.2 note                                   |
| `react` / `react-dom` stay peerDependencies                             | FRONTEND_RULE_COMMON §4.4      | ✅ unchanged                                                                |
| core / react version parity                                             | FRONTEND_RULE_COMMON §5        | ✅ both `0.3.66`, untouched by this task                                    |
| Repeated constant (≥3×) extracted                                       | FRONTEND_RULE_COMMON §5.2 §6   | ✅ — this is the task: six `1200px` literals → 1 TS constant + 1 Sass var   |
| `setTimeout` mock delays / commented dead code / untracked TODO / FIXME | FRONTEND_RULE_COMMON §7        | ✅                                                                          |

**19 ✅ / 0 ❌.**

### §1.2 Mechanical Grep

Scoped to the Coverage files (four `.ts(x)`, three `.scss`); the two §1.6 greps run over the whole package as
the rule specifies.

```
### any / as any
(no output)

### ts-ignore / ts-nocheck / eslint-disable
(no output)

### console.log
(no output)

### core imports react / react-dom   (over packages/core/src/)
(no output)

### react deep-imports core internals (@asgard-js/core/src | core/src/lib, over packages/react/src/)
(no output)

### setTimeout
(no output)

### TODO / FIXME
(no output)

### hardcoded colors (#hex | rgba)
packages/react/src/context/asgard-theme-context.tsx:75,116,222,249,256,503,859,861,877,887,893,912,921,931,970,981
```

The colour hits are all **pre-existing** and all in JSDoc / explanatory comments, plus the `isHex` →
`color-mix` derivation at lines 859/861 that BUILD-039 / BUILD-049 put there deliberately. The diff for this
commit introduces no colour literal, so §4.2 passes for the change under review.

```
### BUILD-062 specific — no stale content-column literal survives
grep -rn '1200px' packages/react/src packages/core/src
  _variables.scss:5              (pre-existing $chat-gutter comment: "700–1200px panels")
  _variables.scss:28             (why-this-number comment)
  content-max-width.spec.tsx:13  (why-this-number comment)
  asgard-theme-context.tsx:231   (why-this-number comment)
```

No rule or style declaration carries the literal any more — comments only. ✅

### §1.3 Build / Lint / Format

```
lint:packages: PASS — 0 errors, 5 warnings (all pre-existing `no-new-func` in
               canvas-runtime-behavior.spec.ts and siblings, untouched by this task)
format:check:  PASS for every tracked file. The one [warn] is `consent-flow.html`, an untracked
               scratch file at the repo root that predates this branch and is outside Coverage
               (see Minor 3)
typecheck:     PASS — 3/3 projects (core + react + react-demo)
build:         PASS — build:core and build:react both green
test:packages: PASS — 59 files / 541 tests (core 13/250, react 46/291; +1 file / +2 tests)
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

`Coverage.Use Cases` = `R1`–`R6`, so §3 runs. Harness: Vitest for the theme-merge contract, react-demo at
http://localhost:4200 with live computed styles read through Chrome DevTools (hard reload, cache ignored).

### R# Result Matrix

| R#  | Description                                                             | Result | Note                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Default cap is 800px on thread / docked strip / composer                | Pass   | `/all-features-wide` @ 1440px: all three report computed **and** inline `max-width: 800px`, rect 800px, left 342 → right 1142 — one centred axis, all three identical                                                                                                          |
| R2  | Consumer `contentMaxWidth` override still wins verbatim                 | Pass   | `content-max-width.spec.tsx` — `{ chatbot: { contentMaxWidth: '1440px' } }` resolves to `'1440px'`; the same spec pins the no-override case to `DEFAULT_CONTENT_MAX_WIDTH`. 2/2 green                                                                                          |
| R3  | Column < 800px unaffected; `$chat-gutter` unchanged at every width      | Pass   | Same route @ 500px window: column 408px (cap inert — not clamped), gutter 16.31px = the `max(16px, …)` floor, `chat_header` padding identical so the alignment line holds, no horizontal overflow. `/all-features` default 375×640 shell unchanged (375px column, 16px gutter) |
| R4  | SCSS and inline default agree; no `1200px` left in `packages/react/src` | Pass   | See §1.2. Both languages read one named constant: `DEFAULT_CONTENT_MAX_WIDTH` (3 call sites) and `$chat-content-max-width` (3 call sites)                                                                                                                                      |
| R5  | README default-theme block documents `'800px'`                          | Pass   | `packages/react/README.md:507` — `contentMaxWidth: '800px', // exported as DEFAULT_CONTENT_MAX_WIDTH`                                                                                                                                                                          |
| R6  | (Browser smoke test) wide + narrow walk, measured chars/line            | Pass   | Text box 736px; average glyph 9.23px at 16px Space Grotesk → **80 English characters per line**, inside the 45–90 band. Same page, same font, at the old 1200px cap: **123**. Re-measured under the Crazy theme — identical geometry, no token regression                      |

### §3.1 Acceptance

- [x] All R# executed (Step 1 static read + Step 2 browser / Vitest + Step 3 boundary conditions)
- [x] Each R# marked Pass / Fail / Blocked with explanation
- [x] Boundary conditions confirmed — cap inert below 800px, gutter floor at 16px, the default 375px shell and
      the wide 1440px case; no horizontal overflow at any of them

**0 BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **Release-note item, not a code defect.** No public signature changed, so §1.7 does not fire — but every
   consumer that does _not_ set `theme.chatbot.contentMaxWidth` gets a visibly narrower column on upgrade with
   no code change of its own. A post-review sweep of all five first-party consumers (see `BUILD-062 ##
Verification`) puts that at **Odin, Heimdall and the embed widget**; Sindri (`768px`) and Mimir (`896px`)
   already set their own and are unaffected — Sindri confirmed live with the packed local build. Note that
   Mimir is the product the issue measured, and it self-fixed the same day the issue was filed
   (`84d2d30`, 2026-08-06), so the issue's stated impact is now out of date. Worth one line in the release
   note; PM already approved the visual change on
   [asgard-sdk-pm#54](https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/54).
2. **`chat-header` stays full-bleed.** Measured `max-width: none` — it takes `$chat-gutter` but no cap, so the
   bot name / channel title sits at the column edge while the thread and composer centre at 800px. Pre-existing
   at 1200px and the same pattern ChatGPT / Claude use; raised with the user before the build and deliberately
   left alone. Reopen only if the header is meant to share the cap.
3. **`consent-flow.html`** at the repo root fails `format:check`. Untracked, predates this branch, unrelated to
   this task — left alone rather than swept into this commit.

---

## Execution Log

- 2026-08-15: REVIEW task created, paired with BUILD-062 (Status: `draft`).
- 2026-08-15: BUILD-062 reached `done`; §1 static review started (Status: `ready → in-progress`).
- 2026-08-15: §1 complete — 19 ✅ / 0 ❌; lint 0 errors, format clean, typecheck 3/3, build green, tests
  59 files / 541 pass. §3 complete — R1–R6 all Pass. 0 BLOCKERs; 3 Minor notes recorded
  (Status: `in-progress → done`).
