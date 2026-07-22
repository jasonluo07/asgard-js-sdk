# BUILD-023 sandbox File Explorer Side Panel — Cycle 1 (Browse + Preview/Edit + open-file Intent)

## Meta

- Task ID: `BUILD-023`
- Status: `in-progress`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/29`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-021-sandbox-working-directory-file-explorer-側欄.md` (+ `use-cases/UC-037` / `UC-038` / `UC-039`; prototype `FileExplorerPanel.tsx` / `FileView.tsx` / `useFileExplorerController.ts`); related product decision `asgard-sindri-pm#94`
- Complexity: `L`

---

## Brief

A persistent File Explorer aside next to the chat that browses a live sandbox's filesystem, driven by F-019's `launchedSandboxes$`. **This is Cycle 1 of F-021, scoped to what the backend supports today** (`asgard-core` edgeserver exposes only `fs/list` GET, `fs/file` GET read, `fs/file` PUT write — verified 2026-07-22). It delivers the read-only tree browse + a single-panel two-mode FileView (preview ↔ edit/save, CodeMirror 6) + the side-panel slot + the shared `useFileExplorerController` + the **open-file intent exposure (notify-not-force)** and **editing-state exposure** that `asgard-sindri-pm#94` needs. Mutations (copy / move / mkdir / delete / upload), the right-click context-menu mutation actions, `fs/watch` watch-and-reload, and the empty-state Nudge are **deferred to Cycle 2** (BUILD-NNN) because their edge endpoints / `action=NUDGE` are not yet available in `asgard-core`.

**Already exists:** F-019 `launchedSandboxes$` + `getLaunchedSandboxes()` + `useLaunchedSandboxes` on `Channel`; F-020 `resolveSandboxUri` / `SandboxUriIntent` + `dispatchUriAction` + `onSandboxOpenFile` callback + `onSandboxOpenBrowser` (AC11 done); `client.ts` fetch + envelope-tolerant decode patterns (`channelMetadata` / `generateSandboxBrowserOpenUrl`); `create-sse-observable.ts`; Chatbot `renderMenu` slot pattern (mirror for `renderSidePanel`); `subagent-list.tsx` collapsible/empty-state pattern. No fs client methods, no File Explorer UI, no `useFileExplorerController` yet.

**Backend contract (verified against `asgard-core` `bot_provider.go`):**

- `GET /sandbox/{name}/fs/list?path=` → `{ data: { entries: [{ name, isDir, sizeBytes, mtimeUnix, mode }], truncated } }`
- `GET /sandbox/{name}/fs/file?path=[&offset_bytes&limit_bytes]` → raw `application/octet-stream` + headers `X-Total-Bytes`, `X-Truncated`
- `PUT /sandbox/{name}/fs/file?path=[&mode&create_only]` → `multipart/form-data` field `file` → `{ data: SandboxFsWriteResponseData }`

---

## Relevant Rules

| §    | Rule (summary)                                                                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — fs result types are fully typed                                                                                         |
| §1.5 | Every subscription / SSE / timer torn down (FileView reload, controller listeners, `useEffect` cleanup)                            |
| §1.6 | `@asgard-js/core` never imports react / DOM — fs client methods are core; the panel / FileView are react                           |
| §1.7 | Additive only — new client methods, new react exports, new optional Chatbot props; no breaking change                              |
| §2.2 | New public API (fs client methods, `FileExplorerPanel`, `useFileExplorerController`, fs types) exported                            |
| §2.3 | Sandbox fs types in `core/src/types/` exist before the client methods / UI read them                                               |
| §3.1 | Explicit return types on all new exports                                                                                           |
| §4.1 | Panel / FileView props fully typed                                                                                                 |
| §4.2 | Theming via CSS variables; single accent; no hardcoded colors                                                                      |
| §4.4 | `react` / `react-dom` stay peerDeps; CodeMirror / react-markdown added as `@asgard-js/react` deps (bundled, not React-duplicating) |
| §6   | The open-file intent path reuses F-020's `resolveSandboxUri` + `dispatchUriAction`; no second parser                               |

---

## Acceptance Criteria

