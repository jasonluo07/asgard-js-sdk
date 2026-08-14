# REVIEW-061 Standalone SourceSet File Explorer

## Meta

- Task ID: `REVIEW-061`
- Status: `done`
- BUILD Task: `BUILD-061`
- Reviewed commit: `f0285d3fe05cab2650f0734fc159abeb82a1b9fe`
- Reviewed branch: `feat/f025-standalone-source-set-explorer` (base `feat/f024-sourceset-volume-core-client`)

---

## §1 Static Code Review

Scope for the greps: `packages/react/src/components/source-set-explorer/` and
`apps/react-demo/src/app/routes/source-set-explorer/` (BUILD-061 `## Coverage`). Lint, format and build
run project-wide.

### §1.1 Checklist

| Check item                                                             | Rule                           | Result |
| ---------------------------------------------------------------------- | ------------------------------ | ------ |
| `any` / `as any`                                                       | FRONTEND_RULE_COMMON §1.1      | ✅     |
| `@ts-ignore` / `eslint-disable` used to bypass a type or lint error    | FRONTEND_RULE_COMMON §1.2      | ✅     |
| `console.log` left in library code                                     | FRONTEND_RULE_COMMON §1.3 §7   | ✅     |
| Hardcoded API key / endpoint / namespace                               | FRONTEND_RULE_COMMON §1.4      | ✅     |
| Every subscription / EventSource / timer has teardown                  | FRONTEND_RULE_COMMON §1.5      | ✅     |
| `@asgard-js/react` imports core only through its public entry          | FRONTEND_RULE_COMMON §1.6      | ✅     |
| `@asgard-js/core` free of `react` / `react-dom` / DOM                  | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅     |
| Public API change carries a `@deprecated` transition                   | FRONTEND_RULE_COMMON §1.7      | ✅ n/a |
| New public types / components exported from the package entry          | FRONTEND_RULE_COMMON §2.2      | ✅     |
| Message-template prerequisites (type + enum before the component)      | FRONTEND_RULE_COMMON §2.3      | ✅ n/a |
| Uses `botProviderEndpoint`, not the deprecated `endpoint`              | FRONTEND_RULE_COMMON §2.4      | ✅ n/a |
| Exported functions declare an explicit return type                     | FRONTEND_RULE_COMMON §3.1      | ✅     |
| Shared types centralized in core `src/types/`; no duplicated interface | FRONTEND_RULE_COMMON §3.2      | ✅     |
| React component props fully typed                                      | FRONTEND_RULE_COMMON §4.1      | ✅     |
| No hardcoded colors in components — theme via CSS variables            | FRONTEND_RULE_COMMON §4.2      | ✅     |
| `react` / `react-dom` stay peerDependencies, not bundled               | FRONTEND_RULE_COMMON §4.4      | ✅     |
| core and react share a version number                                  | FRONTEND_RULE_COMMON §5        | ✅     |
| Repeated logic (≥2×) / types / JSX (≥3×) extracted                     | FRONTEND_RULE_COMMON §6        | ✅     |
| `setTimeout` mock delays, dead commented code, untracked TODO / FIXME  | FRONTEND_RULE_COMMON §7        | ✅ ¹   |

**19 ✅ (3 of them n/a) / 0 ❌.**

¹ Four `setTimeout` occurrences exist and none is a faked delay in library code — see Minor 1.

Notes on the judgment calls:

- **§1.7 n/a** — nothing was removed or re-signed. `git diff main...HEAD` over
  `packages/react/src/components/index.ts`, `packages/react/src/index.ts` and `packages/core/src/index.ts`
  contains no deletions, so the change is purely additive.
- **§2.2** — resolved through the barrels rather than assumed: `dist/index.d.ts` → `./components` →
  `./source-set-explorer` → `export { SourceSetFileExplorer }` plus
  `export type { SourceSetFileExplorerProps, SourceSetExplorerTheme }`, and `dist/index.js` carries the
  runtime export.
- **§3.2** — the module defines no wire type of its own. `FsEntry` is imported from the shared module and
  every volume type comes from `@asgard-js/core`; `DirListing` / `ClipboardState` /
  `SourceSetExplorerTheme` are UI state that exists nowhere else.
