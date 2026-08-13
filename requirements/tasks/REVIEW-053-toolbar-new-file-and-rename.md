# REVIEW-053 Review: Toolbar new-file and rename actions

## Meta

- Task ID: `REVIEW-053`
- Status: `done`
- BUILD Task: `BUILD-053`
- Reviewed commit: `5a7e8cb1`
- Reviewed branch: `feat/68-69-file-explorer-action-parity`

---

## §1 Static Code Review

Scope: the files in BUILD-053 `## Coverage` — `file-explorer-parts.tsx`, `file-explorer-panel.module.scss`,
`action-parity.spec.tsx`, and the demo route. `typecheck` / `lint` / `format` run project-wide.

### §1.1 Checklist

| Check item                                            | Rule      | Result                                                                                                                                        |
| ----------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                                      | §1.1      | ✅ none                                                                                                                                       |
| `@ts-ignore` / `eslint-disable`                       | §1.2      | ✅ none                                                                                                                                       |
| `console.log` in library code                         | §1.3 §7   | ✅ none                                                                                                                                       |
| Hardcoded API key / endpoint / namespace              | §1.4      | ✅ none                                                                                                                                       |
| RxJS / EventSource / timer teardown                   | §1.5      | ✅ n/a — the toolbar holds no subscription or timer; it reads context and calls existing actions                                              |
| react imports core via the public entry only          | §1.6      | ✅ no `@asgard-js/core/src` import                                                                                                            |
| core imports react / react-dom / DOM                  | §1.6 §2.1 | ✅ core untouched by this task                                                                                                                |
| Breaking public API without `@deprecated`             | §1.7      | ✅ no public signature changed — the two buttons call `actNewFile` / `actRename`, already on `FileExplorerContextValue`                       |
| New public types / components exported from the entry | §2.2      | ✅ nothing new to export                                                                                                                      |
| Template type + enum exist before the component       | §2.3      | ✅ n/a — no template involved                                                                                                                 |
| `botProviderEndpoint`, not `endpoint`                 | §2.4      | ✅ demo route unchanged in this respect                                                                                                       |
| Explicit return types on exported functions           | §3.1      | ✅ `FileExplorerToolbar(): ReactNode` unchanged                                                                                               |
| Shared types centralized in core `src/types/`         | §3.2      | ✅ no new type                                                                                                                                |
| React props fully typed                               | §4.1      | ✅ no new prop                                                                                                                                |
| Hardcoded color values in components                  | §4.2      | ✅ the scss change adds no color at all (`flex-wrap` only); every hex in the file remains a `var(--asg-color-*, …)` fallback                  |
| react / react-dom stay peerDependencies               | §4.4      | ✅ untouched                                                                                                                                  |
| core and react share a version                        | §5        | ✅ both `0.3.62`; the `0.3.63-local` pack was reverted, `git status` clean                                                                    |
| Repeated logic / types / JSX extracted                | §6        | ✅ the ten buttons are each a distinct action; extracting a `ToolButton` was considered and rejected — the disabled predicates all differ     |
| `setTimeout` mock delays / dead code / stray TODO     | §7        | ✅ no TODO, no commented-out code. The two `setTimeout` hits are the pre-existing debounced save in `file-view.tsx` (real debounce + cleanup) |

### §1.2 Mechanical Grep

Scanned the Coverage paths. **Two positive controls were run first.** The initial attempt ran under zsh, where
`$FILES` does not word-split, so grep received one bogus path and returned eight _false_ empty results — the exact
trap `REVIEW-052` recorded. Re-run under `bash -c`, the controls fire and the results below are real.

