# REVIEW-054 Review: File viewer download action

## Meta

- Task ID: `REVIEW-054`
- Status: `done`
- BUILD Task: `BUILD-054`
- Reviewed commit: `5a7e8cb1`
- Reviewed branch: `feat/68-69-file-explorer-action-parity`

---

## §1 Static Code Review

Scope: the files in BUILD-054 `## Coverage` — `file-view.tsx`, `file-view.module.scss`,
`file-explorer-parts.tsx`, `action-parity.spec.tsx`, and the demo route. Shares the mechanical grep run with
REVIEW-053 (same file set); `typecheck` / `lint` / `format` run project-wide.

### §1.1 Checklist

| Check item                                            | Rule      | Result                                                                                                                                                                                        |
| ----------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                                      | §1.1      | ✅ none                                                                                                                                                                                       |
| `@ts-ignore` / `eslint-disable`                       | §1.2      | ✅ none                                                                                                                                                                                       |
| `console.log` in library code                         | §1.3 §7   | ✅ none                                                                                                                                                                                       |
| Hardcoded API key / endpoint / namespace              | §1.4      | ✅ none — the viewer never constructs a URL; it calls the host's `download` provider                                                                                                          |
| RxJS / EventSource / timer teardown                   | §1.5      | ✅ the new button adds no subscription or timer; the existing `watchFile` teardown and save-timer cleanup are untouched                                                                       |
| react imports core via the public entry only          | §1.6      | ✅ no `@asgard-js/core/src` import                                                                                                                                                            |
| core imports react / react-dom / DOM                  | §1.6 §2.1 | ✅ core untouched by this task                                                                                                                                                                |
| Breaking public API without `@deprecated`             | §1.7      | ✅ `FileViewProps` gains two **optional** members; no existing member changed type, name, or optionality. A consumer rendering `FileView` without them compiles and renders exactly as before |
| New public types / components exported from the entry | §2.2      | ✅ `FileViewProps` was already exported; the added members ship with it                                                                                                                       |
| Template type + enum exist before the component       | §2.3      | ✅ n/a                                                                                                                                                                                        |
| `botProviderEndpoint`, not `endpoint`                 | §2.4      | ✅ unchanged                                                                                                                                                                                  |
| Explicit return types on exported functions           | §3.1      | ✅ `FileView(props): ReactNode`, `FileExplorerView(): ReactNode` unchanged; `onDownload?: () => void` declares its own                                                                        |
| Shared types centralized in core `src/types/`         | §3.2      | ✅ no new shared type — the props are local to this component's contract                                                                                                                      |
| React props fully typed                               | §4.1      | ✅ `onDownload?: () => void`, `downloadDisabled?: boolean`                                                                                                                                    |
| Hardcoded color values in components                  | §4.2      | ✅ the scss change adds `opacity` / `cursor` only; the `:hover` guard reuses the existing tokens                                                                                              |
| react / react-dom stay peerDependencies               | §4.4      | ✅ untouched                                                                                                                                                                                  |
| core and react share a version                        | §5        | ✅ both `0.3.62`                                                                                                                                                                              |
| Repeated logic / types / JSX extracted                | §6        | ✅ the download is not a second implementation — `FileExplorerView` hands the viewer the tree's own `actDownload`, so exactly one download path exists                                        |
| `setTimeout` mock delays / dead code / stray TODO     | §7        | ✅ none introduced; the two `setTimeout` hits are the pre-existing debounced save                                                                                                             |

### §1.2 Mechanical Grep

Same scan as REVIEW-053 (identical Coverage file set), re-run under `bash -c` after positive controls exposed a
zsh word-splitting false negative:

```
positive control 'aria-label' ......... 18 hits ✅
positive control 'Rename|rename' ...... 22 hits ✅
§1.1 any / as any ..................... no match ✅
§1.2 ts-ignore / eslint-disable ....... no match ✅
§1.3/§7 console.log ................... no match ✅
§1.4 api key / http endpoint .......... no match ✅
§1.6 react deep-imports core/src ...... no match ✅
§7  TODO / FIXME / dead commented code . no match ✅
§4.2 hex literals in the two scss ..... all inside `var(--asg-color-*, #fallback)`; this change adds none ✅
```

### §1.3 TypeScript and Lint

```
typecheck:packages: PASS — Successfully ran target typecheck for 2 projects
lint:packages:      PASS — 0 errors, 3 pre-existing warnings
format:check:       PASS
build:core+react:   PASS
react-demo tsc:     PASS — 0 errors
test:packages:      PASS — core 196, react 225
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked
- [x] No ❌ violations
- [x] All §1.2 greps run, with positive controls
- [x] `typecheck:packages` clean
- [x] `lint:packages` — 0 errors

---

## §3 Functional Validation

Coverage Use Cases: Sindri F-004 AC5 / UC-006. Validated in the react-demo plus Vitest, then downstream in
`asgard-ai-agent-hub-web` on a `0.3.63-local` `npm pack` build.

### R# Result Matrix

| R#  | Description                                               | Result | Note                                                                                                                                                                               |
| --- | --------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Download in the header, after the preview/source toggle   | Pass   | Live DOM order read as `back · reload · switch-to-editing · download` in both the demo and the consumer                                                                            |
| R2  | Runs the tree's own download; saved under the file's name | Pass   | **Read off the actual save**: patching `HTMLAnchorElement.prototype.click` captured `{download: 'README.md'}` in the demo. jsdom asserts `download(src-1, '/work/a.txt', 'a.txt')` |
| R3  | Disabled when `providers.download` is absent              | Pass   | jsdom, provider omitted → `disabled === true`. `.actionBtn` gained the `:disabled` treatment `.toolBtn` already had, and its `:hover` is now guarded, so it also _reads_ inert     |
| R4  | Present for an image, which has no toggle                 | Pass   | jsdom: opening `pic.png` shows the download button and no `switchToEdit` control                                                                                                   |
| R5  | A consumer omitting the prop keeps the old view           | Pass   | Both props optional; the button renders only when `onDownload` is supplied. `typecheck:packages` green with no call-site change anywhere in the repo                               |
| R6  | (Downstream) Sindri F-004 AC5「可下載」passes             | Pass   | Opening `notes.md` from the directory 檔案 tab shows an enabled download; clicking it saved `notes.md` through Sindri's own volume-backed provider                                 |
| R7  | (Smoke) build + Vitest + demo walkthrough at both widths  | Pass   | Demo `download` provider changed from a no-op to a real Blob save so the file name is observable; build green, 421 tests green                                                     |

### §3.1 Acceptance

- [x] Every R# executed (static read + browser operation + boundary conditions)
- [x] Each R# marked with its evidence
- [x] No e2e spec exists for this SDK; Vitest + demo + downstream consumer used instead
- [x] Boundary conditions confirmed: markdown, plain text, image (no toggle), provider absent, provider present,
      and a live consumer serving real bytes

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- **Divergence from the pinned prototype, taken deliberately.** The prototype _hides_ the viewer's download when
  no handler is supplied; issue #69 asks for it _disabled_. The issue won, and disabled matches how the toolbar
  and context-menu downloads are already gated. Recorded here so a later prototype diff does not read as a defect.
- **Pre-existing, outside this task.** The consumer spec says the preview/source toggle shows 「僅 markdown 檔顯示」,
  while `FileView` renders it for every non-image file. Same header row, neither issue covers it — raise with PM.
- **Unsaved-buffer window.** Saves debounce at 400ms, so a download fired inside that window returns the on-disk
  bytes rather than the buffer. This is what "the same download the tree runs" means and what the prototype does
  (`// GET fs/file`); noted because the spec sentence 「以檔案目前內容產生下載」 can be read the other way.

---

## Execution Log

- 2026-08-13: REVIEW task created, paired with BUILD-054 (Status: `draft`).
- 2026-08-13: §1 complete — 19 ✅ / 0 ❌. §3 complete — R1–R7 all Pass, including the downstream re-walk of the
  Sindri AC5 clause PM flagged on 2026-08-12. 0 BLOCKERs (Status: `draft → done`).
