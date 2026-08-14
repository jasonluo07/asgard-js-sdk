# BUILD-061 Standalone SourceSet File Explorer

## Meta

- Task ID: `BUILD-061`
- Status: `done`
- Issue: https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/76 (F-025) ·
  https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/77 (F-026, UI half) ·
  https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/78 (TASK-004)
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-025-sourceset-file-explorer-元件.md`
  (＋ `features/F-026-sourceset-volume-大目錄分頁載入.md`、`tasks/TASK-004-sourceset-file-explorer-demo-route-與接入文件.md`)
- Complexity: `L`

---

## Brief

Build `SourceSetFileExplorer` as a **self-contained module** under
`packages/react/src/components/source-set-explorer/`, mounted on a SourceSet volume through the
`AsgardSourceSetClient` that BUILD-060 already shipped in core. It is a chat-free, sandbox-free file
manager: a tree, a toolbar, a context menu, and a file view, driven only by `sourceSetEndpoint` plus
either `apiKey` or `customHeaders`.

F-025's binding constraint is that the shipped in-sandbox explorer at
`packages/react/src/components/file-explorer/` is **not touched** — `git diff` over that directory must
come back empty. The two file systems differ in root convention (volume-relative `''` vs container
absolute), listing model (real paging vs `truncated`), and capability set (no sandbox picker, no Nudge,
no heartbeat, no watch, but yes read-only), so this task builds its own shell rather than widening the
existing one. This is a deliberate re-do: the first attempt composed the shared parts and was withdrawn
along with [asgard-sdk-pm#79](https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/79).

The task also lands F-026's UI half — the tree must show a directory loading while it auto-pages, and
say how many entries are missing when the cap stops the walk — and TASK-004's demo route and README
section.

**Already exists:**

- `packages/core/src/lib/source-set-client.ts` — `AsgardSourceSetClient` with `list` / `listAll` /
  `read` / `write` / `stat` / `copy` / `move` / `remove` / `removeAll` / `upload`, `SOURCE_SET_MAX_PAGE_SIZE`,
  `SOURCE_SET_DEFAULT_MAX_ENTRIES` (BUILD-060, on the base branch)
- `packages/core/src/lib/source-set-path.ts` — volume-relative `joinPath` / `parentDir`
- `packages/react/src/components/file-explorer/context-menu.tsx` — generic menu shell, zero sandbox
  concepts; imported, not modified
- `packages/react/src/components/file-explorer/types.ts` — `FsEntry`; imported, not modified
- `packages/react/src/components/file-explorer/{icons,file-explorer-dialog,code-editor,file-view}.tsx` —
  leaf UI; **copied** into the new module per F-025 ("在 F-027 定案前，先在本票內複製一份"), with
  `file-view` added to that list by D1 below

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

> §6 does **not** apply across the module boundary here: the leaf-UI copies are mandated by F-025 and
> deduplicated later by F-027. Extract within `source-set-explorer/` only.

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When the reviewer runs `git diff main...HEAD -- packages/react/src/components/file-explorer/`,
  the system shall produce empty output. → T1, T10
- `R2` When a consumer imports from `@asgard-js/react`, the system shall expose
  `SourceSetFileExplorer` and its props type from the package entry, implemented wholly under
  `packages/react/src/components/source-set-explorer/`. → T2, T9
- `R3` When the component is given only `sourceSetEndpoint` plus either `apiKey` or `customHeaders`,
  the system shall render the volume and perform every action without further configuration, and shall
  not read any chat context (`useAsgardContext` and friends). → T3, T4
- `R4` When the user interacts with the tree, the system shall lazily list directories on expand,
  select on single click (toggling expand/collapse for a directory), open the file on double click, and
  open the context menu on right click — with directories sorted before files and each group by name.
  → T4
- `R5` When the toolbar and the context menu are open, the system shall offer the same ten actions —
  new file, new folder, upload, download, copy, cut, paste, rename, delete, refresh — and shall
  **disable** (not hide) the ones that need a selection when nothing is selected. → T5
- `R6` When the user moves an entry, the system shall do so via cut → paste with no in-tree drag
  affordance, and shall auto-deduplicate the name on a collision in the destination directory. → T5
- `R7` When a file is opened, the system shall preview text and images, toggle markdown between
  rendered preview and editable source, save edits back to the volume, and offer download. → T6
- `R8` When the user presses refresh, the system shall reload the current tree and the open file. → T5, T6
- `R9` When the user creates a file whose name already exists, the system shall send `createOnly` and
  surface "a file with this name already exists" rather than overwriting; when the user deletes, the
  system shall confirm first and route directories to `removeAll` and files to `remove`. → T5
- `R10` When `readOnly` is true, the system shall not render any mutating affordance — context-menu
  items, toolbar buttons, **and the file view's edit entry point**. → T5, T6
- `R11` When `rootPath` is set, the system shall root the tree there and give the user no way to
  navigate above it. → T3, T4
- `R12` When a directory is empty, the system shall show "this directory is empty", and shall nowhere
  render the words sandbox or a Nudge control. → T4, T7
- `R13` When the volume answers 400 / 403 / 404 / 409, the system shall show an intelligible message
  rather than raw JSON. → T7
- `R14` When any user-facing string is rendered, the system shall resolve it through a new
  `sourceSetExplorer.*` i18n namespace (not `fileExplorer.*`), complete in both `en-US` and `zh-TW`. → T7
- `R15` When a directory holds more entries than one page, the system shall show that node as loading
  while it auto-pages, show "N more entries not loaded" when the cap stops the walk, surface an error
  without presenting a partial listing as complete when any page fails, and keep the UI responsive at
  ≥ 1000 entries. → T8
- `R16` When the component root is measured in the browser, the system shall report the same
  `font-family`, `font-size`, `line-height`, `background`, `border` and `border-radius` as the
  `file-explorer-panel` root. → T9
- `R17` When the developer opens the react-demo, the system shall serve a `source-set-explorer` route
  alongside the existing sandbox `file-explorer` route, with endpoint and token switchable by
  environment variable and no code edit. → T11
- `R18` When a reader opens `README.md`, the system shall document the four mounting recipes (direct
  edge, Platform SourceSet, Platform SkillSet, Agent Hub Directory) with a copyable
  `<SourceSetFileExplorer …/>` example, and state explicitly that a BFF relay must not be given
  `apiKey`, that Directory paths are already prefixed by the BFF, and that there is no watch — refresh
  is the mechanism. → T12
- `R19` (Smoke check) When the developer runs `npm run build:core && npm run build:react` followed by
  `npm run test:packages` and `npm run serve:react-demo` (http://localhost:4200), the system shall
  build with no errors, pass every spec, and walk R3–R17 in the browser at both narrow and wide
  widths. → T13, T14

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1): Create `packages/react/src/components/source-set-explorer/` and copy the leaf UI
      (`icons`, `file-explorer-dialog`, `code-editor`, `file-view` — per D1) into it, giving the
      file-view copy an `editable` flag. Import `ContextMenu` and `FsEntry` from the existing module by
      path; change nothing there.
- [x] T2 (R2): Define `SourceSetFileExplorerProps` and the module's internal `SourceSetNode` /
      state types before first use.
- [x] T3 (R3, R11): Wire `AsgardSourceSetClient` from `sourceSetEndpoint` / `apiKey` /
      `customHeaders`; resolve `rootPath` and `initialPath` volume-relative (root is `''`, not `/`).
- [x] T4 (R4, R11, R12): Build the tree — lazy listing, click / double-click / right-click, dir-first
      name sort, empty-directory state.
- [x] T5 (R5, R6, R8, R9, R10): Build the toolbar and context menu over one shared action table so the
      two cannot drift; wire create (`createOnly`) / mkdir / upload / download / copy / cut / paste
      (with dedupe) / rename / delete (confirm; `removeAll` vs `remove`) / refresh; gate on selection
      and on `readOnly`.
- [x] T6 (R7, R8, R10): Mount the file view — preview, markdown toggle, save, download, refresh — and
      suppress its edit entry point under `readOnly`.
- [x] T7 (R12, R13, R14): Add the `sourceSetExplorer.*` namespace to `packages/react/src/i18n.ts` with
      `en-US` and `zh-TW` complete; map HTTP status to intelligible copy.
- [x] T8 (R15): Drive listings through `listAll`; render per-node loading, the cap notice using
      `total - entries.length`, and a failure that does not pass a partial listing off as complete.
- [x] T9 (R2, R16): Export from `packages/react/src/components/index.ts` and the package entry; style
      the root to match `file-explorer-panel`'s root.
- [x] T10 (R1): Add a spec that fails if `source-set-explorer/` reaches into the shared module for
      anything beyond the sanctioned imports.
- [x] T11 (R17): Add the `source-set-explorer` demo route, register it, and read endpoint / token from
      `VITE_*` variables documented in `.env.example`.
- [x] T12 (R18): Write the README section.
- [x] T13: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck` +
      `npm run build:core && npm run build:react`.
