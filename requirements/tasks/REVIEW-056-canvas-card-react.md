# REVIEW-056 Review: render the canvas in a sandboxed iframe with streaming morph

## Meta

- Task ID: `REVIEW-056`
- Status: `done`
- BUILD Task: `BUILD-056`
- Reviewed commit: `88d683ee`
- Reviewed branch: `feat/66-canvas-card`
- Harness: Playwright **headed** Chromium (`headless=False`) against react-demo on `:4201`.
  Per BUILD-056 no R# is claimed from headless output.

---

## §1 Static Code Review

Scope: the files listed in BUILD-056 `## Coverage`.

### §1.1 Checklist

| Check item                                                            | Rule    | Result | Evidence                                                                                                                            |
| --------------------------------------------------------------------- | ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                                                      | §1.1    | ✅     | grep empty                                                                                                                          |
| `@ts-ignore` / `eslint-disable` bypassing type or lint errors         | §1.2    | ✅     | only a prose mention in `canvas-template.tsx:42`; no directive. The known `no-new-func` warning is left unsuppressed                |
| `console.log` in library code                                         | §1.3 §7 | ✅     | grep empty                                                                                                                          |
| Hardcoded API key / endpoint / namespace                              | §1.4    | ✅     | demo endpoint derives from `window.location.origin`                                                                                 |
| Teardown for subscriptions / observers / listeners                    | §1.5    | ✅     | `observer.disconnect()` (`canvas-template.tsx:73`), `removeEventListener` (`:95`); in-frame `ResizeObserver` dies with the document |
| `@asgard-js/react` imports core via the public entry only             | §1.6    | ✅     | grep for `@asgard-js/core/src` empty                                                                                                |
| `@asgard-js/core` imports react / react-dom / DOM                     | §1.6    | ✅     | grep over `packages/core/src/` empty                                                                                                |
| Breaking public-API change without `@deprecated`                      | §1.7    | ✅     | additive only (new export)                                                                                                          |
| New public types / components exported from the package entry         | §2.2    | ✅     | verified in the **built** `dist/components/templates/index.d.ts` → `export * from './canvas-template'`                              |
| Template type + enum exist before the react component                 | §2.3    | ✅     | landed in BUILD-055 (`6d16bd79`)                                                                                                    |
| `botProviderEndpoint` rather than `endpoint`                          | §2.4    | ✅     | `canvas-card.tsx:18`                                                                                                                |
| Explicit return types on exported functions                           | §3.1    | ✅     | `buildCanvasSrcDoc(): string`, `resolveCanvasTheme(): ResolvedCanvasTheme`, `CanvasTemplate(): ReactNode`, cleanups `(): void`      |
| Shared types centralized; no duplicate interfaces                     | §3.2    | ✅     | `ResolvedCanvasTheme` declared once                                                                                                 |
| React component props fully typed                                     | §4.1    | ✅     | `CanvasTemplateProps`                                                                                                               |
| Hardcoded color values in components                                  | §4.2    | ⚠️     | see Minor 1–3 — grep-positive but on-convention / structurally required                                                             |
| `react` / `react-dom` stay peerDependencies                           | §4.4    | ✅     | unchanged                                                                                                                           |
| core and react share a version number                                 | §5      | ✅     | both `0.3.61`                                                                                                                       |
| Repeated logic / types / JSX extracted                                | §6      | ✅     | the duplicate `color: var(--asg-color-text-primary, …)` on `.head` was folded into `.card`                                          |
| `setTimeout` mock delays / dead commented code / untracked TODO-FIXME | §7      | ✅     | one `setTimeout` in `sse-mock.ts:33` — the demo mock's stream pacing, not shipped code                                              |

### §1.2 Mechanical Grep

Scanned the eight `## Coverage` paths.

> **Harness note.** The first pass of these greps passed the path list as one unquoted zsh variable,
> which zsh does not word-split — every command scanned a single non-existent path and returned empty,
> i.e. five ✅ that meant nothing. Re-run under `bash` with an array. Treat an all-empty grep sweep as
> suspect until at least one command in it produces a known-positive hit.

```
# §1.1 any / as any                    → (empty)  ✅
# §1.2 ts-ignore / eslint-disable      → canvas-template.tsx:42  (prose only, no directive)  ✅
# §1.3 console.log                     → (empty)  ✅
# §1.6 core → react                    → (empty)  ✅
# §1.6 react → core/src                → (empty)  ✅
# §7  setTimeout                       → sse-mock.ts:33  (demo mock pacing)  ✅
# §4.2 hardcoded colors                → resolve-canvas-theme.ts:20-26 (FALLBACK_THEME)
#                                        spec-file fixtures
#                                        false positives: `#382` / `#412` issue refs   → see Minor 1–3
```

### §1.3 Build / Lint / Format

```
lint:packages:       PASS — 0 errors, 4 warnings (1 pre-existing to this task: no-new-func in
                     canvas-runtime-behavior.spec.ts, deliberately unsuppressed per BUILD-056)
