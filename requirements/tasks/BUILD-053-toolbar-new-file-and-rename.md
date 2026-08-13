# BUILD-053 Give the File Explorer toolbar the new-file and rename actions

## Meta

- Task ID: `BUILD-053`
- Status: `in-progress`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/68`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-021-sandbox-working-directory-file-explorer-側欄.md`
- Complexity: `S`

---

## Brief

`FileExplorerToolbar` renders eight fixed buttons (new folder / upload / download ｜ copy / cut / paste / delete ｜
refresh) while the right-click menu built by `buildSections` in the same file offers ten actions — the union
includes **new file** (`actNewFile`) and **rename** (`actRename`), which the toolbar never grew. F-021 AC2 listed
only copy / move / upload / download / mkdir / delete, so the toolbar was correct when written and the context
menu is what moved ahead; the consumer spec (`asgard-sindri-pm` `docs/spec/asgard-sindri/panels.md` §檔案樹) now
requires both entry points to offer the same set of actions.

**Where this came from, and what "done" means.** Sindri's 2026-08-12 acceptance run failed F-004 AC3 and opened
`asgard-ai-platform/asgard-sindri-pm#208` (BUG-014); F-004 sits on the board at **Pending fix** and returns to
In review — for PM to re-test — once this ships. So the criterion to satisfy is not this task's own R# but
Sindri F-004 AC3 verbatim: 「工具列與右鍵選單提供同一組動作：新增檔案、新增資料夾、上傳、下載、複製、剪下、
貼上、重新命名、刪除、重新整理」.