- [x] T14 (R19): Smoke check — `npm run test:packages`, then `npm run serve:react-demo` and walk
      R3–R17 at narrow and wide widths; screenshots go to the local verification handover, not the repo.

---

## Coverage

Use Cases: R1–R19. R17's environment-variable branch and R19's "against a real dev volume" half are
**not** verified — no volume endpoint or key was available, so the demo was walked against the in-memory
mock (D3). Everything else was exercised in Vitest and in the browser at both widths.

Files:

`packages/react` (new module, `src/components/source-set-explorer/`)

- `source-set-file-explorer.tsx` — the public component: props, client construction, the one action
  table the toolbar and context menu both render, error bar, upload picker
- `use-source-set-explorer.ts` — listings / expansion / selection / clipboard state and every mutation
- `tree.tsx` — lazy tree, per-node loading, empty state, listing error, F-026 shortfall notice
- `paths.ts` (+ `paths.spec.ts`) — volume-relative join / parent / containment / dedupe / sort
- `errors.ts` — HTTP status → intelligible copy
- `blob.ts` — blob ↔ text / data URL, browser download
- `file-view.tsx`, `file-view.module.scss` — copy of the shipped viewer plus `editable` (D1)
- `code-editor.tsx`, `icons.tsx`, `dialog.tsx`, `dialog.module.scss` — copied leaf UI
- `source-set-explorer.module.scss` — root matched to `file-explorer-panel`'s root (R16)
- `index.ts` — the module's two exports
- `source-set-explorer.spec.tsx` — R4 / R5 / R6 / R9 / R10 / R12 / R13 / R15 against a fake volume at
  the `fetch` boundary, so the real client runs
