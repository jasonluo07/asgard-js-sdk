# REVIEW-024 File Explorer Mutations + Context Menu + Nudge — Cycle 2 (F-021)

## Meta

- Task ID: `REVIEW-024`
- Status: `done`
- BUILD Task: `BUILD-024`
- Reviewed commit: working tree on `feat/29-file-explorer-cycle2` (core mutations committed at `2e1ab2d`; react + demo + Nudge changes reviewed pre-commit)
- Reviewed branch: `feat/29-file-explorer-cycle2`

---

## §1 Static Code Review

Scanned BUILD-024 `## Coverage` files against `FRONTEND_RULE_COMMON.md`.

### §1.1 Checklist

| Check item                                                                                  | Rule      | Result                                                                                                                                          |
| ------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any`                                                                         | §4.1      | ✅                                                                                                                                              |
| No `eslint-disable` / `@ts-ignore` bypassing types                                          | §4.2      | ✅ (the only `eslint-disable no-console` hits are pre-existing `debugMode`-gated logs in `client.ts` / `use-channel.ts`, not Cycle-2 code)      |
| `@asgard-js/core` does not import react / DOM (mutation client in core; menu/toolbar react) | §1.6      | ✅ (core reverse-dep grep empty)                                                                                                                |
| Additive only; no breaking public-API change                                                | §1.7      | ✅ (new enum member, new client methods, new optional panel props, new `nudge`)                                                                 |
| Toolbar + context menu share one action-dispatch path (no duplicate mutation calls)         | §3.2 / §6 | ✅ (`actNewFolder`/`actRename`/`actDelete`/`actPaste`/… called by both toolbar buttons and `buildSections`)                                     |
| Context menu keyboard-navigable + container-clamped (not fixed)                             | §4.1      | ✅ (`role=menu`, arrow-key nav, Esc/outside/scroll/resize close; `useLayoutEffect` clamps within `offsetParent`, coords are container-relative) |
| Theming via CSS variables; danger = `--asg-color-error`; reduced-motion                     | §4.2      | ✅ (no hardcoded colors in new `.tsx`; `.module.scss` uses `--asg-color-*`; spin honors `prefers-reduced-motion`)                               |
| Every listener / SSE / timer torn down                                                      | §1.5      | ✅ (`context-menu.tsx` removes all 4 listeners in the effect cleanup)                                                                           |
| Explicit return types on new exports                                                        | §3.1      | ✅                                                                                                                                              |
| No `console.log` (except guarded) / no untracked TODO-FIXME                                 | §7        | ✅                                                                                                                                              |

### §1.2 Mechanical Grep

Scoped to Coverage files (`packages/react/src/components/chatbot/file-explorer/*`, `use-channel.ts`, `asgard-service-context.tsx`, core `channel.ts` / `client.ts` / `enum.ts` / `types/sandbox-fs.ts`):

```
any / as any:                (none in Cycle-2 code)
@ts-ignore / eslint-disable: client.ts (pre-existing debugMode logs); use-channel.ts:345 (pre-existing consent debug log)
console.log:                 client.ts:338,387 (both inside `if (this.debugMode)`); use-channel.ts:346 (inside `if (client?.debugMode)`)
core → react reverse-dep:    (empty)
react → core/src deep import: (empty)
hardcoded colors (new tsx):  (empty)
setTimeout (coverage):       file-view.tsx:84/88 (Cycle-1 debounced save, has cleanup) — no new setTimeout in Cycle-2
```

All non-empty hits are pre-existing, `debugMode`-gated, or legitimate (debounce with teardown). No Cycle-2 violation.

### §1.3 TypeScript and Lint

```
build:core + build:react:  PASS (green, no type errors)
lint:packages:             PASS — 0 errors (1 pre-existing warning: file-view.tsx useMemo scheduleSave dep, Cycle-1)
format:check (code):       PASS — all Cycle-2 `.ts`/`.tsx` formatted (repo-wide warnings are references/ submodule + docs, pre-existing)
core Vitest:               126/126 pass (client mutation methods + `nudge()`)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked ✅/❌
- [x] §1.2 grep run + output pasted
- [x] Build + lint clean

---

## §3 Functional Validation

Validated on the react-demo `/file-explorer` route (mutable in-memory fs for the standalone panel; real mutation + NUDGE mock endpoints for the built-in aside) + core Vitest. Screenshots under `.github/screenshots/f-021-c2-*.png`.

### R# Result Matrix

| R#  | Description                                                   | Result  | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Core fs mutation client methods typed + decode                | ✅ Pass | core Vitest 24/24 (`client.spec.ts`) — params, envelope decode, error paths for stat/mkdir/remove/removeAll/copy/move                                                                                                                                                                                                                                                                                                                                                                    |
| R2  | Toolbar + context menu → mutations; copy/cut/paste clipboard  | ✅ Pass | toolbar renders (`f-021-c2-toolbar`); right-click file menu (download/rename/copy/cut/delete/refresh, `f-021-c2-context-menu`); copy→paste into `src` kept original (`f-021-c2-copy-paste`)                                                                                                                                                                                                                                                                                              |
| R3  | Context menu keyboard nav + container clamp                   | ✅ Pass | `role=menu`, arrow/Esc/outside-close, clamps within panel `offsetParent` (menu opened fully inside the panel, not viewport-fixed)                                                                                                                                                                                                                                                                                                                                                        |
| R4  | Rename / new / delete / upload run + refresh                  | ✅ Pass | each action exercised in-browser: new folder → dirs-first (`f-021-c2-new-folder`); rename `notes.txt`→`renamed-notes.txt`, then delete (confirm dialog), then upload `upload-demo.txt` (`f-021-c2-rename-delete-upload`); each runs through the injected provider + `run()` refreshes the affected dir. Also confirmed on the built-in aside via the **real** client method → vite fs-mock endpoint (`sandboxFsMkdir` → `POST fs/mkdir` → list refresh), not just the in-memory shortcut |
| R5  | Empty-state Nudge → POST action=NUDGE, invisible turn, refill | ✅ Pass | empty channel shows message + Nudge button (`f-021-c2-nudge-empty`); click → `action=NUDGE` → sandbox.launch/ready → metadata refetch → dropdown+tree refilled, **no reply rendered** in chat (`f-021-c2-nudge-filled`); core `nudge()` spec asserts empty text + no user message                                                                                                                                                                                                        |
| R6  | Build + Vitest + `/file-explorer` browser smoke (screenshot)  | ✅ Pass | build green; core Vitest 126/126; browser smoke of all above; 6 screenshots committed                                                                                                                                                                                                                                                                                                                                                                                                    |

| R7 | `chrome` (card/flush) + `onClose` public props | ✅ Pass | added post-hoc to BUILD-024 (see its scope amendment). Standalone demo panel renders `card` (radius 8px, full border); built-in aside renders `flush` (radius 0, left divider only, no top border) — both measured in-browser. Close button present in the header and in the empty state. No consumer impact: `FileExplorerPanel` is absent from the published 0.3.13 tarball and the Cycle-1 commit is not an ancestor of the `@asgard-js/react@0.3.13` tag, so it has never shipped |

### §3.1 Acceptance

- [x] All R# executed and marked Pass / Fail / Blocked
- [x] Boundary: delete/overwrite confirmation (`window.confirm`); paste into a dir; move vs copy (cut+paste clears clipboard, copy keeps original); Nudge with no reply rendered

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Prototype fidelity (aligned post side-by-side run)

The R1–R6 matrix above covers behavior only — it never checked the panel against the pinned
`FileExplorerPanel.tsx`. Re-verified by running the prototype (`references/asgard-chat-kit-prototype`, Vite on
:8349) next to react-demo `/file-explorer` and diffing rendered SVG path data + computed styles, not by eye.
Corrected: the `chrome` prop (`card` = rounded/fully-bordered standalone panel, `flush` = the built-in aside's
left-divider-only variant — the Cycle-1 deferral in REVIEW-023 that Cycle 2 had missed); the dropdown's
custom caret + `appearance:none` primary-tinted select; `FolderOpen` on expanded dirs; the header grouping
(select row + cwd under one border, replacing two stacked dividers); the selected row's primary-tinted icon;
tree row/tree-container metrics and the `0.5rem + depth*0.85rem` indent; `:focus-visible` rings on every
interactive element; and the radius scale (the prototype's `--radius-sm/md/lg` resolve to 4/6/8px, not the
0.375/0.5/0.75rem fallbacks first used). Verification after the fix: the 8 toolbar glyphs hash-identical to
the prototype's lucide output, and header padding / select / toolbar / tree / row / root computed styles all
match exactly. `.iconBtn` became dead when refresh moved into the toolbar and was removed.

A follow-up audit then compared **all 24** inlined glyphs against the pinned `lucide-react@0.487.0` source in
`references/.../node_modules` (resolving alias re-exports), which caught two the panel-only diff had missed
because they live outside `file-explorer-panel.tsx`: the header toggle used `folder` where the design uses
`folder-tree` (now `FolderTreeIcon`, size 18 to match), and `CodeIcon` was lucide `code` where the design's
`Code2` aliases to `code-xml` (the variant with the slash) — it is the FileView preview/source toggle. The
toggle's active tint also moved 12% -> 15% to match the panel's selected row. Audit now reports 0/24 mismatches.

Root cause of the drift: the SDK deliberately avoids a `lucide-react` dependency and hand-inlines each glyph,
so nothing mechanical guarded the copies — build, lint and Vitest never look at path data.

### Minor (nice to have)

- `fs/watch` auto-reload (AC3) + CodeMirror 6 editor (AC3) are Cycle 3 (out of scope, tracked).

---

## Execution Log

- 2026-07-22: REVIEW task created, paired with BUILD-024 (Status: `draft`).
- 2026-07-22: §1 static + §3 functional run. §1: 0 violations (all grep hits pre-existing/`debugMode`-gated/legit; build + lint 0 errors; Vitest 126/126). §3: R1–R6 all Pass (browser + Vitest, 6 screenshots). No BLOCKERs → Status `done`.
- 2026-07-22: prototype-fidelity pass (see Findings). Ran the pinned chat-kit prototype side by side with
  react-demo and diffed rendered SVG paths + computed styles; aligned `chrome`, the select caret, `FolderOpen`,
  header grouping, selected-row icon, row/tree metrics, focus rings, and the radius scale. Also fixed the
  react-demo route: `DemoWrapper`'s `.content` is a flex row, so the route's 8 top-level children were squeezing
  the panel to ~1px — wrapped in a single block container, and widened the built-in-aside chatbots (default
  theme is a 375px shell) so the aside is inspectable. Build + lint green; core Vitest 126/126.
- 2026-07-22: full 24-glyph audit against the pinned lucide source (see Findings); fixed the header toggle
  (`folder-tree`) and `CodeIcon` (`code-xml`). 0/24 mismatches after the fix.
- 2026-07-22: R4 re-verified per-action in-browser (rename → delete-with-confirm → upload) after the first pass had inferred rename/delete/upload from the shared `run()` path; added `f-021-c2-rename-delete-upload` screenshot. Also confirmed the built-in aside's real client → vite fs-mock mkdir round-trip (not only the in-memory panel).
