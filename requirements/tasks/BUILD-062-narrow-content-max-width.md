# BUILD-062 Narrow the default content column to a readable measure

## Meta

- Task ID: `BUILD-062`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/54`
- Source spec: issue body (PM decision request; approved in-thread — no `tracking/` TASK file for this one)
- Complexity: `S`

---

## Brief

The chat column's default `contentMaxWidth` is `1200px`. Measured on Mimir (panel 1204px → text width 1140px
at 16px), that is **147 English characters per line** — 1.6× the 45–90 character comfort band, so the eye
loses the next line on the return sweep. ChatGPT / Claude / Gemini all sit around 700–800px.

Narrow the default to **800px** (800 − 2 × 32px gutter = 736px ≈ 95 characters). React-only, no core change,
no public API change: `contentMaxWidth` stays a consumer-overridable theme field, only its _default_ moves.
The literal `1200px` currently lives in six places (the theme default, two component `??` fallbacks, three
SCSS `max-width` rules), so this task also folds them onto one TS constant and one Sass variable — the same
shape `$chat-gutter` already uses — so the value cannot drift again.

**Already exists:** `packages/react/src/context/asgard-theme-context.tsx` (`defaultAsgardThemeContextValue`),
`packages/react/src/styles/layout/_variables.scss` (`$chat-gutter` — the precedent for a compile-time layout
constant), `chatbot-body.tsx` / `chatbot-footer.tsx` (`contentStyles`), `chatbot-body.module.scss` /
`chatbot-footer.module.scss`.

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

**Task-specific:** size magic numbers repeated ≥3× are extracted to a named constant (`FRONTEND_RULE_COMMON`
§5.2 / §6) — this is why the six `1200px` literals collapse to one TS constant + one Sass variable.

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When `<Chatbot>` renders in a panel wider than 800px **without** a consumer-supplied
  `theme.chatbot.contentMaxWidth`, the system shall cap the thread content, the docked run-chrome strip and
  the composer content at a computed `max-width` of `800px` (previously `1200px`), all three still centred on
  the same axis. → T1, T2
- `R2` When a consumer supplies `theme.chatbot.contentMaxWidth`, the system shall apply that value verbatim to
  the same three regions — the override path is unchanged and no `@deprecated` transition is needed. → T2
- `R3` When the chat column is narrower than 800px, the system shall leave the column full-width (the cap is
  inert) and the `$chat-gutter` inset from BUILD-047 shall be unchanged at every width. → T2, T3
- `R4` When the stylesheet is inspected, the system shall carry the same 800px cap in SCSS as in the inline
  theme style — no `1200px` literal shall remain anywhere in `packages/react/src` for the content column, and
  both call sites shall read from one named constant per language. → T1, T3
- `R5` When a developer reads the default-theme block in `packages/react/README.md`, the system shall document
  `contentMaxWidth: '800px'`. → T4
- `R6` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and opens
  `/all-features-wide` in the react-demo (`npm run serve:react-demo`, http://localhost:4200), the system shall
  render the thread and composer capped at 800px with a measured line length in the 45–96 English-character
  band, with no build errors and no regression at the narrow (375px) shell. → T6

---

## Implementation Tasks

- [x] T1 (R1, R4): Add `DEFAULT_CONTENT_MAX_WIDTH = '800px'` next to `defaultAsgardThemeContextValue` in
      `packages/react/src/context/asgard-theme-context.tsx`, and `$chat-content-max-width: 800px` in
      `packages/react/src/styles/layout/_variables.scss` (beside `$chat-gutter`, with the same
      why-this-number comment).
- [x] T2 (R1, R2, R3): Point `defaultAsgardThemeContextValue.chatbot.contentMaxWidth` and the two
      `?? '1200px'` fallbacks (`chatbot-body.tsx`, `chatbot-footer.tsx`) at the TS constant.
- [x] T3 (R3, R4): Point the three SCSS `max-width: 1200px` rules (`chatbot-body.module.scss` ×2,
      `chatbot-footer.module.scss` ×1) at `styles.$chat-content-max-width`.
- [x] T4 (R5): Update the `contentMaxWidth` line in the `packages/react/README.md` default-theme block.
- [x] T5: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck` +
      `npm run build:core && npm run build:react` + `npm run test:packages`.
- [x] T6 (R6): Smoke check — `npm run serve:react-demo`, walk `/all-features-wide` (wide + Crazy theme) and a
      narrow shell, measure the computed `max-width` on all three regions and the characters-per-line, and
      confirm a consumer override still wins.

---

## Coverage

Use Cases: `R1` `R2` `R3` `R4` `R5` `R6`

Files (all `@asgard-js/react`; `@asgard-js/core` untouched):

- `packages/react/src/context/asgard-theme-context.tsx` — new exported `DEFAULT_CONTENT_MAX_WIDTH`; the
  theme default now reads from it
- `packages/react/src/styles/layout/_variables.scss` — new `$chat-content-max-width`
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` — `contentStyles` fallback
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.module.scss` — thread + docked strip caps
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx` — `contentStyles` fallback
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.module.scss` — composer cap
- `packages/react/src/context/content-max-width.spec.tsx` — **new**, pins the default and the consumer override
- `packages/react/README.md` — default-theme block

---

## Verification

**Static** — `npm run lint:packages` 0 errors (5 pre-existing warnings), `npm run format:check` clean,
`npm run typecheck` 3/3 projects, `npm run build:core && npm run build:react` green,
`npm run test:packages` 59 files / 541 tests pass (react +1 file / +2 tests).

**Browser** — react-demo at http://localhost:4200, Chrome DevTools, computed styles read live:

| R#  | How verified                                                                                                                                                                                                                     | Result |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| R1  | `/all-features-wide` @ 1440px viewport: thread / docked strip / composer all `max-width: 800px`, rect 800px, left 342 → right 1142 (one centred axis)                                                                            | Pass   |
| R2  | `content-max-width.spec.tsx` — `theme.chatbot.contentMaxWidth: '1440px'` resolves to `1440px` (no demo route overrides it, so the merge path is pinned by Vitest)                                                                | Pass   |
| R3  | Same route @ 500px window: column 408px (cap inert), gutter 16.31px, `chat_header` padding identical, no horizontal overflow. `/all-features` default 375px shell unchanged (375px column, 16px gutter)                          | Pass   |
| R4  | `grep -rn '1200px' packages/react/src packages/core/src` → only the three explanatory comments; SCSS + TS each read one named constant                                                                                           | Pass   |
| R5  | `packages/react/README.md` default-theme block reads `contentMaxWidth: '800px'`                                                                                                                                                  | Pass   |
| R6  | Text box measured 736px; average glyph 9.23px at 16px Space Grotesk → **80 English characters per line** (was 147 at 1140px), inside the 45–90 band. Re-measured under the Crazy theme — identical geometry, no token regression | Pass   |

**Deliberately not changed:** `chat-header` stays full-bleed (it takes `$chat-gutter` but no `max-width`), so
the title sits at the column edge while the thread centres. That is the pre-existing behaviour at 1200px and
matches ChatGPT / Claude; narrowing the column only makes it more visible. Raised with the user before build,
left as is.

---

## Execution Log / Change Log

- 2026-08-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/54 (Status: `draft`).
- 2026-08-15: Plan confirmed by user; implementation started (Status: `draft → in-progress`).
- 2026-08-15: All R1–R6 verified; lint / format / typecheck / build / test green; browser smoke check passed at
  1440px, 500px and the 375px default shell (Status: `in-progress → done`).
