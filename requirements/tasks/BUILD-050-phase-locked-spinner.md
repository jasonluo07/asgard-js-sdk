# BUILD-050 Lock every loading spinner to a shared phase

## Meta

- Task ID: `BUILD-050`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/55`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/bugs/BUG-007-loading-spinner-相位不同步-多列同時轉時開口方向各異-看起來像蠕動.md`
- Complexity: `M`

---

## Brief

Every loading spinner in `@asgard-js/react` declares its own `@keyframes … spin` and starts its CSS
animation from the moment its own element mounts. There is no shared time origin, so rows that begin
loading at different times point their arc gaps in different directions — a screen full of spinners
reads as "something wriggling" (BUG-007, reported by John on Slack 2026-08-07).

Replace the seven copy-pasted animation declarations with a single phase-locked source. A
`useSyncedSpin` hook drives rotation through the Web Animations API and pins `startTime` to `0`
(the document timeline origin), so a spinner's phase is always the same function of `now % 1s`
regardless of when it mounted. A shared `Spinner` component wraps that hook for the nine
loader-glyph call sites; the one non-glyph spinner (the CSS ring in `attachment-preview`) consumes
the hook directly so its visual stays a ring. Rotation periods converge on 1s (attachment-preview
was 0.8s) and `prefers-reduced-motion: reduce` stops rotation everywhere (chat-header currently only
slows to 2s).

**Already exists:** `packages/react/src/hooks/` (hook conventions + barrel `index.ts`),
`packages/react/src/components/chatbot/file-explorer/icons.tsx` and
`packages/react/src/components/chatbot/chat-header/icons.tsx` (`LoaderCircleIcon` / `LoaderIcon` —
identical `M21 12a9 9 0 1 1-6.219-8.56` arc path, inlined lucide 0.487.0), and the seven
`*.module.scss` files that each declare a private spin keyframe.
Reference solution: `references/asgard-chat-kit-prototype/src/Spinner.tsx` (pinned @ `c5a20ad`).

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

Task-specific additions:

