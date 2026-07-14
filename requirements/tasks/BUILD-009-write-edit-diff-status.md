# BUILD-009 Write/Edit Diff + Unified Status

## Meta

- Task ID: `BUILD-009`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/7`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-007-Write-Edit-diff-與統一狀態呈現.md` (+ `use-cases/UC-011`, `UC-012`; pinned prototype spec `docs/superpowers/specs/2026-07-10-builtin-tool-call-variants-design.md` §6, §3.5)
- Complexity: `M`

---

## Brief

Two things (pinned spec §6 + §3.5): (a) show a `+/-` line-count **diff** on the right of Write / Edit tool-calls (the position vacated by the removed duration); (b) refine the **status representation** — `completed` shows no mark (clean), `running` shows an amber spinner on the right, `error` shows a red alert on the right, and the left variant icon (F-004) stays as identity only. Write → `+{content line count}` (green `+`, no `-`); Edit → a line-level LCS **estimate** on `old_string` ↔ `new_string` (green `+added` / red `-removed`); other tools show no diff. `replace_all` amplifies real hits but, without file content, is counted as a single hit (marked as an estimate). React-only; no core change. (The failure-detection source — the backend `IsError` — is a separate ticket, spec §7; this cycle only renders the states.)

**Scope this cycle (F-007):** the Write/Edit diff + the §3.5 status visual. **Not this cycle:** `IsError`-driven failure detection (F-009), expanded-panel localization (F-008), Subagent (F-012).

**Already exists:** `tool-call-label.ts` (`synthesizeToolCallLabel`, `groupSummary`, native detection) + `ToolCallItemData` (`{ id, label, status, variant, initial?, result? }`); `tool-call-group.tsx` `ToolCallItem` (left variant icon + label + right `StatusIcon`) + `StatusIcon` (currently `completed` → green check, `pending` → amber spinner, `error` → red icon); `toolCallToItemData` sets `status` from `isComplete` / `result?.error`. No diff yet; `completed` still shows a green check.

---

## Relevant Rules

| §    | Rule (summary)                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — the diff / LCS helpers precisely typed                                                    |
| §1.6 | `@asgard-js/core` untouched; react-only                                                              |
| §3.1 | Explicit return types (`toolDiff(): ToolCallDiff \| null`)                                           |
| §4.2 | Diff / status colors via CSS variables (success / error / warning), not bare literals where possible |
| §6   | Reuse the existing `ToolCallItem` + native detection; inline any new status icon per lucide 0.487.0  |
| §7   | No `IsError` wiring this cycle (spec §7 is a separate ticket) — render the states only               |

---

## Acceptance Criteria

- `R1` **Write** shows `+{content line count}` on the right (green `+`, no `-`); a native Write with an empty `content` shows `+0`. → T1, T2
- `R2` **Edit** shows a line-level LCS estimate `+{added}` (green) and, when `removed > 0`, ` -{removed}` (red), computed from `old_string` ↔ `new_string`; `replace_all === true` is still counted as a single hit (estimate). Non-Write/Edit tools show no diff. → T1, T2
- `R3` The diff renders on the right of each tool-call item (the former duration slot), left of / alongside the status area. → T2
- `R4` Status visual (§3.5): `completed` → **no status icon** (clean); `running` (in-flight) → amber spinner on the right; `error` → red alert on the right. The left variant icon is unchanged (identity, muted). → T3
- `R5` No `@asgard-js/core` change — diff / status read from the existing `ConversationToolCallMessage` fields. → T1, T2, T3
- `R6` (Smoke) build green; a scoped react-demo route showing a Write (`+N`), an Edit (`+/-`), a non-diff tool (no diff), and the three status states (completed clean, running spinner, error alert); screenshot to `.github/screenshots/f-007/`. → T4

---

## Implementation Tasks

- [x] T1 (R1, R2, R5): `tool-call-label.ts` — `ToolCallDiff` type + `toolDiff(call)` (native gate; Write → `{ added: content split '\n' length, removed: 0 }`; Edit → `lineDiff(old, new)` LCS → `{ added: n-lcs, removed: m-lcs }`; else `null`).
- [x] T2 (R1, R2, R3, R5): `ToolCallItemData.diff?: ToolCallDiff | null`; `toolCallToItemData` sets `diff: toolDiff(toolCall)`; render `+{added}` (green) / `-{removed}` (red) on the right of `ToolCallItem`, before the status icon.
- [x] T3 (R4): `StatusIcon` — `completed` → `null`; `pending`/running → amber `LoaderCircle` spinner (CSS spin + reduced-motion); `error` → red `CircleAlert` (both inlined byte-matching lucide 0.487.0; old CheckCircle/Error/Loading icons removed). scss updated.
- [x] T4 (R6): scoped `/tool-call-diff` route with `initMessages` covering Write (+5), Edit (+2 -1), Read (no diff), a running Bash, and an error WebSearch; browser-verified diffs + status visuals.
- [x] T5: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6 (UC-011 diff、UC-012 統一狀態呈現)
Files:

- `packages/react/src/components/templates/tool-call-group/tool-call-label.ts` — `ToolCallDiff` + `lineDiff` (LCS) + `toolDiff(call)`
- `packages/react/src/components/templates/tool-call-group/tool-call-group.tsx` — `ToolCallItemData.diff?`; right-side `+/-` diff render; `StatusIcon` §3.5 (completed→null, running→LoaderCircle, error→CircleAlert, lucide 0.487.0); removed old status icons
- `packages/react/src/components/templates/tool-call-group/tool-call-group.module.scss` — diff colors + status spin (reduced-motion), remove completed color
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` — `toolCallToItemData` sets `diff: toolDiff(toolCall)`
- `apps/react-demo/src/app/routes/tool-call-diff/{tool-call-diff.tsx,tool-call-diff.module.scss,index.ts}` — scoped demo route (Write/Edit/Read + running/error)
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — register `/tool-call-diff`

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/7 (F-007 + UC-011/UC-012, pinned spec §6/§3.5) (Status: `draft`).
- 2026-07-15: Implemented T1–T5 (react-only; no core change). build:core+react green, lint:packages green, own-file format clean. Browser-verified `/tool-call-diff` (DOM extraction): Write "report.html" → `+5` (green, 5 content lines); Edit "plan.md" → `+2 -1` (green/red LCS estimate); Read → no diff; all three completed show **no status icon**; a running Bash → amber `LoaderCircle` spinner; an error WebSearch → red `CircleAlert`. Status icons byte-match lucide-react 0.487.0. 0 console errors. Screenshot: `.github/screenshots/f-007/tool-call-diff.png`. IsError-driven failure detection remains F-009 (this cycle only renders the states). (Status: `in-progress → done`).
