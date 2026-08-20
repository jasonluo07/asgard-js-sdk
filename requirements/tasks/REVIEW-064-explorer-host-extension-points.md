# REVIEW-064 Review: host extension points on the SourceSet File Explorer

## Meta

- Task ID: `REVIEW-064`
- Status: `done`
- BUILD Task: `BUILD-064`
- Reviewed commit: `9c500bec`
- Reviewed branch: `feat/f025-explorer-extension-points`

---

## §1 Static Code Review

Scope = the seven files in `BUILD-064 ## Coverage`. `lint` / `format` / `typecheck` / `build` run project-wide.

### §1.1 Checklist

| Check item                                                              | Rule                           | Result                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                                                        | FRONTEND_RULE_COMMON §1.1      | ✅ — both hooks are typed against `FsEntry` / `ContextMenuItem`; the R7 spec case exists precisely so a host never needs a cast                                                                      |
| `@ts-ignore` / `@ts-nocheck` / `eslint-disable` used to bypass errors   | FRONTEND_RULE_COMMON §1.2      | ✅                                                                                                                                                                                                   |
| `console.log` left in library code                                      | FRONTEND_RULE_COMMON §1.3 §7   | ✅                                                                                                                                                                                                   |
| Hardcoded API key / endpoint / namespace                                | FRONTEND_RULE_COMMON §1.4      | ✅ — the demo's `apiKey` hits are `import.meta.env` plumbing, not literals                                                                                                                           |
| RxJS subscription / EventSource / timer teardown                        | FRONTEND_RULE_COMMON §1.5      | ✅ n/a — both props are pure functions called during render; no subscription, no timer added                                                                                                         |
| `@asgard-js/react` imports core via its public entry only               | FRONTEND_RULE_COMMON §1.6      | ✅                                                                                                                                                                                                   |
| `@asgard-js/core` free of `react` / `react-dom` / DOM                   | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅ core untouched — this is react-only                                                                                                                                                               |
| Public API change goes through `@deprecated`                            | FRONTEND_RULE_COMMON §1.7      | ✅ — purely additive: two optional props and one added type export. R8 pins that the no-props path is byte-identical in DOM terms                                                                    |
| New public types / functions / components exported from the entry       | FRONTEND_RULE_COMMON §2.2      | ✅ — `export type { ContextMenuItem }` in `components/file-explorer/index.ts`, reaching the entry through `components/index.ts`; confirmed in the emitted `dist/components/file-explorer/index.d.ts` |
| Message-template prerequisites (type + enum before component)           | FRONTEND_RULE_COMMON §2.3      | ✅ n/a — no template added                                                                                                                                                                           |
| Uses `botProviderEndpoint`, not `endpoint`                              | FRONTEND_RULE_COMMON §2.4      | ✅ n/a — this component takes `sourceSetEndpoint`; no bot-provider call involved                                                                                                                     |
| Exported functions declare explicit return types                        | FRONTEND_RULE_COMMON §3.1      | ✅ — `SourceSetFileExplorer` / `SourceSetTree` keep `: ReactNode`; the two prop signatures declare `ContextMenuItem[]` and `ReactNode`                                                               |
| Shared types centralized; no duplicate interfaces                       | FRONTEND_RULE_COMMON §3.2      | ✅ — `FsEntry` and `ContextMenuItem` are reused from `components/file-explorer/`; nothing redefined                                                                                                  |
| React component props fully typed                                       | FRONTEND_RULE_COMMON §4.1      | ✅ — `SourceSetFileExplorerProps` and `SourceSetTreeProps` both extended with fully typed optional hooks                                                                                             |
| Hardcoded color values in components                                    | FRONTEND_RULE_COMMON §4.2      | ✅ for the library — `.rowBadge` is layout only (no colour). One `#4f46e5` was added in the **demo** route's own stylesheet (see Minor 1)                                                            |
| `react` / `react-dom` stay peerDependencies                             | FRONTEND_RULE_COMMON §4.4      | ✅ — `vite.config.ts` still externalizes them and `dist/index.js` imports rather than inlines React                                                                                                  |
| core / react version parity                                             | FRONTEND_RULE_COMMON §5        | ✅ both `0.3.67`, untouched by this task                                                                                                                                                             |
| Repeated logic (≥2×) / JSX (≥3×) extracted                              | FRONTEND_RULE_COMMON §6        | ✅ — the host section is one expression next to the existing `group()` helper; the badge is one JSX node. Nothing repeats twice yet                                                                  |
| `setTimeout` mock delays / commented dead code / untracked TODO / FIXME | FRONTEND_RULE_COMMON §7        | ✅ — the `setTimeout` hits under the coverage dirs are all in files this task never opened (`blob.ts`, `file-view.tsx`, the demo's `volume-mock.ts`)                                                 |

**19 ✅ / 0 ❌.**

### §1.2 Mechanical Grep

Scoped to the Coverage paths; the two §1.6 greps run over whole packages as the rule specifies.

```
### any / as any                (no output)
### ts-ignore / eslint-disable  (no output)
### console.log                 (no output)
### TODO / FIXME                (no output)
### core imports react          (no output)
### react deep-imports core     (no output)

### setTimeout
source-set-explorer/blob.ts:46                    — pre-existing (revokeObjectURL)
source-set-explorer/file-view.tsx:107,113         — pre-existing (autosave debounce)
react-demo/.../volume-mock.ts:112                 — pre-existing (mock latency)
  → none of the three files is in this task's diff

### hardcoded colors, diff-scoped
git diff --cached -- packages | grep '^+' | grep -E 'rgba\(|: *#[0-9a-fA-F]{3,6}'
  → no output (the library adds no colour value)
git diff --cached -- apps | grep '^+' | grep -E 'rgba\(|: *#[0-9a-fA-F]{3,6}'
  → +  color: #4f46e5;   (demo route's own `.pulledBadge`; see Minor 1)

### R7 — the type really reaches the entry
grep -n ContextMenuItem packages/react/dist/components/file-explorer/index.d.ts
  → 9:export type { ContextMenuItem } from './context-menu';
```

### §1.3 Build / Lint / Format

```
lint:packages: PASS — 0 errors (the same 5 pre-existing `no-new-func` warnings in
               canvas-runtime-behavior.spec.ts and siblings)
format:check:  PASS for every tracked file — the one remaining warning is the untracked,
               gitignored local `CLAUDE.local.md`, unrelated to this task
typecheck:     PASS — 3/3 projects (core + react + react-demo). The demo resolves
               `@asgard-js/react` to `packages/react/src/index.ts` via tsconfig paths, so its
               `import type { ContextMenuItem }` is a genuine end-to-end check on T4, re-run
               with `--skip-nx-cache` to rule out a replayed ✅
build:         PASS — build:core and build:react both green; `extraEntryActions` and
               `entryBadge` both present in the emitted `.d.ts`
test:packages: PASS — 60 files / 553 tests (core 13/250, react 47/303; +7 tests)
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

`Coverage.Use Cases` = `R1`–`R9`, so §3 runs. Harness: the 7-case `BUILD-064` Vitest group for R1–R7, plus a
live walk of the react-demo `/source-set-explorer` route (port 5100, both mounts on screen) driven through
Playwright, reading the a11y tree and row DOM after each step.

### R# Result Matrix

| R#  | Description                                                                | Result | Note                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Host items render as their own section after Rename/Delete, before Refresh | Pass   | Live menu order: New file / New folder / Upload ‖ Download / Copy / Cut / Paste ‖ Rename / Delete ‖ **Pulled by nightly-docs** ‖ Refresh — five sections, four separators. Pinned by a full-order assertion in Vitest                      |
| R2  | Called with the selected entry, `null` when nothing is selected            | Pass   | Right-click on the tree background with nothing selected renders the host's "no selection" item; a right-click on `a.txt` selects it first and the hook receives `{ path: 'a.txt', isDir: false }`                                         |
| R3  | `readOnly` drops the whole host section                                    | Pass   | With `readOnly` the menu is exactly Download (disabled) + Refresh — the host item is gone, not greyed. Markers stayed on both marked folders in the same state                                                                             |
| R4  | A `disabled: true` host item is inert but visible                          | Pass   | `Pulled by nightly-docs` renders greyed with `[disabled]` in the a11y tree; clicking it neither fires `onSelect` nor closes the menu                                                                                                       |
| R5  | Badge sits right of the name, in both modes, not its own click target      | Pass   | `notes` row: 4 children, last one the badge slot wrapping the host node with `title="Pulled from nightly-docs (git)"`. Clicking the marker still selects **and** expands the row (the click reaches the row). Present under `readOnly` too |
| R6  | No badge → row exactly as before                                           | Pass   | Unmarked rows stay at 3 children; with `entryBadge={() => null}` every row matches the no-prop baseline; with the demo switch off, `[class*="rowBadge"]` count in the document is 0                                                        |
| R7  | `ContextMenuItem` public so hosts can type the hook                        | Pass   | Re-exported to the entry and consumed for real by `apps/react-demo` (`import { type ContextMenuItem, type FsEntry } from '@asgard-js/react'`), which `typecheck:demo` covers; a Vitest case also binds the hook type                       |
| R8  | Neither prop supplied → identical to 0.3.67                                | Pass   | Menu back to the ten built-ins in four sections, every row 3 children, zero badge slots. The pre-existing F-025 R5 menu-parity test passes unchanged, and `packages/react/src/components/chatbot/` + `packages/core/` have an empty diff   |
| R9  | (Smoke check) gates green + demo exercises all three affordances           | Pass   | lint / format / typecheck / build / 553 tests green; demo walked at 320px and full-bleed — extra section, disabled variant, and row badge all confirmed on screen                                                                          |

### §3.1 Acceptance

- [x] All R# executed (Step 1 static read + Step 2 Vitest / browser + Step 3 boundary conditions)
- [x] Each R# marked Pass / Fail / Blocked with explanation
- [x] Boundary conditions confirmed — no selection vs selected, background vs row right-click, `readOnly` on
      both props, host returning `[]` and `null`, both props absent, and both mount widths

**0 BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **The demo's `.pulledBadge` hardcodes `#4f46e5`.** It is in `apps/react-demo`, not the library, and it is
   deliberate: the badge slot is layout-only, so the marker's colour belongs to whoever renders it, and the
   route is playing the host. The same stylesheet already carries a pre-existing `rgba(0, 0, 0, 0.06)`. Worth
   recording because the diff-scoped colour grep is otherwise empty, and a future reader should not read this
   hit as the SDK painting a colour.
2. **`extraEntryActions` is called on every render, not only when the menu opens.** It lives in the
   `menuSections` memo alongside the built-in `group()` calls, so a host's callback runs whenever `selected`,
   `readOnly` or the callback identity changes even with no menu on screen. Harmless for the shapes the first
   consumer needs (a filter over a small array), and it keeps the code beside the existing action table —
   but a host doing real work per call should memoize. Gating the section on the open menu is the fix if that
   ever bites.
3. **The badge slot renders on truthiness, not `!= null`.** `entry.isDir && <Badge/>` is the idiom hosts
   reach for and yields `false` for files, which under a `!= null` check would leave an empty slot and the
   row's `gap` behind. The cost is that a badge of literal `0` would not render — not a shape any real marker
   takes.
4. **The `Relevant Rules` row in BUILD-064 names a directory that does not exist**
   (`packages/react/src/components/chatbot/file-explorer/`). The shared explorer is at
   `packages/react/src/components/file-explorer/`, which T4 deliberately touches with a 3-line type export.
   Recorded in BUILD-064 `## Decisions` so the next increment does not read it as a violated constraint.

---

## Execution Log

- 2026-08-20: REVIEW task created, paired with BUILD-064 (Status: `draft`).
- 2026-08-20: BUILD-064 reached `done`; §1 static review started (Status: `ready → in-progress`).
- 2026-08-20: §1 complete — 19 ✅ / 0 ❌; lint 0 errors, format clean for tracked files, typecheck 3/3,
  build green, tests 60 files / 553 pass. §3 complete — R1–R9 all Pass. 0 BLOCKERs; 4 Minor notes recorded
  (Status: `in-progress → done`).