That AC3 line also settles the button order, and it agrees exactly with the consumer spec's ordered action set
(`asgard-sindri-pm` `docs/spec/asgard-sindri/panels.md` §檔案樹), whose three lines map one-to-one onto the
toolbar's three existing separator groups: `新增檔案、新增資料夾、上傳、下載` ｜ `複製、剪下、貼上、重新命名、
刪除` ｜ `重新整理`. Two independent sources, same order — the placement is not a judgment call. The pinned
prototype (`references/asgard-chat-kit-prototype/src/FileExplorerPanel.tsx`) has neither button, which is
consistent with the issue's account that the toolbar simply never grew them.

Both actions already live on `FileExplorerContext` — the toolbar needs no new capability and no public API change.
The change is confined to `FileExplorerToolbar` in
`packages/react/src/components/file-explorer/file-explorer-parts.tsx`; both Sindri surfaces (conversation Files
panel and the directory file tab) assemble `FileExplorer.Workspace` and therefore share this one toolbar.

**Already exists:** `packages/react/src/components/file-explorer/file-explorer-parts.tsx` (`FileExplorerToolbar`,
`buildSections`), `file-explorer-context.tsx` (`actNewFile`, `actRename`, `targetDir`, `selectedEntry`,
`providers.saveFile`, `providers.move`), `icons.tsx` (`FilePlusIcon`, `PencilIcon`), `i18n.ts`
(`fileExplorer.newFile`, `fileExplorer.rename` — already translated for all three locales).

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

- `R1` When the File Explorer toolbar renders, the system shall present a **new-file** button immediately **before**
  the existing new-folder button, labelled and titled `fileExplorer.newFile` — the order the consumer spec lists
  for the first group (`新增檔案、新增資料夾、上傳、下載`). → T1
- `R2` When the user activates the new-file button, the system shall call `actNewFile(targetDir)` — the selected
  directory when a directory is selected, otherwise the tree root — i.e. the same target rule the new-folder and
  paste buttons already use. → T1
- `R3` When `providers.saveFile` is absent, the system shall render the new-file button disabled, mirroring how the
  context menu's new-file item is gated. → T1
- `R4` When the File Explorer toolbar renders, the system shall present a **rename** button labelled and titled
  `fileExplorer.rename`, placed **between paste and delete** — the order the consumer spec lists for the second
  group (`複製、剪下、貼上、重新命名、刪除`). → T2
- `R5` When a single entry (file or directory) is selected and `providers.move` is available, the system shall
  enable the rename button and, on activation, call `actRename(selectedEntry)`; when nothing is selected or
  `providers.move` is absent, the system shall render it disabled — the same gating shape as download and delete. → T2
- `R6` When either new-file or rename runs from the toolbar, the system shall produce the same outcome as running
  the corresponding right-click item (same prompt dialog, same refresh/expand behaviour), because both call the
  identical context action. → T1, T2
- `R7` (Found during build) When the toolbar is narrower than its content, the system shall keep every action
  reachable by wrapping the row, rather than painting the overflow outside the panel over whatever follows; at
  ≥375px it shall still be a single row. Measured: the row has no scroll and no clipping, eight buttons already
  spilled at the default theme's 225px aside, and ten exactly fill the built-in aside's own 20rem — so adding
  these two removed the last headroom at the width the component ships at. An unreachable Refresh button is not
  "the toolbar offers this action", so this is part of AC3 rather than a separate concern. → T3
- `R8` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and exercises the toolbar
  in the react-demo (`npm run serve:react-demo`, http://localhost:4200) `/file-explorer` route,
  the system shall show ten toolbar buttons whose enabled/disabled states track selection, and creating a file and
  renaming an entry from the toolbar shall update the tree — with no build errors and `npm run test:packages` green. → T5, T6
- `R9` (Downstream acceptance) When this branch is packed with `npm pack` and installed into
  `asgard-ai-agent-hub-web`, the directory 檔案 tab toolbar shall present the ten actions in the order
  Sindri F-004 AC3 lists — 新增檔案、新增資料夾、上傳、下載、複製、剪下、貼上、重新命名、刪除、重新整理 —
  so the criterion that FAILed on 2026-08-12 (and put F-004 on the board's Pending fix) now passes. → T7

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R2, R3, R6): Add the new-file toolbar button to `FileExplorerToolbar`, before new folder; wire
      `actNewFile(targetDir)`, gate on `providers.saveFile`, reuse `FilePlusIcon` and the `fileExplorer.newFile` key.
- [x] T2 (R4, R5, R6): Add the rename toolbar button between paste and delete; wire `actRename(selectedEntry)`,
      gate on `!move || !selectedEntry`, reuse `PencilIcon` and `fileExplorer.rename`.
- [x] T3 (R7): Let the toolbar row wrap so a set that outgrows the panel stays reachable.
- [x] T4 (R1–R6): Extend the File Explorer Vitest suite with a case asserting both buttons exist, their
      disabled states track selection and provider availability, and activation calls the same providers the
      context-menu path calls.
- [x] T5: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run build:core && npm run build:react` + `npm run test:packages`.
- [x] T6 (R8): Smoke check in the react-demo `/file-explorer` route at both narrow and wide widths; walk every R#.
- [ ] T7 (R9): `npm pack` both packages, install into `asgard-ai-agent-hub-web`, and re-walk Sindri F-004 AC3 on the
      directory 檔案 tab (and the conversation Files panel, which shares the toolbar).

---

## Coverage

Use Cases: R1–R8 verified (R9 pending the downstream install). Traces to Sindri F-004 AC3 / UC-005.

Files:

- `packages/react/src/components/file-explorer/file-explorer-parts.tsx` (react) — new-file and rename buttons in
  `FileExplorerToolbar`, in the spec's order.
- `packages/react/src/components/file-explorer/file-explorer-panel.module.scss` (react) — `.toolbar` wraps (R7).
- `packages/react/src/components/file-explorer/action-parity.spec.tsx` (react, new) — shared with BUILD-054.
- `apps/react-demo/src/app/routes/file-explorer/file-explorer.tsx` (demo) — route copy updated to the ten actions.

---

## Execution Log / Change Log

- 2026-08-13: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/68 (Status: `draft`).
- 2026-08-13: Plan confirmed after checking the pinned prototype and the consumer spec; button order and download semantics sourced from them (Status: `draft → ready`).
- 2026-08-13: Implementation started (Status: `ready → in-progress`).
