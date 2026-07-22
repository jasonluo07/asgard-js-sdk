# BUILD-024 File Explorer Mutations + Context Menu + Nudge — Cycle 2 (F-021)

## Meta

- Task ID: `BUILD-024`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/29`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-021-sandbox-working-directory-file-explorer-側欄.md` (UC-037 / UC-038; prototype `FileExplorerPanel.tsx` + `ContextMenu.tsx`)
- Complexity: `L`

---

## Brief

Cycle 2 of F-021, unblocked now that `asgard-core` shipped the fuller sandbox fs API + `action=NUDGE` (`dev-1.16.34`, PR #142). Adds the **interactive** layer the Cycle-1 read-only File Explorer deferred: fs mutation client methods, the toolbar + right-click context menu (mirroring the prototype), a copy/cut/paste clipboard, rename / delete / new-file / new-folder / upload, and the empty-state **Nudge** that wakes a recycled sandbox. **fs/watch auto-reload + the CodeMirror editor upgrade are deferred to Cycle 3** (separable enhancements: SSE watch + an editor swap, neither blocks CRUD).

**Already exists (Cycle 1, merged via PR #342):** `sandboxFsList` / `sandboxFsRead` / `sandboxFsWrite`; `FileExplorerPanel` (dropdown + lazy tree + FileView, expanded/selected state lifted to the panel); `FileView` (textarea + streamdown + save + dirty); `useFileExplorerController`; `createSandboxFsProviders`; the built-in aside + folder toggle + open-file arrival bridge; inline SVG icons. No fs mutation methods, no toolbar, no context menu, no clipboard, no Nudge yet.

**Backend contract (verified against `asgard-core` `origin/develop` @ `dev-1.16.34`):**

- `GET  /sandbox/{name}/fs/stat?path=` → `{ data: { exists, isDir, sizeBytes, mtimeUnix, mode, etag? } }`
- `POST /sandbox/{name}/fs/mkdir?path=` → `{ data: null }`
- `DELETE /sandbox/{name}/fs/item?path=` (file) → `{ data: null }`
- `DELETE /sandbox/{name}/fs/all?path=` (dir, recursive) → `{ data: null }`
- `POST /sandbox/{name}/fs/copy?src=&dst=[&overwrite]` → `{ data: { bytesCopied } }`
- `POST /sandbox/{name}/fs/move?src=&dst=[&overwrite]` → `{ data: null }`
- `POST /message/sse` with `action=NUDGE` (`PostBackActionNudge`), empty text → invisible turn (backend suppresses `message.*`, does not write transcript); FE waits for `sandbox.launch/ready` to refill.

---

## Relevant Rules

| §    | Rule (summary)                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — mutation results / context-menu item types fully typed                                       |
| §1.6 | `@asgard-js/core` never imports react / DOM — fs mutation client methods are core; menu / toolbar react |
| §1.7 | Additive only — new client methods + new panel callbacks + a `NUDGE` FetchSseAction; no breaking change |
| §2.2 | New public API (fs mutation methods) exported from the package entry                                    |
| §3.2 | Reuse Cycle-1 `sandboxFs*` fetch/decode shape; one dispatch path for actions shared by toolbar + menu   |
| §4.2 | Context menu / toolbar via CSS variables; single accent; danger = `--asg-color-error`; reduced-motion   |
| §6   | Toolbar and context menu call the same action handlers (no duplicate mutation dispatch)                 |

---

## Acceptance Criteria

Cycle-2 subset of F-021 (deferred from Cycle 1).

- `R1` (AC2) Core fs mutation client methods: `sandboxFsStat`, `sandboxFsMkdir`, `sandboxFsRemove` (file), `sandboxFsRemoveAll` (dir), `sandboxFsCopy`, `sandboxFsMove` — against the verified endpoints, typed results. → T1, T2
- `R2` (AC2/AC8) A toolbar (new folder / upload / download / copy / cut / paste / delete / refresh) + a right-click context menu whose items map by node type (file / dir / background) to the fs mutation methods; both call the same action handlers; a copy/cut → paste clipboard (cut+paste = move). → T3, T4
- `R3` (AC8) The context menu is keyboard-navigable (`role=menu`, arrow keys, Esc / outside-click closes) and clamps within the panel container (not `fixed` to the viewport). → T4
- `R4` (AC2) Rename (`fs/move` same dir), new file (`fs/file` empty), new folder (`fs/mkdir`), upload (`fs/file`), delete (file `fs/item` / dir `fs/all`) run through the injected callbacks and refresh the affected dir. → T3
- `R5` (AC4) The empty state (no live sandbox) shows the system message + a **Nudge** button; clicking sends `POST /message/sse` `action=NUDGE` (empty text, invisible turn); the FE renders no reply and waits for `sandbox.launch/ready` + a metadata refetch to refill the dropdown. → T5
- `R6` (Smoke) build green; core Vitest covers the mutation client methods (params + decode + error); the `/file-explorer` demo mock gains the mutation + NUDGE endpoints, and the browser check exercises new folder / rename / delete / copy-paste / the context menu / the Nudge empty state — screenshot(s). → T6, T7

- `R7` (fidelity, added during the prototype-alignment pass — **not in the original spec**) `FileExplorerPanel` gains two
  public props the prototype defines and Cycle 1's REVIEW-023 had listed as Cycle-2 work: `chrome?: 'card' | 'flush'`
  (card = standalone rounded/bordered panel, the default; flush = the built-in aside's left-divider-only variant)
  and `onClose?: () => void` (renders the header / empty-state close button; the built-in aside passes
  `controller.closeExplorer`). Both are optional and additive. → T9

**Out of scope (Cycle 3):** `fs/watch` SSE auto-reload (AC3), CodeMirror 6 editor upgrade (AC3). Both are separable enhancements over the Cycle-1/2 base.

---

## Implementation Tasks

- [x] T1 (R1): `core/src/types/sandbox-fs.ts` — `SandboxFsStatResult` + copy/move option/result types.
- [x] T2 (R1): `client.ts` — `sandboxFsStat` / `sandboxFsMkdir` / `sandboxFsRemove` / `sandboxFsRemoveAll` / `sandboxFsCopy` / `sandboxFsMove`; extend `createSandboxFsProviders` with the mutation callbacks. Core Vitest.
- [x] T3 (R2, R4): `FileExplorerPanel` — toolbar + action handlers (new file/folder, rename, delete, copy/cut/paste clipboard, upload, refresh) wired to the providers; refresh the affected dir after each.
- [x] T4 (R2, R3): port `ContextMenu` to SDK conventions (SCSS module + inline icons + `role=menu` keyboard nav + container clamp); wire per-node-type sections sharing the toolbar action handlers.
- [x] T5 (R5): `NUDGE` FetchSseAction + a `nudge()` on `Channel` / `use-channel` (POST /message/sse action=NUDGE, empty text); wire the empty-state Nudge button (built-in + `off`).
- [x] T6 (R1, R6): core Vitest for the mutation methods.
- [x] T7 (R6): extend the `/file-explorer` demo mock (mutation + NUDGE endpoints); browser-verify new folder / rename / delete / copy-paste / context menu / Nudge; screenshot(s).
- [x] T9 (R7): `chrome` + `onClose` props on `FileExplorerPanel`; built-in aside passes `chrome="flush"` +
      `controller.closeExplorer`. Added in the alignment pass, after the original T1–T8 closed.
- [x] T8: `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6

Files:

**core (`@asgard-js/core`)**

- `packages/core/src/constants/enum.ts` — `FetchSseAction.NUDGE`.
- `packages/core/src/types/sandbox-fs.ts` — `SandboxFsStatResult`, `SandboxFsCopyMoveOptions`, `SandboxFsCopyResult`.
- `packages/core/src/lib/client.ts` — `sandboxFsStat` / `sandboxFsMkdir` / `sandboxFsRemove` / `sandboxFsRemoveAll` / `sandboxFsCopy` / `sandboxFsMove` + private `sandboxFsRequest` helper.
- `packages/core/src/lib/channel.ts` — `nudge()`.
- `packages/core/src/lib/client.spec.ts` — mutation-method tests (params + decode + error).
- `packages/core/src/lib/channel.spec.ts` — `nudge()` payload / invisible-turn test.

**react (`@asgard-js/react`)**

- `packages/react/src/components/chatbot/file-explorer/create-sandbox-fs-providers.ts` — `mkdir` / `remove` / `copy` / `move` / `upload` / `download` providers.
- `packages/react/src/components/chatbot/file-explorer/context-menu.tsx` (new) + `context-menu.module.scss` (new) — `role=menu` keyboard-nav menu, container-clamped.
- `packages/react/src/components/chatbot/file-explorer/icons.tsx` — FolderPlus / FilePlus / Upload / Download / Copy / Scissors / ClipboardPaste / Pencil / Trash glyphs.
- `packages/react/src/components/chatbot/file-explorer/file-explorer-panel.tsx` + `file-explorer-panel.module.scss` — toolbar + right-click menu + copy/cut/paste clipboard + action handlers + empty-state Nudge button.
- `packages/react/src/components/chatbot/file-explorer/chatbot-file-explorer.tsx` — built-in aside wires the mutation providers + `onNudge`, `onClose`, and `chrome="flush"`; header toggle uses `folder-tree`.
- `packages/react/src/hooks/use-channel.ts` + `packages/react/src/context/asgard-service-context.tsx` — expose `nudge`.

**demo (verification only, `apps/react-demo`)**

- `apps/react-demo/vite.config.ts` — broadened the fs middleware matcher.
- `apps/react-demo/src/mock-server/sse-mock.ts` — mutable fs mock (stat/mkdir/item/all/copy/move) + NUDGE handler + empty-then-filled metadata channel.
- `apps/react-demo/src/app/routes/file-explorer/file-explorer.tsx` — Cycle-2 sections (mutation toolbar/menu over a mutable in-memory fs + Nudge empty-state channel).

---

## Execution Log / Change Log

- 2026-07-22: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/29 (F-021 Cycle 2). Unblocked by `asgard-core` `dev-1.16.34` (fuller fs API + `action=NUDGE`, PR #142) — contracts verified against `origin/develop`. Scope: mutations + context menu + toolbar + clipboard + Nudge. `fs/watch` auto-reload + CodeMirror deferred to Cycle 3 (Status: `draft`).
- 2026-07-22: Build complete (Status: `in-progress → done`). Core fs mutation client methods + `nudge()`; react toolbar + right-click context menu + copy/cut/paste clipboard + empty-state Nudge, built-in aside wired. Verified: core Vitest 126/126 (client mutation + nudge specs); `npm run lint:packages` 0 errors; `npm run build:core && npm run build:react` green. Browser (react-demo `/file-explorer`): toolbar, right-click menu, new folder (dirs-first refresh), copy→paste (copy into `src`, original kept), and the Nudge empty-state → wake → dropdown-refill (no reply rendered) — screenshots under `.github/screenshots/f-021-c2-*.png`.
- 2026-07-22: scope amendment recorded after the fact. The prototype-alignment pass added two public props
  (`chrome`, `onClose`) that the original R1–R6 never covered — captured above as `R7` / `T9` so the spec and the
  shipped API agree. Both are optional and additive, and `FileExplorerPanel` has never been published to npm
  (verified: absent from the 0.3.13 tarball; the Cycle-1 commit is not an ancestor of the 0.3.13 tag), so the
  changed `chrome` default cannot affect any existing consumer.
