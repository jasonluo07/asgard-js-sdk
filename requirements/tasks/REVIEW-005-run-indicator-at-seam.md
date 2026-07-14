# REVIEW-005 Run Indicator Bound to Connection at the Seam

## Meta

- Task ID: `REVIEW-005`
- Status: `done`
- BUILD Task: `BUILD-005`
- Reviewed commit: working tree on `11935ce` (F-003 delta, pre-commit)
- Reviewed branch: `feat/f-003-run-indicator-at-seam`

---

## §1 Static Code Review

Scope: BUILD-005 `## Coverage` files (F-003 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                   | Result | Note                                                                                                                                                |
| ------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                          | ✅     | grep clean across all F-003 files                                                                                                                   |
| No `@ts-ignore` / `@ts-expect-error`                   | ✅     | grep clean                                                                                                                                          |
| No new `eslint-disable`                                | ✅     | one hit at `chatbot-footer.tsx:610` is pre-existing (not in the F-003 diff — which adds only the RunningIndicator import + seam render)             |
| No `console.log`                                       | ✅     | grep clean                                                                                                                                          |
| No `<style>` injected into JSX                         | ✅     | the indeterminate line lives in `running-indicator.module.scss` (prototype's inline `<style>` was ported to a scss module)                          |
| Colors via CSS variables (§4.2)                        | ✅     | `var(--asg-color-border, …)` (seam) + `var(--asg-color-primary, …)` (line) — the same CSS-var-with-default pattern as the rest of the react package |
| Component props fully typed (§4.1)                     | ✅     | `RunningIndicator({ running: boolean })`; explicit `: ReactNode` return                                                                             |
| No breaking public API without deprecation (§1.7)      | ✅     | the removed `BotTypingPlaceholder` was internal; the public `botTypingPlaceholder` prop is kept and marked `@deprecated` (no-op)                    |
| Dead code fully removed (§7)                           | ✅     | `bot-typing-placeholder.tsx` deleted + export dropped; `.typing-indicator` / `.dot` / `@keyframes blink` removed; `useDebounce` use removed         |
| Honor prefers-reduced-motion (§7 / R5)                 | ✅     | `@media (prefers-reduced-motion: reduce)` sets the segment to `animation: none` + static full width                                                 |
| No `setTimeout` mock delay in library code (§7)        | ✅     | none in core/react; the demo mock's `sleep` is demo infra                                                                                           |
| `isConnecting` chain untouched (§6 — no second signal) | ✅     | channel → use-channel → context → footer unchanged; the indicator binds the existing `isConnecting`                                                 |

### §1.2 Grep (F-003 scope)

```
[as any / @ts-ignore / eslint-disable / console.log / <style>]
  → only chatbot-footer.tsx:610 eslint-disable (pre-existing, outside the F-003 diff); everything else clean
[running-indicator.module.scss colors]  var(--asg-color-border, #434343), var(--asg-color-primary, #1677ff) — CSS-var fallbacks
[setTimeout in core/react]               (none — library clean; demo mock sleep is infra)
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean (no core change).
- `npm run build:react` (vite dts, authoritative react type check) → green. `packages/react/tsconfig.lib.json` raw `tsc` still emits only the TS6305 composite build-ordering artifact (not a code error).
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green.

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

React-only (no core logic → no Vitest). All R# via the scoped `/run-indicator` demo route (Playwright MCP): one connection carrying two messages + a 1.6s inter-message gap + a complete→done tail, plus `emulateMedia({ reducedMotion: 'reduce' })`.

### R# Result Matrix

| R#  | Description                                                     | Result | Note                                                                                                                                                                                          |
| --- | --------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | indicator binds isConnecting; no flicker / gap within a run     | Pass   | Data sampling over the whole run: the segment was **continuously** present with exactly one LIT→off transition (at run.done) — never flickered per message, never disappeared in the 1.6s gap |
| R2  | indicator at thread↔input seam (indeterminate line), not inline | Pass   | `RunningIndicator` renders at the footer's top edge (the body↔footer seam); the segment element is the indeterminate line; not in the message thread                                          |
| R3  | input disabled during the run (unchanged gating)                | Pass   | mid-run the send button carried `chatbot_submit_button__disabled`; the footer send-gating was not modified                                                                                    |
| R4  | complete→done tail stays lit until the connection closes        | Pass   | the segment stayed lit through the 1.4s tail after the last `message.complete`, turning off only at `run.done`                                                                                |
| R5  | honor prefers-reduced-motion (static, no flow)                  | Pass   | under emulated reduced-motion the segment computed to `animation-name: none`, `width: 100%` (375px), `opacity: 0.5`, `transform: none` — static, no sweep                                     |
| R6  | streaming text still real-time; 3-dot / placeholder removed     | Pass   | bot messages rendered their streaming text with no 3-dot animation and no thread placeholder; the old `BotTypingPlaceholder` is gone                                                          |
| R7  | (browser smoke) seam indicator across a multi-message run       | Pass   | `/run-indicator` verified end-to-end, 0 console errors; screenshots `.github/screenshots/f-003/run-indicator-{lit,reduced-motion}.png`                                                        |

**§3 result: PASS — all R1–R7 Pass, zero BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

None.

---

## Execution Log

- 2026-07-14: REVIEW task created, paired with BUILD-005 (Status: `draft`).
- 2026-07-14: §1 Static Code Review — checklist all ✅ (the one footer eslint-disable is pre-existing), grep clean, core tsc clean, react build green, lint green. §3 Functional Validation — R1–R7 all Pass (Playwright data-sampling of the seam indicator across a multi-message run + reduced-motion emulation, 2 screenshots, 0 console errors). Zero BLOCKERs. Status: `draft → done`.
