# BUILD-029 File Explorer Cycle 3 — CodeMirror, fs/watch, sandbox lifecycle

## Meta

- Task ID: `BUILD-029`
- Status: `done`
- Issue: https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/29 (F-021)
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-021-sandbox-working-directory-file-explorer-側欄.md`
- Complexity: `M`

---

## Brief

F-021 shipped in two cycles. Cycle 1 (BUILD-023) built the panel, tree and FileView; Cycle 2 (BUILD-024)
added the mutations, context menu and Nudge. Both explicitly deferred the same two items to a Cycle 3 —
BUILD-023 called `fs/watch` "out of scope" and the editor "a lightweight `<textarea>`"; BUILD-024 repeated
both under "Out of scope (Cycle 3)".

An audit of all eleven F-021 acceptance criteria against `main` found exactly those two still open, and
nothing else:

| AC                      | State before this task                                                        |
| ----------------------- | ----------------------------------------------------------------------------- |
| AC1, AC2, AC4, AC6–AC11 | Done (BUILD-023 / BUILD-024 / BUILD-025)                                      |
| **AC3**                 | Partial — `<textarea>`, no highlighting, no manual refresh, no `fs/watch`     |
| **AC5**                 | Partial — the metadata half works; `dropSandbox` exists with **zero callers** |

This task closes both. It is the last F-021 work.

### Why AC5 was only half-built

`Channel.dropSandbox` was written in BUILD-021 and never wired up. The consequence is not cosmetic: a
sandbox that has been recycled stays in the dropdown until the next metadata poll (up to 15s), and every
click on it fails in the meantime. The spec's trigger — "fs 呼叫連續失敗" — had no implementation.

### Backend availability

Both endpoints exist and were verified against `asgard-core@origin/develop`:

- `internal/edgeserver/component/gin.go:125` — `GET /sandbox/:sandbox_name/fs/watch`
- `internal/models/sandbox.go:35` — `SandboxFsWatchEvent { op, path, mtimeUnix }`, `op` ∈
  CREATE / WRITE / REMOVE / RENAME / CHMOD

The handler probes the path with `FileStat` before opening the stream, so a missing path is a real HTTP
error rather than an SSE stream that dies on its first frame. `asgard-agent-hub-api` relays it as
`SandboxFsWatchV2`.

The stale comment at the head of `packages/core/src/types/sandbox-fs.ts` claiming these endpoints "do not
exist yet" is removed as part of this task.

---

## 1) Requirements

- `R1` (AC3) The FileView renders text and code through CodeMirror 6, with the grammar chosen by file
  extension; an unmapped extension degrades to plain text. Preview and edit share one component and differ
  only by `editable`, so both modes show the same highlighted rendering. `.md` still previews as rendered
  markdown and edits as source; images stay preview-only. → T1
- `R2` (AC3) CodeMirror and its language packs load on demand, not at module load. This package bundles its
  dependencies rather than externalising them, so an eager import would charge every consumer for a surface
  most never open. → T1
- `R3` (AC3) A manual refresh re-reads the open file from disk, kept alongside the watch per the AC's
  "另保留手動 refresh". → T2
- `R4` (AC3) `@asgard-js/core` exposes the `fs/watch` SSE stream as an Observable of `SandboxFsWatchEvent`.
  Unsubscribing aborts the request, which ends the sandbox-side watcher. The stream carries no resume
  cursor, so a failure surfaces to the caller instead of reconnecting indefinitely. → T3
- `R5` (AC3) The FileView reloads the open file when `fs/watch` reports a change, **except** while the
  buffer is dirty — an agent-side write must never clobber unsaved edits. The reload happens in place
  rather than through the loading state, so the component's own save echoing back as a WRITE event is a
  no-op instead of a visible flash. → T4
- `R6` (AC5) A sandbox that fails three consecutive **sandbox-level** fs calls is dropped from the
  dropdown via `Channel.dropSandbox`. Only `412` (no matched sandbox / RPC not ready) and `5xx` (dial
  failure) count; `400` / `404` / `409` describe the path, and evicting a live sandbox because the user
  browsed to a stale path would be worse than the bug being fixed. Any success resets the streak. → T5
- `R7` (AC5) The drop stays optimistic: `/channel/metadata` remains the sole authority on which sandboxes
  come back, exactly as F-019 requires. → T5

**Out of scope:** watching the _tree_ (AC3 scopes watch-and-reload to the FileView); the `recursive` query
parameter, unused without tree watching.

---

## 2) Design

**Core.** `sandboxFsWatch(sandboxName, path): Observable<SandboxFsWatchEvent>` sits beside the existing fs
methods and reuses `deriveSandboxFsEndpoint` / `sandboxFsHeaders`. It calls `fetchEventSource` directly
rather than `createSseObservable`: that helper is typed to the run contract (`SseResponse<EventType>`,
trace-id propagation, `Last-Event-ID` resume) and none of it applies to a cursorless `event: change` stream.

**Provider shape.** The react layer exposes watch as
`FsWatchFile = (sandboxName, path, onChange) => () => void` — a plain subscribe-and-unsubscribe, matching
the other providers and keeping rxjs out of component props. The event payload is not surfaced: the view
re-reads from disk either way, so all a caller needs is "it changed".

**Failure tracking.** `createSandboxFsProviders` takes an optional `onSandboxUnreachable` and routes every
one-shot fs call through a per-sandbox counter. `watchFile` is deliberately **not** tracked — that stream
lives for as long as the file is open, so its failure says nothing about whether the next one-shot call
would succeed. `ChatbotFileExplorerAside` wires the callback to `channel.dropSandbox`.

---

## 3) Implementation Tasks

| ID  | Task                                                                                 | Requirements |
| --- | ------------------------------------------------------------------------------------ | ------------ |
| T1  | `code-editor.tsx` — lazy CodeMirror 6 + language-by-extension + shared surface theme | R1, R2       |
| T2  | FileView refresh button (`reloadKey`)                                                | R3           |
| T3  | Core `sandboxFsWatch` + `SandboxFsWatchEvent`; drop the stale "does not exist" note  | R4           |
| T4  | Thread `watchFile` through the panel; FileView watch-and-reload with the dirty guard | R5           |
| T5  | Failure tracker in `createSandboxFsProviders`; wire to `channel.dropSandbox`         | R6, R7       |
| T6  | Demo mock: `fs/watch` SSE + real multipart persistence + an out-of-band write button | R5           |

---

## 4) Execution Log / Change Log

- 2026-07-27: T1–T2 landed (PR #361 first half). CodeMirror 6 verified in the browser: `app.tsx` renders 7
  highlight token spans and a `.cm-gutters`; `notes.txt` correctly degrades to plain text.
- 2026-07-28: T3–T6 landed. Verified at `localhost:4200/file-explorer`:
  - **R5** — an out-of-band `PUT fs/file` (bypassing the panel entirely) swapped the FileView's content
    with no manual refresh. With an unsaved edit in the buffer, the same write left it untouched and the
    debounced save then persisted the user's version.
  - **R6/R7** — intercepting `fs/list` as `412` in the page (no code change) and refreshing three times
    removed the sandbox from the dropdown and dropped the panel to the AC4 empty state + Nudge. With the
    mock still reporting it live, the next metadata poll re-added it — confirming the drop is optimistic.
  - `create-sandbox-fs-providers.spec.ts` (6 cases) covers the threshold, the 5xx path, per-sandbox
    isolation, the path-level exclusion, streak reset, and the watch subscribe/unsubscribe. The two
    threshold cases were confirmed red before the implementation landed.
  - 167 tests pass (core 126 + react 41); `lint:packages` clean; both builds pass.
- **F-021 is complete**: all eleven ACs implemented. Status `done`.
