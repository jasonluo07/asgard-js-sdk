# BUILD-056 Render the canvas in a sandboxed iframe with streaming morph

## Meta

- Task ID: `BUILD-056`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/66`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-030-畫布卡片-sandboxed-iframe-渲染與串流.md` (AC8–AC19)
- Complexity: `L`
- Depends on: `BUILD-055` (canvas events + `ConversationCanvasMessage`)

---

## Brief

Cycle 2 of F-030, **react only**. Renders the canvas state produced by BUILD-055 as a card in the
thread. The fragment is **model-generated untrusted content that may contain `<style>` and `<script>`**,
and this SDK is embedded in customers' own sites — so the iframe is not an implementation choice, it is
the security boundary (UC-054). It also streams, so the card has to grow without rebuilding its DOM.

**Already exists:** `packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx`
(the `'thinking'` branch is the shape to copy for a non-template message type),
`packages/react/src/components/templates/` (component layout + barrel), `packages/react/src/i18n.ts`,
`packages/react/src/context/asgard-theme-context.tsx`,
`references/asgard-chat-kit-prototype/src/CanvasCard.tsx` (**reference implementation**, 406 lines:
iframe + embedded runtime + hand-written morph + height reporting + theme resolution) and
`src/demo/CanvasDemo.tsx` + `src/demo/canvasMock.ts` (delta replay at measured cadence, plus the rejoin
and discard paths). The prototype is a working, browser-verified implementation — port it, do not
redesign it.

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §     | Rule (summary)                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1  | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2  | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3  | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.4  | No hardcoded API key / endpoint / namespace — pass via `config`                                                           |
| §1.5  | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)            |
| §1.6  | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7  | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2  | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §2.3  | Template type (`core/src/types/sse-response.ts`) + enum (`core/src/constants/enum.ts`) exist before the react component   |
| §2.4  | Use `botProviderEndpoint`, not the deprecated `endpoint`                                                                  |
| §3.1  | Exported functions / methods declare explicit return types                                                                |
| §3.2  | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                       |
| §4.1  | React component props fully typed (no `any`)                                                                              |
| §4.2  | No hardcoded color values in components — theme via CSS variables / theme context                                         |
| §4.4  | `react` / `react-dom` stay peerDependencies (not bundled)                                                                 |
| §5    | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                     |
| §6    | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7    | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |
| §4.3+ | UI acceptance renders both sizes side by side (375×640 default shell and the full-bleed consumer mount)                   |

---

## Acceptance Criteria

- `R1` (AC8) When a message has `type: 'canvas'`, the system shall render a `CanvasTemplate` /
  `CanvasCard` in the thread (branching like `'thinking'`), showing a title row when `template.title`
  is set and a drawing indicator while streaming. → T2
- `R2` (AC9) When the fragment is rendered, the system shall place it in
  `<iframe sandbox="allow-scripts">` with **no** `allow-same-origin` and inject content via `srcdoc`,
  with no URL or hosted file involved. → T2
- `R3` (AC9b) When the iframe mounts, its `srcdoc` shall already be final and shall never be reassigned
  afterwards — the iframe must not be mounted with a placeholder. → T2
- `R4` (AC10) When the canvas attempts to load or exfiltrate anything, a `default-src 'none'` CSP
  inside the iframe shall block it, allowing only inline style, inline script, and `data:` images and
  fonts. → T2
- `R5` (UC-054) When the host reads `iframe.contentDocument`, it shall be `null` — the boundary
  verified from the outside. → T6
- `R6` (AC11) When new content arrives, the system shall send it over `postMessage` (validated by
  `event.source === iframe.contentWindow`, because the opaque origin makes `event.origin` the string
  `"null"`) and morph it in, updating only changed nodes; it shall never reassign `srcdoc`. → T3
- `R7` (AC12) When the canvas contains `<script>`, the system shall execute it exactly once and only
  after `isDrawing === false`, cloning it into a fresh node (markup injected as `innerHTML` does not
  execute). → T3
- `R8` (AC13) When the content resizes, an in-iframe `ResizeObserver` shall report the height and the
  card shall grow to it, capped at 520px, scrolling inside the card beyond that. → T3
- `R9` (AC16) While the fragment has arrived but nothing visible exists yet, the system shall show a
  skeleton, decided by "does `#root` hold any node other than `<style>` / `<script>`" as reported from
  inside the iframe — **never** by `#root`'s height, which is non-zero when empty because of padding. → T3
- `R10` (AC14) When resolving the theme, the system shall read the **computed `color` /
  `background-color` of real elements** (walking ancestors for the first non-transparent background),
  never guessing custom-property names and never writing `var(--fg)` inside the iframe. → T4