Cycle-1 subset of F-021 (F-021 AC → R# mapping in parentheses). Deferred ACs listed under "Out of scope (Cycle 2)".

- `R1` (F-021 AC1) Core exposes `sandboxFsList` / `sandboxFsRead` / `sandboxFsWrite` client methods against the three verified endpoints, with typed results (`SandboxFsDirEntry`, list/read/write result types) in `core/src/types/`. → T1, T2
- `R2` (AC1) The side panel is driven by `launchedSandboxes$`: a top dropdown lists live sandboxes (label `sandboxBlueprintName || sandboxName`, shows `workingDirectory`); selecting one locks the active sandbox. → T4
- `R3` (AC2, partial) The file tree roots at the active sandbox's `workingDirectory` (overridable by a `basePath` prop; dropdown still shows the real `workingDirectory`), expands/browses via `fs/list`. Mutations (copy/move/mkdir/delete/upload) are **out of scope this cycle**. → T4
- `R4` (AC3, partial) Double-click a file (or an open-file intent) opens a single-panel two-mode FileView: preview ↔ edit/save (`.md` preview = markdown render via the existing `streamdown`; text edit = a lightweight `<textarea>` — **CodeMirror 6 syntax highlighting deferred to Cycle 2** to keep Cycle 1 dependency-light; images preview-only). Save writes via `fs/file` PUT. `fs/watch` auto-reload is **out of scope**; a manual refresh is provided. → T5
- `R5` (AC6) A header action button (folder icon, right of ChannelTitle) toggles the panel; open renders the File Explorer as a right-side aside inside the same `position:relative` chat shell (chat column flexes narrower; not `fixed`, not a `message.blocks[]` entry). → T6
- `R6` (AC7) `fileExplorer="builtin" | "off"`: `off` hides the built-in toggle+aside and the consumer renders the exported `<FileExplorerPanel>` anywhere, sharing one `useFileExplorerController` — header toggle / `open-file` card / consumer panel all bind the same controller. → T6, T7
- `R7` (AC9) open-file intent is exposed **notify-not-force**: when an `open-file` `sandbox://` card arrives (**on arrival, not only on click**; the card stays clickable), the SDK exposes it via (a) the `onSandboxOpenFile` / `onSandboxUri` host callback and (b) `useFileExplorerController.requestedFile` **carrying a nonce** (same file re-triggers). The SDK does not unconditionally open the panel — "fire intent" and "open panel" are separate: `off` never self-opens; builtin may default-reveal but it is gated by a prop (`autoRevealOnOpenFileCard`), not hardcoded. → T3, T7
- `R8` (AC10) The controller / FileView expose whether a file is **being edited / has unsaved changes** (`controller.isEditingDirty` + the open file), so a consumer (or the builtin default) can decline to yank the panel mid-edit on an incoming open-file intent. → T5, T7
- `R9` (AC5) Lifecycle via F-019: a sandbox that disappears from metadata drops out of the dropdown; a launch hint re-adds it only after a metadata refetch confirms (already provided by `launchedSandboxes$` — the panel just reflects it). → T4
- `R10` (Smoke) build green; core Vitest covers the fs client methods (list decode, read octet-stream + headers, write multipart); a scoped react-demo route (`/file-explorer`) with a mock fs backend exercises: dropdown select, tree browse, open a file → preview → edit → save, open-file intent arrival (notify + nonce), builtin toggle + `off` consumer placement — browser-verified with a screenshot. → T8, T9

**Out of scope (Cycle 2, gated on backend `fs/mkdir|item|all|copy|move` + `fs/watch` + `action=NUDGE`):** F-021 AC2 mutations (copy/move/mkdir/delete/upload), AC3 `fs/watch` auto-reload, AC4 empty-state Nudge, AC8 context-menu mutation actions.

---

## Implementation Tasks

- [ ] T1 (R1): `core/src/types/` — sandbox fs types (`SandboxFsDirEntry`, list/read/write result + option types).
- [ ] T2 (R1): `client.ts` — `sandboxFsList(sandboxName, path)`, `sandboxFsRead(sandboxName, path, opts?)` (octet-stream + `X-Total-Bytes`/`X-Truncated`), `sandboxFsWrite(sandboxName, path, content, opts?)` (multipart); export from core entry.
- [ ] T3 (R7): extend F-020's `dispatch-uri-action` / the message pipeline so an arriving `open-file` card fires the intent (callback + controller `requestedFile` with nonce) without requiring a click; keep the click path.
- [ ] T4 (R2, R3, R9): react `FileExplorerPanel` — live-sandbox dropdown, `workingDirectory` root + `basePath` override, tree browse via `sandboxFsList`.
- [ ] T5 (R4, R8): react `FileView` — textarea preview/edit, `.md` markdown render via `streamdown`, image preview; save via `sandboxFsWrite`; expose editing/dirty state; manual refresh. (CodeMirror → Cycle 2.)
- [ ] T6 (R5, R6): `useFileExplorerController` + Chatbot `renderSidePanel` slot + `fileExplorer` prop + header folder toggle + right aside layout.
- [ ] T7 (R6, R7, R8): wire header toggle / open-file card / consumer panel to one controller; `autoRevealOnOpenFileCard` prop; expose controller state.
- [ ] T8 (R1, R10): core Vitest for the three fs client methods.
- [ ] T9 (R10): scoped `/file-explorer` react-demo with a mock fs backend; browser-verify + screenshot to `.github/screenshots/`.
- [ ] T10: `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: [filled during build]
Files: [filled during build]

---

## Execution Log / Change Log

- 2026-07-22: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/29 (F-021). Scoped to **Cycle 1** after verifying `asgard-core` exposes only `fs/list` + `fs/file` (read/write); mutations + `fs/watch` + Nudge deferred to Cycle 2 (backend gap). Product alignment per `asgard-sindri-pm#94` (open-file notify-not-force, browser stays click). CodeMirror 6 adopted per F-021 AC3 (Status: `draft`).