- **§4.2** — no color literal appears in any `.ts` / `.tsx`. The stylesheet uses `--asg-color-*` /
  `--asg-font-family-*` with literal `var()` fallbacks, which is exactly what the shipped
  `file-explorer-panel.module.scss` does.
- **§4.4** — checked against the built bundle, not the manifest: `dist/index.js` imports `"react"`,
  `"react/jsx-runtime"`, `"@asgard-js/core"` and `"streamdown"` rather than inlining them.
- **§6** — the leaf-UI duplication against `components/file-explorer/` is mandated by F-025 and tracked
  by F-027; it is not an un-extracted repetition. Within the module, the ten actions are declared once
  and rendered by both the toolbar and the context menu.

### §1.2 Mechanical Grep

```bash
# §1.1 any / as any
$ grep -rn ': any\b\|<any>\|as any' <coverage-dirs>
packages/react/src/components/source-set-explorer/paths.spec.ts:8: * reaches the backend as a 400 rather than as anything the user could act on.
# ↑ prose in a doc comment ("as anything"), not a type. No `any` in the module.

# §1.2 ts-ignore / eslint-disable
$ grep -rn '@ts-ignore\|@ts-nocheck\|eslint-disable' <coverage-dirs>
(empty)

# §1.3 / §7 console.log
$ grep -rn 'console\.log' <coverage-dirs>
(empty)

# §1.6 core reverse-dependency on react
$ grep -rn "from 'react'\|from \"react\"\|react-dom" packages/core/src/
(empty)

# §1.6 react deep-importing core internals
$ grep -rn "@asgard-js/core/src\|core/src/lib" packages/react/src/
(empty)

# §4.2 hardcoded colors in the new module's ts/tsx
$ grep -rn '#[0-9a-fA-F]\{3,6\}\|rgba(' packages/react/src/components/source-set-explorer
(empty)

# §7 setTimeout
$ grep -rn 'setTimeout' <coverage-dirs>
packages/react/src/components/source-set-explorer/blob.ts:46:  setTimeout(() => URL.revokeObjectURL(url), 0);
packages/react/src/components/source-set-explorer/file-view.tsx:107:  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
packages/react/src/components/source-set-explorer/file-view.tsx:113:    saveTimer.current = setTimeout(() => {
apps/react-demo/src/app/routes/source-set-explorer/volume-mock.ts:112:    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
# ↑ see Minor 1 — none of these is a faked delay in library code.

# §7 TODO / FIXME
$ grep -rn 'TODO\|FIXME' <coverage-dirs>
(empty)
```

### §1.3 Additional check — R1 enforced two ways

```bash
$ git diff main...HEAD -- packages/react/src/components/file-explorer/
(empty)
```

and `module-boundary.spec.ts` fails the build if the module imports anything from `../file-explorer/`
beyond `context-menu` and `types`, or imports any chat context. Both pass.

### §1.4 Build / Lint / Format

```
lint:packages: PASS — 0 errors, 5 warnings.
               The one warning inside this change is
               source-set-explorer/file-view.tsx:172 react-hooks/exhaustive-deps (missing
               `scheduleSave`) — the identical warning the shipped file-explorer/file-view.tsx:183
               carries, since the copy keeps that structure. The other four are pre-existing.
format:check:  PASS — the only file prettier flags is the untracked `consent-flow.html` at the repo
               root, which is not part of this change and was deliberately left alone.
build:         PASS — build:core ✓ built in 2.74s, build:react ✓ built in 13.70s, no type errors.
typecheck:     PASS — `npm run typecheck` green over core + react + react-demo.
```

### §1.5 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅/❌
- [x] No ❌ violations to list
- [x] All §1.2 grep commands run and output pasted
- [x] `npm run lint:packages` — no ESLint errors
- [x] `npm run build:core && npm run build:react` green

---

## §3 Functional Validation

Vitest for logic and component behavior; the react-demo `/source-set-explorer` route in Chrome for the
UI criteria, walked at 1440px with both mounts (320px aside and full bleed) on screen together.