| §     | Rule (summary)                                                                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------- |
| §1.5+ | The `Animation` returned by `Element.animate` is a resource — cancel it in the effect cleanup                    |
| §4.2+ | Colors stay on the existing call-site classes; the shared component must not absorb per-site color / size tokens |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.
Each criterion is mapped to one or more Implementation Tasks (→ T#).

- `R1` When two or more spinners mount at different times, the system shall render them at the same
  rotation phase at any instant (measured `rotate` angles agree within 1°, i.e. no perceivable
  difference in arc-gap direction). → T1, T2, T3, T4
- `R2` When any spinner rotates, the system shall use a single 1s linear period across all call
  sites, including the attachment upload ring that previously used 0.8s. → T1, T4, T5
- `R3` When `prefers-reduced-motion: reduce` is in effect, the system shall not rotate any spinner,
  including the chat-header spinner that previously kept rotating at a slowed 2s period. → T1, T5
- `R4` When the runtime does not implement `Element.animate` (jsdom under Vitest), the system shall
  render the spinner statically without throwing. → T1, T6
- `R5` When a spinner unmounts, the system shall cancel its animation so no `Animation` object is
  left running on the document timeline. → T1, T6
- `R6` When the developer greps `packages/react/src` for spin keyframes, the system shall show no
  per-component `@keyframes` spin declaration — all seven are removed and rotation has exactly one
  source. → T5
- `R7` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, the
  `packages/react` Vitest suite, and exercises a multi-spinner view in the react-demo
  (`npm run serve:react-demo`, http://localhost:4200), the system shall show all visible spinners
  turning in lockstep with no build errors. → T7, T8

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R2, R3, R4, R5): Add `packages/react/src/hooks/use-synced-spin.ts` — returns a typed
      ref; on mount, if `Element.animate` exists and `prefers-reduced-motion: reduce` does not
      match, start a `rotate(0deg) → rotate(360deg)` animation with `duration: 1000,
iterations: Infinity` and set `startTime = 0`; cancel the animation in the effect cleanup.
      Export it from `packages/react/src/hooks/index.ts`.
- [x] T2 (R1): Add a shared `Spinner` component (loader-arc SVG + `useSyncedSpin` ref) under
      `packages/react/src/components/`, taking `className` / `size` / `label` so each call site keeps
      its own color and size classes. Export per the existing components barrel convention.
- [x] T3 (R1): Replace the nine loader-glyph call sites with `Spinner` —
      `subagent-list.tsx` (×2), `task-list.tsx`, `tool-call-group.tsx`, `chat-header.tsx`,
      `file-view.tsx`, `code-editor.tsx`, `file-explorer-panel.tsx` (×2).
- [x] T4 (R1, R2): Attach `useSyncedSpin` to the CSS ring `<div>` in `attachment-preview.tsx`, keeping
      the ring's border-based look (it is not a glyph).
- [x] T5 (R2, R3, R6): Delete the spin class + `@keyframes` + `prefers-reduced-motion` spin blocks
      from all seven `*.module.scss` files (subagent-list, task-list, tool-call-group, chat-header,
      attachment-preview, file-explorer-panel, file-view); keep unrelated reduced-motion rules such
      as the file-explorer `.chevron` transition and `.nudgeBtn:active`.
- [x] T6 (R4, R5): Add Vitest coverage for `useSyncedSpin` — renders without `Element.animate`,
      pins `startTime` to `0` when present, and cancels on unmount.
- [x] T7: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run build:core && npm run build:react`.
- [x] T8 (R7): Smoke check — run `npm run test:react`, then `npm run serve:react-demo`
      (http://localhost:4200), mount spinners at staggered times, measure their computed rotation to
      confirm R1, and screenshot to `.github/screenshots/`.

---

## Coverage

Use Cases: R1 · R2 · R3 · R4 · R5 · R6 · R7 — all verified (R1/R2/R3 in the browser, R4/R5 by Vitest,
R6 by grep, R7 by build + suite + demo).

Files (all in `@asgard-js/react` unless noted):

_New_

- `src/hooks/use-synced-spin.ts` — the phase-locked spin hook (WAAPI, `startTime = 0`)
- `src/hooks/use-synced-spin.spec.tsx` — 5 cases (R1–R5)
- `src/components/spinner/spinner.tsx` — the shared `Spinner` glyph
- `src/components/spinner/index.ts`
- `src/components/spinner/spinner.spec.tsx` — glyph geometry + a11y guard
- `src/components/chatbot/chatbot-footer/attachment-preview-spin.spec.tsx` — the ring runs 1s from the shared origin

_Changed — swapped to `Spinner` / the hook_

- `src/hooks/index.ts` (export the hook)
- `src/components/chatbot/subagent-list/subagent-list.tsx` (×2 call sites, local glyph removed)
- `src/components/chatbot/task-list/task-list.tsx` (local glyph removed)
- `src/components/templates/tool-call-group/tool-call-group.tsx` (local glyph removed)
- `src/components/chatbot/chat-header/chat-header.tsx` + `icons.tsx` (`LoaderIcon` removed)
- `src/components/chatbot/file-explorer/file-view.tsx`, `code-editor.tsx`, `file-explorer-panel.tsx`
- `src/components/chatbot/file-explorer/icons.tsx` + `icons.spec.tsx` (`LoaderCircleIcon` removed; its
  geometry guard moved to `spinner.spec.tsx`)
- `src/components/chatbot/chatbot-footer/attachment-preview.tsx` (ring takes the hook directly)

_Changed — spin declarations deleted (7 scss)_

- `subagent-list.module.scss`, `task-list.module.scss`, `tool-call-group.module.scss`,
  `chat-header.module.scss`, `attachment-preview.module.scss`, `file-explorer-panel.module.scss`,
  `file-view.module.scss`

_Demo (`apps/react-demo`)_

- `src/app/routes/spinner-sync/` (new route — mounts panel groups one click at a time)
- `src/app/app.tsx`, `src/app/components/layout/layout.tsx` (route registration + nav entry)

_Evidence_

- `.github/screenshots/bug-007-spinner-phase-synced.png`

---

## Verification Notes

Measured in Chrome on `/spinner-sync`, three panel groups mounted seconds apart:

| Check                                                                                           | Result                                                                       |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| R1 rotation spread across 7–8 spinners                                                          | **0.0000°** (all read `212.58°` / `172.908°` at one sample)                  |
| Pre-fix behavior, reproduced in-page with a plain CSS animation on 4 rings inserted 250ms apart | spread **272.59°** (`356.97` / `263.97` / `173.98` / `84.38`) — the wriggle  |
| R2 timing                                                                                       | every animation `duration: 1000`, `iterations: Infinity`                     |
| R1 origin                                                                                       | every animation `startTime: 0`                                               |
| R3 reduced motion (`matchMedia` forced to match)                                                | 0 animations, `transform: none`                                              |
| R6                                                                                              | no `@keyframes`/`animation` spin declaration left under `packages/react/src` |

Call sites additionally eyeballed in the browser: SubagentList (agent + child tool glyph), TaskList,
ChatHeader busy action (18px, unchanged). The tool-call-group and file-explorer spinners were not
reproduced live — their loading states are transient in the demo — but each only lost a class that
contained nothing but `animation`, and both are covered by the type check and the suite.

---

## Execution Log / Change Log

- 2026-08-07: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/55 (Status: `draft`).
- 2026-08-07: Plan confirmed by user; implementation started on `fix/55-phase-locked-spinner` (Status: `draft → ready → in-progress`).
- 2026-08-07: All R# verified. lint (0 errors) / format:check / typecheck:packages / build:core + build:react green; test:packages 298 passed (core 177, react 121, +8 new). Browser smoke on `/spinner-sync` measured 0° spread against a 272.59° pre-fix reproduction (Status: `in-progress → done`).