- `R11` (AC19) When injecting the palette, the system shall provide exactly `--canvas-fg`,
  `--canvas-bg`, `--canvas-accent`, `--canvas-muted`, `--canvas-border` as resolved color values —
  **these five names are a contract with `asgard-core#190`'s tool description**; `accent` / `muted` /
  `border` come from a hidden probe element resolved by the browser, falling back to `currentColor`
  when every candidate is absent. A host-supplied prop takes precedence. → T4
- `R12` (AC18) When the host switches theme, the canvas shall follow via its own postMessage channel
  that rewrites the in-iframe `<style>`, **without** reassigning `srcdoc`; the observed target shall be
  the card's ancestor chain, not `documentElement`. → T4
- `R13` (AC15) When `prefers-reduced-motion` is set, the drawing indicator and height transition shall
  drop their animation. → T2
- `R14` (AC17) When a title is shown, it shall come only from `template.title`; the system shall not
  extract a title from the markup. → T2
- `R15` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and exercises
  the new react-demo route in a **headed** browser at both widths, the system shall satisfy R1–R14 with
  no build errors. → T7

> **Verification is headed-only for R1–R9.** The prototype recorded nine passing headless scenarios
> across three engines while every real user saw a blank card: a headed browser does **not** re-navigate
> when `srcdoc` is reassigned after mount, so the iframe stays on empty `about:blank`. Headless
> navigates obediently and hides the defect. Any R# claimed from headless output alone is not evidence.

---

## Implementation Tasks

- [ ] T1: Read `references/asgard-chat-kit-prototype/src/CanvasCard.tsx` in full before writing code;
      it already encodes every pitfall listed in the spec.
- [ ] T2 (R1–R4, R13, R14): `components/templates/canvas-template/` — card chrome (title row, drawing
      indicator, reduced-motion), the iframe with sandbox + CSP, `srcdoc` assembled **before** mount;
      renderer branch for `type: 'canvas'`; barrel export.
- [ ] T3 (R6–R9): the in-iframe runtime as an inlined string — postMessage receiver with
      `event.source` validation, hand-written morph that **moves** parsed nodes (so the browser parser
      keeps SVG namespaces; `createElement` would break them), deferred single script execution,
      `ResizeObserver` height reporting, and the skeleton signal.
- [ ] T4 (R10–R12): theme resolution from computed styles + the hidden probe, the five-token palette,
      and the theme postMessage channel with an ancestor-chain observer.
- [ ] T5: i18n keys for the card chrome (`canvas.*`) across `en-US` / `zh-TW` / `ja-JP`.
- [ ] T6 (R5): assert `iframe.contentDocument === null` from the host, plus a CSP-blocked fetch attempt.
- [ ] T7 (R15): new react-demo route replaying deltas at the measured cadence (prototype `canvasMock.ts`),
      including the rejoin (complete-only) and discard paths; both shells side by side per §4.3+; walk
      every R# in a **headed** browser; screenshots to `.github/screenshots/`.
- [ ] T8: `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run build:core && npm run build:react` + `npm run test:packages`.

---

## Coverage

Use Cases: UC-051 / UC-052 / UC-053 / UC-054. R1–R15.

Files:

**`@asgard-js/react`**

- `packages/react/src/components/templates/canvas-template/canvas-runtime.ts` (new) — the in-iframe
  runtime string (morph / deferred script / height + visibility reporting / theme channel) and
  `buildCanvasSrcDoc` (CSP + palette)
- `packages/react/src/components/templates/canvas-template/canvas-runtime.spec.ts` (new, 6 cases) —
  srcdoc contract
- `packages/react/src/components/templates/canvas-template/canvas-runtime-behavior.spec.ts` (new, 10
  cases) — the runtime executed against a jsdom document
- `packages/react/src/components/templates/canvas-template/canvas-card-chrome.spec.tsx` (new, 4 cases) —
  the card chrome contract: drawing indication while streaming, title on complete, localized (R1 / R14)
- `packages/react/src/components/templates/canvas-template/resolve-canvas-theme.ts` (new)
- `packages/react/src/components/templates/canvas-template/canvas-template.tsx` (new)
- `packages/react/src/components/templates/canvas-template/canvas-template.module.scss` (new)
- `packages/react/src/components/templates/canvas-template/index.ts` (new)
- `packages/react/src/components/templates/index.ts` — barrel export
- `packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx` — the
  BUILD-055 placeholder early-return replaced by the card
- `packages/react/src/i18n.ts` — `canvas.*` × 2 keys × 3 locales

**`apps/react-demo`** (verification only, not shipped)

- `apps/react-demo/src/app/routes/canvas-card/*` (new route, both shells)
- `apps/react-demo/src/mock-server/sse-mock.ts` — delta replay at the measured product cadence
  (~7 bytes / ~25ms), plus the replay-only and discard scripts, two adversarial scripts (`「長」` past
  the 520px cap, `「亂寫」` duplicate title + hardcoded colors + unclosed tag), and a fragment script
  that reports outward so "it ran, exactly once" is observable from the host
- `apps/react-demo/src/app/app.tsx`, `.../components/layout/layout.tsx` — route registration

