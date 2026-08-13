# BUILD-054 Add a download action to the file viewer header

## Meta

- Task ID: `BUILD-054`
- Status: `in-progress`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/69`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-021-sandbox-working-directory-file-explorer-側欄.md`
- Complexity: `S`

---

## Brief

`FileView`'s header carries only three controls — back-to-tree, reload, and the preview↔edit toggle — and
`file-view.tsx` contains no download code at all. Download exists only at the tree level (toolbar and right-click,
both through `providers.download`), so a user who has opened a file must go back to the tree and re-select it to
download. F-021 AC3 only required the two-mode toggle and a manual refresh, so this is a standing gap rather than
a regression; the consumer spec (`asgard-sindri-pm` `docs/spec/asgard-sindri/panels.md` §檔案檢視器) specifies a
download button on the viewer header.

The change adds an optional `onDownload` prop to `FileView` and a header button rendered after the preview/source
toggle, wired by `FileExplorerView` in `file-explorer-parts.tsx` to the same `actDownload(openFile)` the tree uses,
so a download started from the viewer is byte-for-byte the tree's download. `FileViewProps` is exported public API;
the new prop is optional, so no consumer breaks.

**Which content gets downloaded** is settled by the pinned prototype, not inferred: its `FileView` already carries
this button (`references/asgard-chat-kit-prototype/src/FileView.tsx`) and `FileExplorerPanel.tsx` hands it the very
same `onDownload` the tree uses, declared `// GET fs/file`. So the consumer spec's phrase 「以檔案目前內容產生下載」
means _the file's current content_ rather than a cached copy — it is not a request to serialize the unsaved editor
buffer. **One deliberate divergence from the prototype:** it _hides_ the button when no handler is supplied, while
issue #69 asks for it _disabled_; the issue wins, and disabled also matches how the toolbar's own download is gated.

**Out of scope (noted, not changed):** the consumer spec says the preview/source toggle shows 「僅 markdown 檔顯示」,
while `FileView` renders it for every non-image file (text and code preview read-only, edit writable). That is a
pre-existing divergence on the same header row, covered by neither issue; flag it to PM rather than fix it here.

**Already exists:** `packages/react/src/components/file-explorer/file-view.tsx` (`FileView`, `FileViewProps`,
header `actions` block), `file-explorer-parts.tsx` (`FileExplorerView`), `file-explorer-context.tsx`
(`actDownload`, `providers.download`), `icons.tsx` (`DownloadIcon`), `i18n.ts` (`fileExplorer.download` —
already translated for all three locales).

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

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a file is open in the viewer, the system shall render a download button in the header's right-hand
  action group, positioned **after** the preview/source toggle, labelled and titled `fileExplorer.download`. → T1
- `R2` When the user activates the viewer's download button, the system shall run the same download the file tree
  runs for that entry — `providers.download(activeSourceId, file.path, file.name)` via the shared `actDownload` —
  so the saved file name is the original file name. → T1, T2
- `R3` When `providers.download` is absent, the system shall render the viewer's download button disabled, matching
  how the toolbar and context-menu download items are gated. → T1, T2
- `R4` When an **image** file is open (no preview/edit toggle rendered), the system shall still render the download
  button — download does not depend on the toggle. → T1
- `R5` When a consumer renders `FileView` directly without the new download prop, the system shall omit the button
  and compile unchanged — the prop is optional and no existing `FileViewProps` member changes. → T1
- `R6` (Downstream acceptance) When this branch is packed with `npm pack` and installed into
  `asgard-ai-agent-hub-web`, opening a file from the directory 檔案 tab shall show a working download button in the
  viewer header, satisfying the 「可下載」 clause of Sindri F-004 AC5 — the gap PM flagged on 2026-08-12 as
  "SDK 元件本身沒有還是消費端漏接" and which this task confirms was the SDK's. → T6
- `R7` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and opens a file in the
  react-demo (`npm run serve:react-demo`, http://localhost:4200) `/file-explorer` route, the
  system shall show the download button in the viewer header and produce a file download named after the opened
  file — with no build errors and `npm run test:packages` green. → T4, T5

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R3, R4, R5): Add optional `onDownload` + `downloadDisabled` props to `FileViewProps`; render the
      button after the toggle (and outside the `canToggle` branch) using `DownloadIcon` and `fileExplorer.download`.
- [x] T2 (R2, R3): Wire it in `FileExplorerView` from the context's `actDownload(openFile)` and `providers.download`;
      give `.actionBtn` the disabled treatment `.toolBtn` already had, since nothing in the viewer was disableable
      before and a greyed-out button would otherwise still light up on hover.
- [x] T3 (R1–R5): Extend the File Explorer Vitest suite: the button renders in the viewer header, is disabled with
      no `download` provider, calls the provider with the open file's path and name, and appears for image files.
- [x] T4: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run build:core && npm run build:react` + `npm run test:packages`.
- [x] T5 (R7): Smoke check in the react-demo `/file-explorer` route at both narrow and wide widths; walk every R#.
- [ ] T6 (R6): `npm pack` both packages, install into `asgard-ai-agent-hub-web`, and re-walk the 「可下載」 clause of
      Sindri F-004 AC5 by opening a file from the directory 檔案 tab.

---

## Coverage

Use Cases: R1–R5 and R7 verified (R6 pending the downstream install). Traces to Sindri F-004 AC5 / UC-006.

Files:

- `packages/react/src/components/file-explorer/file-view.tsx` (react) — `onDownload` / `downloadDisabled` props and
  the header button.
- `packages/react/src/components/file-explorer/file-view.module.scss` (react) — `.actionBtn` disabled treatment.
- `packages/react/src/components/file-explorer/file-explorer-parts.tsx` (react) — `FileExplorerView` wires the
  viewer's download to the tree's own `actDownload`.
- `packages/react/src/components/file-explorer/action-parity.spec.tsx` (react, new) — shared with BUILD-053.
- `apps/react-demo/src/app/routes/file-explorer/file-explorer.tsx` (demo) — the mock `download` provider now
  actually saves a file, so the demo can show the original file name being used.

---

## Execution Log / Change Log

- 2026-08-13: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/69 (Status: `draft`).
- 2026-08-13: Plan confirmed after checking the pinned prototype and the consumer spec; button order and download semantics sourced from them (Status: `draft → ready`).
- 2026-08-13: Implementation started (Status: `ready → in-progress`).
