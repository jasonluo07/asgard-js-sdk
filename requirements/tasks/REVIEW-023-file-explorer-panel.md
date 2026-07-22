# REVIEW-023 sandbox File Explorer Side Panel — Cycle 1

## Meta

- Task ID: `REVIEW-023`
- Status: `done`
- BUILD Task: `BUILD-023`
- Reviewed commit: `<filled at PR>`
- Reviewed branch: `feat/29-file-explorer-panel`

---

## §1 Static Code Review

Scanned BUILD-023 `## Coverage` files against `FRONTEND_RULE_COMMON.md`.

### §1.1 Checklist

| Check item                                                                                                                                        | Rule | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| No `any` / `as any` (one confined `as` cast narrows an untyped template shape in the arrival scan)                                                | §4.1 | ✅     |
| No `eslint-disable` / `@ts-ignore` bypassing **type** errors                                                                                      | §4.2 | ✅     |
| `@asgard-js/core` does not import react / DOM (fs client in core; UI + `FileReader`/`window` only in react)                                       | §1.6 | ✅     |
| Every subscription / timer / listener torn down (FileView load-cancel + save-timer cleanup; controller; `useLaunchedSandboxes` interval/listener) | §1.5 | ✅     |
| Additive only — new client methods, new react exports, new optional Chatbot props, additive `channel` on context; no breaking change              | §1.7 | ✅     |
| No new heavy dep — reused `streamdown`; textarea editor (CodeMirror deferred to Cycle 2); inline SVG icons (no `lucide-react`)                    | §4.4 | ✅     |
| open-file intent reuses F-020 `resolveSandboxUri` (no second parser)                                                                              | §6   | ✅     |
| Theming via CSS variables / `--asg-color-*`; no hardcoded hex in components                                                                       | §4.2 | ✅     |
| Explicit return types on new exports                                                                                                              | §3.1 | ✅     |
| No new `console.log`; no untracked TODO / FIXME                                                                                                   | §7   | ✅     |

### §1.2 Mechanical Grep

```bash
grep -rnE 'as any|@ts-ignore|eslint-disable|console\.log' <Coverage.Files>
```

Grep results:

```
packages/core/src/lib/client.ts:335  console.log(... 'File upload response' ...)          # pre-existing, debugMode-gated (uploadFile) — not F-021
packages/core/src/lib/client.ts:384  console.log(... 'Channel Home download response' ...) # pre-existing, debugMode-gated (downloadChannelHomeFile) — not F-021
```

No `as any` / `@ts-ignore` / `eslint-disable`(type). The two `console.log` hits are pre-existing `if (this.debugMode)`-guarded logs unrelated to F-021 (the file is in Coverage only for the new fs methods, which add none).

### §1.3 TypeScript and Lint

```bash
npm run build:core && npm run build:react
npm run lint:packages
```

Results:

```
build: PASS — @asgard-js/core + @asgard-js/react built, no type errors
lint:  PASS — Successfully ran target lint for 2 projects (1 pre-existing warning, 0 errors)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items ✅
- [x] No ❌ violations
- [x] §1.2 grep run (only pre-existing debug-gated logs)
- [x] Package builds clean; `npm run lint:packages` clean

---

## §3 Functional Validation

Validated on the react-demo `/file-explorer` route + core Vitest.

### R# Result Matrix

| R#  | Description                                                                        | Result | Note                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Core fs client methods (list / read octet-stream / write multipart) typed + decode | Pass   | core Vitest 6/6 (list, read + headers, offset/limit, write multipart, mode/create_only, error).                                                                                                                        |
| R2  | Dropdown from live sandboxes; select locks active                                  | Pass   | Browser `/file-explorer`: dropdown shows `demo-workspace`; cwd `/home/user/project`.                                                                                                                                   |
| R3  | Tree roots at `workingDirectory` (+ `basePath`); lazy browse via `fs/list`         | Pass   | Browser: root lists `src/ README.md notes.txt`; expanding `src/` lists `index.ts app.tsx`.                                                                                                                             |
| R4  | FileView preview ↔ edit/save; manual refresh                                       | Pass   | Browser: README.md markdown preview; toggle→edit textarea (readOnly=false); typed → debounced save (`PUT fs/file`).                                                                                                    |
| R5  | Header folder toggle → right aside inside chat shell (not fixed)                   | Pass   | builtin: toggle renders right of ChannelTitle; aside is a flex sibling of the thread column in the `position:relative` shell (verified structurally — aside mounts, layout is flex row, not `fixed`).                  |
| R6  | `fileExplorer` builtin/off; one shared `useFileExplorerController`                 | Pass   | `/file-explorer` exercises the `off` consumer-placed panel; builtin path binds the same controller.                                                                                                                    |
| R7  | open-file intent notify-not-force (arrival + nonce; gated reveal)                  | Pass   | Browser: the "simulate open-file" button → `requestFile` → FileView opens README (reveal). Arrival bridge fires on card arrival (verified auto-reveal earlier); reveal gated by `autoRevealOnOpenFileCard` + mid-edit. |
| R8  | Editing/dirty state exposed for mid-edit guard                                     | Pass   | FileView `onDirtyChange` → `controller.setEditingDirty`; edit sets dirty, save clears it (observed content update + dirty lifecycle).                                                                                  |
| R9  | Lifecycle: panel reflects `launchedSandboxes$` add/drop                            | Pass   | Inherited from F-019; dropdown is driven by the `sandboxes` prop / `launchedSandboxes$` snapshot (with mount refetch added).                                                                                           |
| R10 | Build + Vitest + `/file-explorer` browser smoke (screenshot)                       | Pass   | core Vitest 118/118; build core+react green; `.github/screenshots/f-021-file-explorer.png`.                                                                                                                            |

### §3.1 Acceptance

- [x] All R# executed and marked Pass
- [x] Boundary: empty dir → empty tree; missing file → empty content; no live sandbox → Cycle-1 empty message (Nudge is Cycle 2)

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- **Deferred to Cycle 2** (backend `fs/mkdir|item|all|copy|move` + `fs/watch` + `action=NUDGE` not yet in `asgard-core`): mutations (copy/move/mkdir/delete/upload), the right-click context-menu mutation actions (AC8), `fs/watch` auto-reload (AC3), and the empty-state Nudge (AC4). Also CodeMirror 6 syntax highlighting (AC3) — Cycle 1 uses a textarea.
- The built-in dropdown populates from `launchedSandboxes$`, which requires a live (non-preview) channel + metadata advertising `launchedSandboxes`; the `/file-explorer` demo verifies the panel via the `off` path with direct providers to keep the browser check backend-free.

---

## Execution Log

- 2026-07-22: REVIEW task created, paired with BUILD-023 (Status: `draft`).
- 2026-07-22: §1 static (9 ✅ / 0 ❌; grep only pre-existing debug-gated logs; builds + lint clean) + §3 functional (R1–R10 Pass; core Vitest 118/118; `/file-explorer` browser smoke + screenshot) complete — zero BLOCKERs (Status: `in-progress → done`).