```
positive control 'aria-label' ......... 18 hits ✅ (proves the scan reads the files)
positive control 'Rename|rename' ...... 22 hits ✅
§1.1 any / as any ..................... no match ✅
§1.2 ts-ignore / eslint-disable ....... no match ✅
§1.3/§7 console.log ................... no match ✅
§1.4 api key / http endpoint .......... no match ✅
§1.6 react deep-imports core/src ...... no match ✅
§7  TODO / FIXME / dead commented code . no match ✅
§7  setTimeout ........................ 2 hits — file-view.tsx:123,127, pre-existing debounced save ✅
§4.2 hex literals in the two scss ..... all inside `var(--asg-color-*, #fallback)`; this change adds none ✅
```

### §1.3 TypeScript and Lint

`npm run lint:check` does not exist in this repo; used `lint:packages` (read-only). Type checking used
`typecheck:packages`, not the build — per `AGENTS.md`, vite builds print type errors while exiting `0`.

```
typecheck:packages: PASS — Successfully ran target typecheck for 2 projects
lint:packages:      PASS — 0 errors, 3 warnings, all pre-existing on main
                    (chat-composer aria-description, file-view exhaustive-deps,
                    per-source-view-state useless-fragment). None introduced here.
format:check:       PASS — all matched files use Prettier code style
build:core+react:   PASS
react-demo tsc:     PASS — 0 errors (program verified to include the changed route:
                    --listFiles shows 150 src files, the route among them)
test:packages:      PASS — core 10 files/196 tests, react 37 files/225 tests (8 new)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked
- [x] No ❌ violations
- [x] All §1.2 greps run, with positive controls after a false-negative was caught
- [x] `typecheck:packages` clean
- [x] `lint:packages` — 0 errors

---

## §3 Functional Validation

Coverage Use Cases: Sindri F-004 AC3 / UC-005. Validated against `npm run serve:react-demo`
(http://localhost:4200/file-explorer, three assemblies) plus Vitest, then downstream in
`asgard-ai-agent-hub-web` on a `0.3.63-local` `npm pack` build.

### R# Result Matrix

| R#  | Description                                                    | Result | Note                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | New-file button immediately before new folder                  | Pass   | Read off the live DOM in all three demo assemblies; label sequence matches AC3 exactly                                                                                                                        |
| R2  | New file targets the selected dir, else the tree root          | Pass   | Demo: with a file selected, created `created-from-toolbar.md` at the root. jsdom asserts `saveFile(src-1, '/work/untitled.txt', '')`                                                                          |
| R3  | New file disabled without `providers.saveFile`                 | Pass   | jsdom, providers omitted → `disabled === true`                                                                                                                                                                |
| R4  | Rename button between paste and delete                         | Pass   | Live DOM label sequence; jsdom asserts the full ten-label array                                                                                                                                               |
| R5  | Rename needs a single selection and `move`; disabled otherwise | Pass   | Demo: disabled with nothing selected, enabled after selecting `notes.txt`. jsdom covers both gates and asserts `move(src-1, '/work/a.txt', '/work/b.txt')`                                                    |
| R6  | Toolbar and context menu produce the same outcome              | Pass   | Both call the identical context action; the demo rename opened the same prompt dialog (`Rename`, default = current name) and the tree updated the same way                                                    |
| R7  | Toolbar stays reachable when narrower than its content         | Pass   | Measured before/after: at 320px eight buttons fit (318/318) but ten overflowed (322/318) with Refresh clipped; `flex-wrap: wrap` → 0 clipping at 225–320px, and the row is still a single 43px line at ≥375px |
| R8  | (Smoke) build + Vitest + demo walkthrough at both widths       | Pass   | 510px standalone panel and 319px built-in aside both walked; build green, 421 tests green                                                                                                                     |
| R9  | (Downstream) Sindri F-004 AC3 passes                           | Pass   | Directory 檔案 tab shows all ten in the AC3 order; new file → rename → delete round-tripped against the real volume API leaving the directory as found; conversation Files panel (419px) identical            |

### §3.1 Acceptance

- [x] Every R# executed (static read + browser operation + boundary conditions)
- [x] Each R# marked with its evidence
- [x] No e2e spec exists for this SDK; Vitest + demo + downstream consumer used instead
- [x] Boundary conditions confirmed: nothing selected, file selected, directory selected, providers absent,
      panel widths 200–510px, and a live consumer at 419px and 1214px

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- The consumer spec says the viewer's preview/source toggle shows 「僅 markdown 檔顯示」, while `FileView`
  renders it for every non-image file. Pre-existing, outside both issues, recorded in BUILD-054 to raise with PM.

---

## Execution Log

- 2026-08-13: REVIEW task created, paired with BUILD-053 (Status: `draft`).
- 2026-08-13: §1 complete — 19 ✅ / 0 ❌ after re-running the greps under bash with positive controls (the first
  zsh run produced eight false negatives). §3 complete — R1–R9 all Pass, including the downstream re-walk of the
  Sindri criterion that failed on 2026-08-12. 0 BLOCKERs (Status: `draft → done`).