format:check:        PASS
typecheck:packages:  PASS
build:core + build:react: PASS
test:packages:       PASS — core 208 / react 237 (+4: canvas-card-chrome.spec.tsx)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked
- [x] All findings listed with file path and line number
- [x] All §1.2 grep commands run and output pasted
- [x] Type check run — no TypeScript errors
- [x] Lint run — no ESLint errors

**§1 result: 0 BLOCKER**, 3 Minor.

---

## §3 Functional Validation

Harness: headed Chromium, react-demo `/canvas-card` on `:4201`, both shells. Inside-frame facts were
read through Playwright's frame handle (the host cannot — that is R5); host-side facts with page JS.

> **Harness note — the srcdoc observer.** R3 / R6 / R12 all rest on "`srcdoc` was never rewritten",
> which is only meaningful if the observer watching it actually installed. An `add_init_script` that
> calls `observe(document.documentElement, …)` throws `TypeError: parameter 1 is not of type 'Node'`
> at document-start — `documentElement` does not exist yet — and a `srcdocWrites` counter that never
> incremented is indistinguishable from one that was never wired. Three runs of this review reported
> `srcdocWrites: 0` on a dead observer before a canary caught it. The evidence below comes from
> `observe(document, …)` with `observerError: null` and `mutationsSeen: 182`.

### R# Result Matrix

| R#  | Description                                                                  | Result   | Evidence / actual vs expected                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Canvas branch renders the card; title row + drawing indicator                | **Pass** | 184/184 drawing samples carry the head **and** the pulse, label `繪製中` throughout; on complete the label becomes `資料管線現況` and the pulse is gone (`pulseAfterDone: false`). Narrow shell 147/147. Previously 0/191 — the BLOCKER-1 fix                                                                                                           |
| R2  | `sandbox="allow-scripts"`, no `allow-same-origin`, `srcdoc` only             | Pass     | `sandbox="allow-scripts"`, `hasSrc: false`, `srcdocLen: 5001`                                                                                                                                                                                                                                                                                           |
| R3  | `srcdoc` final at mount, never reassigned                                    | Pass     | Observer verified live (182 mutations): **0 srcdoc writes**; both shells' iframes were first observed **at insertion already carrying the full 5001-char document**, `sandbox="allow-scripts"`, `hasSrc: false`                                                                                                                                         |
| R4  | `default-src 'none'` CSP blocks load / exfiltration                          | Pass     | From inside the frame: `fetch` → `BLOCKED:TypeError`; external `<img>` → `BLOCKED`; `localStorage` → `SecurityError`; `parent.document` → `SecurityError`. Browser console carries the matching CSP violation reports                                                                                                                                   |
| R5  | Host reads `iframe.contentDocument` → `null`                                 | Pass     | `contentDocument: "null"`                                                                                                                                                                                                                                                                                                                               |
| R6  | postMessage + morph; never reassigns `srcdoc`                                | Pass     | 0 srcdoc writes on the live observer; SVG kept its namespace (`svg` and `svg path` both `http://www.w3.org/2000/svg`), which `createElement` would have lost                                                                                                                                                                                            |
| R7  | Fragment `<script>` runs exactly once, only after drawing ends               | Pass     | `#root[data-script-runs] === "1"`. The content channel re-posts the whole accumulated fragment on **every** delta (~349 of them), so a counter still at 1 proves both "exactly once" **and** "never mid-stream" — any non-final execution would have incremented it                                                                                     |
| R8  | In-iframe ResizeObserver reports height; card grows, capped 520px            | **Pass** | 17 distinct heights climbing 24 → 221 px from in-frame reports. **Cap now exercised** with a 723 px fragment (`「長」`): the body clamps to exactly 520 px and the overflow is reachable — a wheel over the card scrolls the frame's own document to `scrollTop 203` (= 723 − 520) and the last table row comes fully into view. No page-level overflow |
| R9  | Skeleton while fragment has arrived but nothing visible                      | Pass     | 93 samples with the skeleton up, all of them while `data-drawing="true"`, and the iframe `visibility: hidden` for exactly those 93; none after complete                                                                                                                                                                                                 |
| R10 | Theme read from computed `color` / `background-color` of real elements       | **Pass** | `--canvas-fg: rgb(255,255,255)` against `--canvas-bg: rgb(31,31,31)` — contrast **16.48:1**, up from 1.3:1. `.card` now declares its own `color`, so the computed read has a real value; the mechanism is unchanged. The BLOCKER-2 fix                                                                                                                  |
| R11 | Exactly the five `--canvas-*` tokens, resolved values, prop takes precedence | **Pass** | `:root` inside the frame declares exactly the five names and nothing else; all concrete: `fg rgb(255,255,255)`, `bg rgb(31,31,31)`, `accent rgb(71,103,235)`, `muted rgb(140,140,140)`, `border rgb(67,67,67)`                                                                                                                                          |
| R12 | Theme follows the host over its own channel, no `srcdoc` reset               | Pass     | Set `--asg-color-text-primary: rgb(240,12,34)` on `_chatbot_container_` → in-frame `--canvas-fg` followed, with `srcdocWrites: 0`, `data-script-runs` still `1` and `rootChildren` still `3` — the drawing survived and the script was not re-run. See Minor 4                                                                                          |
| R13 | `prefers-reduced-motion` drops the animations                                | Pass     | Playwright `reduced_motion="reduce"`: the pulse renders in 151/151 drawing samples with `animationName: none` (against `_canvas-pulse_183wk_1` normally). The `.pulse` clause is now genuinely exercised — under BLOCKER 1 it was vacuous                                                                                                               |
| R14 | Title comes only from `template.title`                                       | Pass     | No sample during the stream carries anything but the state label; `資料管線現況` appears at the same instant `drawing` flips to `false`. Nothing is extracted from the markup                                                                                                                                                                           |
| R15 | Build green + both widths in a headed browser                                | Pass     | Build / typecheck / lint / format / tests green; wide and narrow (card 343 px) both walked; no horizontal overflow                                                                                                                                                                                                                                      |