```
$ npx vitest run --root packages/react src/components/source-set-explorer
 ✓ module-boundary.spec.ts   (3 tests)
 ✓ paths.spec.ts            (12 tests)
 ✓ source-set-explorer.spec.tsx (20 tests)
 Test Files  3 passed (3)      Tests  35 passed (35)

$ npm run test:packages -- --skip-nx-cache
 core:  Test Files 13 passed (13)   Tests 250 passed (250)
 react: Test Files 45 passed (45)   Tests 289 passed (289)
```

No pre-existing test regressed.

### R# Result Matrix

| R#  | Description                                                      | Result  | Note                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `components/file-explorer/` diff is empty                        | Pass    | `git diff main...HEAD` over that directory is empty; `module-boundary.spec.ts` also fails on any unsanctioned import.                                                                                                                              |
| R2  | Exported from `@asgard-js/react`, implemented in the new module  | Pass    | Resolved through the built barrels (§1.1 note); every source file lives under `source-set-explorer/`.                                                                                                                                              |
| R3  | Renders and operates on endpoint + apiKey / customHeaders only   | Pass    | Specs assert `X-API-KEY` on one path and `Authorization` with no api key on the other; the demo route mounts it on a page with no Chatbot. No chat-context import (spec-enforced).                                                                 |
| R4  | Lazy tree, click / double-click / right-click, dirs before files | Pass    | Spec: root lists once, `notes` only lists on expand, rows come back `['notes','a.txt']`. Browser: same ordering in both mounts.                                                                                                                    |
| R5  | Toolbar and menu offer the same ten actions; disable, not hide   | Pass    | Spec asserts toolbar order equals the spec's order and the menu set equals it; rename/delete disabled with no selection, enabled after. Browser a11y tree shows the ten disabled.                                                                  |
| R6  | Move by cut → paste, no drag, dedupe on collision                | Pass    | Spec: no `[draggable="true"]` anywhere; copy → paste issued `src=a.txt&dst=a (1).txt`.                                                                                                                                                             |
| R7  | Preview text and images, markdown toggle, save, download         | Pass    | Browser: README.md rendered as markdown, toggle switched to a highlighted editable source (`contenteditable="true"`), header carries refresh / toggle / download.                                                                                  |
| R8  | Refresh reloads the tree and the open file                       | Pass    | The viewer is keyed on `refreshToken`, so refresh remounts and re-reads; refresh re-lists every expanded directory.                                                                                                                                |
| R9  | `createOnly` on new file; delete confirms; removeAll vs remove   | Pass    | Browser: creating `README.md` where it exists produced "Create file failed: “README.md” already exists here." and the request carried `create_only=true`; no overwrite.                                                                            |
| R10 | `readOnly` removes every mutating affordance                     | Pass    | Browser: both toolbars fell to Download + Refresh; the menu lost rename/delete; an **already-open** editor flipped to `contenteditable="false"` and the toggle relabelled to "View rendered".                                                      |
| R11 | `rootPath` locks the tree                                        | Pass    | Spec: with `rootPath="notes"` the only path listed is `notes` and the sibling `a.txt` never renders.                                                                                                                                               |
| R12 | Empty-directory copy; no sandbox wording, no Nudge               | Pass    | Spec asserts the rendered text contains neither "sandbox" nor "nudge". Browser: `empty/` showed "This directory is empty".                                                                                                                         |
| R13 | 400 / 403 / 404 / 409 read as sentences, not raw JSON            | Pass    | Spec: a 403 listing renders "You do not have access to this volume." Browser: the 409 rendered as the sentence above.                                                                                                                              |
| R14 | `sourceSetExplorer.*` namespace, en-US and zh-TW complete        | Pass    | 49 keys × 3 locales (147 entries). Browser at zh-TW: toolbar "檔案操作" and the ten actions in Chinese, empty state "這個目錄是空的" — the spec's exact wording.                                                                                   |
| R15 | Paging: loading, shortfall by count, failure ≠ partial-as-whole  | Pass    | Browser: a directory claiming 12,000 and serving 1,200 rendered "10800 more entries not loaded"; a 1,200-entry directory with an honest total paged twice and showed **no** notice. Spec covers the 403 case showing the error instead of "empty". |
| R16 | Root measures identical to `file-explorer-panel`'s root          | Pass    | Measured both in Chrome: font-family `-apple-system, "system-ui", …`, font-size `13px`, line-height `normal`, background `rgb(255, 255, 255)`, border `1px solid rgba(0, 0, 0, 0.1)`, border-radius `8px` — identical on all six.                  |
| R17 | Demo route beside the sandbox one, env-switchable                | Partial | The route exists at `/source-set-explorer`, coexists with `/file-explorer`, and reads `VITE_SOURCE_SET_*`. **The live-endpoint branch was not exercised** — no volume endpoint or key available (D3).                                              |
| R18 | README documents the four recipes and the three traps            | Pass    | `packages/react/README.md` §SourceSet File Explorer: the four-row table, "do not pass apiKey to a BFF relay", "Directory paths are already prefixed", "there is no watch".                                                                         |
| R19 | Smoke check — build, tests, browser walk at both widths          | Pass    | Both builds green, 539 tests green, browser walk above covering both mounts. Console clean apart from two pre-existing React Router future-flag warnings present on every demo route.                                                              |