**Known warning introduced (not suppressed):** `no-new-func` in `canvas-runtime-behavior.spec.ts`.
The spec executes the _shipped_ runtime string via `new Function` — without it R6 / R7 / R9 have no
coverage at all, since that code lives inside the iframe where neither the host nor jsdom can reach it
by other means. An `eslint-disable` would violate §1.2, so the warning stands and is recorded here.

---

## Execution Log / Change Log

- 2026-08-12: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/66 (Status: `draft`).
- 2026-08-12: BUILD-055 landed; started (Status: `draft → ready → in-progress`).
- 2026-08-12: Ported from the prototype (read in full first, per T1). Static: typecheck / build /
  format green, lint 0 errors. Tests: core 208 / react 233 (+16 canvas).
- 2026-08-12: Mutation-tested the two rules the prototype warned about: replacing the morph with an
  `innerHTML` reset fails 4 cases; removing the `final` guard on script execution fails 2.
- 2026-08-12: Headed-browser verification (see REVIEW-056 for the per-R# evidence). Notably the CSP was
  exercised by injecting a hostile fragment through the real content channel — the browser reported the
  violation and blocked it, with zero external requests. (Status: `in-progress → done`).
- 2026-08-13: REVIEW-056 ran §1 + §3 in a headed browser. §1 clean. §3: 13 of 15 R# Pass, **2 Fail**
  (Status: `done → in-progress`):
  - **R1** — the drawing indicator is unreachable. It sits inside the `{title && …}` guard, but core
    sets `title` only on `canvas.complete`, the same event that sets `isDrawing: false`, so
    `title && isDrawing` is never true. Measured: 191 samples over ~19 s of streaming, zero indicator.
    `canvas.drawing` is dead in all three locales.
  - **R10 / R11** — `--canvas-fg` resolves to `rgb(0,0,0)` against `--canvas-bg: rgb(31,31,31)`
    (≈1.3:1) on the SDK's own dark shell: every ancestor of the card reports the UA-default black
    `color`, so the computed-color read has nothing meaningful to read. The literal `FALLBACK_THEME.fg`
    would have been correct. Reproduces for every consumer, not just the demo.
  - R13 was upgraded to Pass — driving `prefers-reduced-motion` through Playwright closed the gap this
    task recorded as unverifiable.
- 2026-08-13: Both BLOCKERs fixed (Status: `in-progress → done`). Each turned out to be something the
  port dropped from the prototype rather than a mechanism that needed redesigning:
  - **R1** — the head now renders on `title || isDrawing`, and its label slot carries
    `t(locale, 'canvas.drawing')` while the canvas draws and `template.title` once it lands. That is
    the swap `thinking-block` already does (`thinking.streaming` ↔ `thinking.summary`), and it matches
    AC8's two independent conditions; AC17 still holds because the state label is not a title pulled
    from markup. `canvas-card-chrome.spec.tsx` (new, 4 cases) pins it — 2 of the 4 fail against the
    old chrome.
  - **R10 / R11** — `.card` now declares `color: var(--asg-color-text-primary, #fff)`. The prototype's
    `.canvas-card` carried `color: var(--fg, #e8eaed)` (`CanvasCard.tsx:374`), which is exactly why
    `getComputedStyle(host).color` was meaningful there; the port kept the declaration only on `.head`,
    so `host` (the card) inherited the UA-default black. **No change to the resolution mechanism** —
    AC14 still reads a real element's computed color, that element now just has one. The duplicate
    declaration on `.head` was removed (it inherits).
  - Headed re-verification (Playwright, `:4201`, both shells): drawing samples with head + pulse
    **185/185** wide and **147/147** narrow (was 0/191); label `繪製中` throughout, swapping to
    `資料管線現況` on complete with the pulse gone. In-frame `--canvas-fg: rgb(255,255,255)` against
    `--canvas-bg: rgb(31,31,31)` — contrast **16.48:1**, up from 1.3:1; the other four tokens
    unchanged. Under `prefers-reduced-motion` the pulse renders with `animationName: none`
    (151/151) — R13's `.pulse` clause is now genuinely exercised rather than vacuous.
  - Gate re-run: lint 0 errors / 4 warnings (no new ones), format, typecheck, build all green;
    tests core 208 / react **237** (+4).
  - **T7 deviation:** screenshots are not committed to `.github/screenshots/`. The repo-wide rule keeps
    visual evidence out of the repo and the PR; it lives in the local verification handover instead.
- 2026-08-13: Closed the two demo-reachable verification gaps REVIEW-056 recorded. Added `「長」`
  (a 723 px table fragment) so AC13's 520px cap is walked rather than inferred, and `「亂寫」` (a
  fragment that repeats the title, hardcodes colors and leaves a tag unclosed) so the "a real agent
  is not well-behaved" risk has at least one concrete case. Both pass; see REVIEW-056. No library
  code changed — demo only.