### Use-case walkthroughs

| UC     | Script   | Result | Evidence                                                                                                                                                                                                                            |
| ------ | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC-051 | 「畫」   | Pass   | header `繪製中` + pulse → skeleton → morph → script once → final 221 px card titled `資料管線現況`                                                                                                                                  |
| UC-052 | 「重播」 | Pass   | complete only, no deltas: card present, `drawing=false`, title shown, height **221 px — identical to the streamed path**, `data-script-runs: "1"`, `srcdocWrites: 0`                                                                |
| UC-053 | 「壞掉」 | Pass   | mid-stream 1 card (header `繪製中`, body 96 px) → after the template-less complete: **0 cards, 0 iframes**. Whole card discarded, no partial markup left                                                                            |
| UC-054 | —        | Pass   | see R4 / R5                                                                                                                                                                                                                         |
| —      | 「長」   | Pass   | 723 px fragment: body clamps to 520 px, wheel scrolls the frame to `scrollTop 203`, last row reaches full view, `data-script-runs: "1"`, no page overflow                                                                           |
| —      | 「亂寫」 | Pass   | Fragment that repeats the title, hardcodes `#2b1046`/`#ff3ea5` and leaves a `<div>` unclosed: card renders, blast radius stays inside the frame (host `document.body.children` unchanged, no page overflow), script still runs once |

### §3.1 Acceptance

- [x] All R# executed (static read + headed browser operation + boundary conditions)
- [x] Each R# marked Pass / Fail with explanation
- [x] Vitest suites run and green (core 208 / react 237)
- [x] Boundary conditions confirmed: empty (skeleton), replay-only, discard-on-failure, both widths
- [x] **0 R# Fail** — the two BLOCKERs from the previous pass are closed

---

## Findings

### Critical (must fix before done)

None. Both BLOCKERs from the 2026-08-13 pass are fixed and re-measured:

- **R1** (drawing indicator unreachable) — 0/191 → 184/184 wide, 147/147 narrow.
- **R10 / R11** (`--canvas-fg` black on the SDK's dark shell) — contrast 1.3:1 → 16.48:1.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **`resolve-canvas-theme.ts:20-26` — literal colors in `FALLBACK_THEME`.** Grep-positive under §4.2,
   but structurally required: the palette crosses into a separate document where the host's custom
   properties are invisible, so it must be concrete values (this is R10's own rule). Not a violation.
2. **`canvas-template.module.scss:72-74` — `rgba(255,255,255,…)` in the skeleton shimmer.** Matches
   existing precedent in `chart-template` and `table-template`; part of the known theme-system debt,
   not introduced by this task. The new `.card` `color` declaration uses the same
   `var(--asg-color-*, <literal>)` shape as the `border` / `background-color` beside it.
3. **~~R8's 520px cap is CSS-verified only.~~ Closed.** A 723 px fragment was added to the demo
   (`「長」`) and the cap was walked in a headed browser. Worth recording _how_ it scrolls, because it is
   not what the stylesheet suggests: the card body's `overflow-y: auto` never engages
   (`scrollHeight == clientHeight == 520` — the iframe is sized to the cap), so the scrolling happens
   **inside the iframe's own document**. By wheel and visually that is "scrolling inside the card", so
   AC13 holds; but the card body's `overflow: auto` is inert and should not be read as the mechanism.
4. **The canvas palette is decided by exactly two SDK tokens, not by the consumer's container chain.**
   Measured the ancestor walk under three chains: with the SDK default it stops **immediately at the
   card itself** (`.card` paints `--asg-color-surface`), and it still stops there when a consumer paints
   an intermediate wrapper — the wrapper is simply never reached. Only when every ancestor background is
   forcibly cleared does the walk run its full 19 hops to `<body>`. So in practice `bg` is always
   `--asg-color-surface` and `fg` always `--asg-color-text-primary`; the "walk the ancestors" loop is
   effectively dormant. That is good for predictability, and it narrows the consumer risk to a single
   failure mode: **a host that overrides one of the two tokens without the other.** The light-theme
   case above is exactly that mode — surface/bg moved, text tier did not. A host that themes text by
   setting `color` on a wrapper (rather than the token) also no longer moves the canvas; that is
   inherent, since the card declares its own `color`, and the alternative is the black-on-dark this
   cycle removed.

---

## Execution Log

- 2026-08-12: REVIEW task created, paired with BUILD-056 (Status: `draft`).
- 2026-08-13: §1 static review — 0 BLOCKER, 2 Minor. lint 0 errors / 4 warnings, format, typecheck,
  build and tests (core 208 / react 233) all green (Status: `ready → in-progress`).
- 2026-08-13: §3 functional validation in a **headed** browser across five scenarios. **13 of 15 R#
  Pass, 2 Fail.** Two BLOCKERs returned to BUILD-056: the drawing indicator is unreachable (R1) and
  `--canvas-fg` resolves to black on the SDK's own dark shell (R10 / R11).
- 2026-08-13: Re-review of `88d683ee` after both fixes. §1 re-run clean (0 errors, 3 Minor).
  §3 re-run in a headed browser over UC-051 / UC-052 / UC-053, reduced-motion and both shells:
  **15 of 15 R# Pass, 0 Fail**. Two harness defects were caught and corrected mid-review — an
  unquoted zsh path list that made five greps scan nothing, and an `add_init_script` observer that
  threw at document-start, which had silently produced `srcdocWrites: 0` on a dead counter for three
  runs. Both are recorded above so the next pass does not repeat them. One new Minor (4) records a
  measured behavior change that follows from the R10 fix (Status: `in-progress → done`).
- 2026-08-13: Gap-closing pass. Two adversarial scripts added to the demo (`「長」` 723 px, `「亂寫」`
  duplicate title + hardcoded colors + unclosed tag) and walked headed. **R8 upgraded from partial to
  Pass** — the cap is now exercised rather than inferred, and the review records that the scrolling
  happens inside the frame's document, not through the card body's `overflow: auto`. Minor 4 rewritten
  around a direct measurement of the ancestor walk under three container chains, which shows the walk
  stops at the card in every realistic case and narrows the consumer risk to "one of the two tokens
  overridden without the other". **Still unverified and not reachable from here:** a canvas authored by
  a real agent (needs a dev bot with `show_canvas` enabled plus an API key), and the card rendered
  inside a consumer app (all three consumer repos were occupied by other sessions or had uncommitted
  work, so none was touched).
- 2026-08-13: Consumer risk closed by source audit rather than by installing into the apps (all three
  consumer repos were occupied by other sessions or had uncommitted work, so none was touched). Minor 4
  narrowed the risk to "a host that overrides one of `--asg-color-surface` / `--asg-color-text-primary`
  without the other"; all three first-party consumers set **both**, and set them together per theme:
  Mimir (`src/lib/chatbot-utils.ts`) and Sindri (`src/lib/chatbot-utils.ts:156,164`) both pair
  `backgroundColor: #141414 / #fafafa` with `primaryComponent.secondaryColor: #fff / #0d0d0d`, and Odin
  (`src/utils/chat-bot.ts:12,19`) binds both to its own CSS variables (`hsl(var(--surface))` /
  `hsl(var(--text-primary))`), which cannot drift apart by construction. So the light-mode failure mode
  does not reach any shipped consumer. **What is still unverified is only the visual**: a canvas
  rendered inside a real consumer app, which needs the same dev bot + API key as the real-backend gap.