- `module-boundary.spec.ts` — R1 / R3 enforced mechanically

`packages/react` (existing files, additive only)

- `src/components/index.ts` — re-export the new module
- `src/i18n.ts` — `sourceSetExplorer.*`, 49 keys × en-US / ja-JP / zh-TW
- `README.md` — the SourceSet File Explorer section (R18)

`apps/react-demo`

- `src/app/routes/source-set-explorer/{source-set-explorer.tsx,source-set-explorer.module.scss,volume-mock.ts,index.ts}`
- `src/app/app.tsx`, `src/app/routes/home/home.tsx`, `.env.example`

Repo root

- `README.md` — table-of-contents entries for the react section and the core client

**`packages/react/src/components/file-explorer/` — zero files changed (R1).**

---

## Resolved Decisions

All three come from conflicts inside the spec itself, not from implementation preference. Decided
2026-08-15, before implementation.

- **D1 — `FileView` reuse vs `readOnly`. → copy `FileView` into the new module.** F-025 says reuse
  `FileView` (R7) _and_ says every mutating affordance disappears under `readOnly` (R10). The shipped
  `FileView` renders its preview↔edit toggle unconditionally and exposes no prop to suppress it, so
  honoring both while keeping R1's empty diff is impossible. The copy carries an `editable` flag.
  This extends F-025's own "先在本票內複製一份" list from icons / dialog / code-editor to file-view;
  the capabilities the AC actually enumerates (text and image preview, markdown preview↔source, save,
  download) all survive the copy, and F-027 folds the duplicates back later. Rejected: adding one
  additive prop to the shared `FileView` (~5 lines, near-zero regression risk, but breaks R1 — the very
  AC this cycle exists to honor), and reusing as-is without `onSaveFile` (a read-only user could type
  edits that vanish silently — fails R10).
- **D2 — which design-system tokens. → `--asg-*`, exactly as the existing panel does.** F-025's token
  list (`--surface`, `--text-primary`, `--border`, `--radius-*`, `--font-family-*`) and its `.dark` /
  `.light` theme-scope requirement describe the chat-kit prototype's design system. This repo has
  neither: `file-explorer-panel.module.scss` is built on `--asg-color-*` / `--asg-font-family-*` with
  `var()` fallbacks and no scope class. F-025 also requires the new root to measure identical to that
  panel's root (R16), and the two rules cannot both hold. R16 wins because it is the one that is
  verifiable inside this repo; the prototype's token names are treated as prototype-local. R14's
  documentation note about theme scope therefore does not apply.
- **D3 — how the demo gets a volume. → in-memory mock volume, with the real endpoint still reachable
  by env.** TASK-004 wants the demo to drive a real dev SourceSet through all eight actions, but no
  volume endpoint or key is on hand. The route ships a mock volume that covers paging, 409 collisions
  and error statuses so R3–R17 are walkable with no credentials, and keeps the `VITE_*` switch to a
  real endpoint for a later pass once a key exists. R17's env-switch requirement is satisfied either
  way; the "against dev" half of TASK-004 stays open and must be stated as unverified, not implied.

---

## Execution Log / Change Log

- 2026-08-15: BUILD task created from
  [asgard-sdk-pm#76](https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/76),
  [#77](https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/77),
  [#78](https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/78) (Status: `draft`).
  Supersedes the withdrawn composition-route attempt (closed PR #439).
- 2026-08-15: D1 / D2 / D3 decided (see Resolved Decisions); plan confirmed (Status: `draft → ready`).
- 2026-08-15: Implementation started (Status: `ready → in-progress`).
- 2026-08-15: All R# implemented. `git diff main...HEAD -- packages/react/src/components/file-explorer/`
  empty (R1). lint 0 errors / 5 warnings (all pre-existing shapes, including the same
  `exhaustive-deps` warning the shipped file view carries), `format:check` clean, `typecheck` green over
  core + react + react-demo, both builds green, `test:packages` 58 files / 539 tests passing (35 of them
  new). Browser walk at 1440px covering both mounts: shortfall notice read "10800 more entries not
  loaded" on a directory claiming 12,000 and serving 1,200, while a 1,200-entry directory with an honest
  total produced no notice; `readOnly` cut both toolbars to Download + Refresh and turned an already-open
  editor to `contenteditable="false"`; a duplicate create surfaced "Create file failed: “README.md”
  already exists here."; zh-TW resolved throughout; root measured font-family / 13px / normal /
  rgb(255,255,255) / 1px solid rgba(0,0,0,0.1) / 8px — identical to `file-explorer-panel`'s root (R16).
  Console clean apart from two pre-existing React Router future-flag warnings.
  (Status: `in-progress → done`).