### §3.1 Acceptance

- [x] Every R# executed through Step 1 (static read) + Step 2 (test / browser) + Step 3 (boundaries)
- [x] Each R# marked, with the observed result recorded
- [x] Vitest run and green
- [x] Loading, error and empty-state boundaries confirmed (per-node spinner during the paging walk, 403
      listing error, empty directory, 409 conflict, shortfall notice)

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **Four `setTimeout` occurrences, none of them a faked delay — but one deserves a second opinion.**
   `blob.ts:46` defers `revokeObjectURL` past the click that starts the download, because revoking in
   the same tick can beat the navigation and silently cancel it. `file-view.tsx:107/113` is the debounced
   save, carried over unchanged from the shipped viewer. `volume-mock.ts:112` adds 120 ms to the demo's
   in-memory volume, which is a simulated delay — but in a fake server in the demo app, not in shipped
   library code, and it is what makes F-026's per-node loading state observable by hand at all. Recorded
   rather than silently accepted because §7 greps for exactly this token.

2. **`listAll` still has no cancellation.** Collapsing a large directory mid-walk leaves up to ten
   further requests in flight; the React side ignores the stale result (a per-path request ticket in
   `use-source-set-explorer.ts`), so no wrong state can land, but the traffic is wasted. This is
   REVIEW-060's first Minor, unchanged: fixing it properly means an `AbortSignal` on the core client,
   which is out of BUILD-061's scope. Carry to the F-027 cycle or a follow-up.

3. **TASK-004's "against a real dev volume" half is unverified.** Recorded here so it is not mistaken
   for done: R17's env branch and the eight actions against a live SourceSet still need one pass once an
   endpoint and key are on hand. Everything else was exercised against the mock, which does implement the
   real wire contract (paging, `create_only` → 409, error statuses).

4. **`overclaimed`-style backends are indistinguishable from a cap hit.** `SourceSetListAllResult.complete`
   is deliberately one boolean for three causes, so the UI says "N more entries not loaded" whether the
   cap stopped the walk or the backend stopped producing. That is REVIEW-060's second Minor and remains
   the right trade-off for a user-facing message; noted only so nobody reads the notice as proof of a cap.

---

## Execution Log

- 2026-08-15: REVIEW task created, paired with BUILD-061 (Status: `draft`).
- 2026-08-15: BUILD-061 reached `done`; review unblocked (Status: `draft → ready`).
- 2026-08-15: §1 static review — 19 ✅ / 0 ❌ (3 n/a); all greps clean; lint 0 errors, format clean for
  the change set, build and typecheck green. §3 functional validation — R1–R16, R18, R19 Pass; R17
  Partial (live-endpoint branch unverified, D3). 0 BLOCKERs, 4 Minors recorded
  (Status: `ready → done`).
