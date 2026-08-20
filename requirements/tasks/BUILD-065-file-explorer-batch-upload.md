# BUILD-065 Batch upload for the chat File Explorer (multi-file / recursive folder)

## Meta

- Task ID: `BUILD-065`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/84`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-031-對話-file-explorer-批次上傳-多檔-資料夾遞迴.md`
- Design spec (authoritative UI/behavior): `references/asgard-chat-kit-prototype/docs/superpowers/specs/2026-08-20-batch-upload-design.md` (prototype pinned @ `6aad8be`)
- Complexity: `L`

---

## Brief

Let the chat-side File Explorer (F-021) upload **many files at once** and **a whole folder
recursively**, creating the folder structure at the destination. The batch is rate-limited, reports
per-file progress, is cancellable, and asks before overwriting.

The work lands in three layers. A new **headless orchestrator** (`components/upload-queue/`) owns the
worker pool, AIMD back-off, conflict serialization and cancellation; it carries **zero sandbox
concepts** and takes the per-file size cap, the concurrency ceiling and all copy as injected
parameters, because F-025 will consume the same one for the SourceSet explorer (2026-08-11 unified
rendering decision). A **browser picking layer** covers the three entry points whose capabilities
genuinely differ (`<input multiple>`, `<input webkitdirectory>`, `webkitGetAsEntry()` recursion). The
**chat explorer** then wires them up: a two-way upload menu, an external drop zone, a progress panel
docked below the tree, and a conflict dialog in the `file-explorer-dialog` visual family.

No backend change is needed: both write paths already `MkdirAll` the parent directory, so nested
relative paths are free. What the backend lacks is a batch endpoint — every relay is
`c.FormFile("file")`, one file per request — so N files is N requests, orchestrated on the client.

**Already exists:** `packages/core/src/lib/client.ts` (`sandboxFsWrite` already honors `createOnly`;
`sandboxFsMkdir` present), `packages/core/src/types/sandbox-fs.ts` (`SandboxFsWriteOptions`),
`packages/core/src/types/http-error.ts` (`HttpError.status` — the basis for 409 / 429 / 5xx
branching), `packages/react/src/components/file-explorer/` (`file-explorer-context.tsx` holds
`run()` / `actUpload` / `onUploadPicked`; `file-explorer-parts.tsx` holds the hidden input and
toolbar; `context-menu.tsx`; `file-explorer-dialog.tsx`), `packages/react/src/i18n.ts` (flat in-repo
catalog, three locales), `apps/react-demo/src/app/routes/file-explorer/` (in-memory fs mock).

> **The source spec's line references are stale.** It points at `file-explorer-panel.tsx:870` /
> `:438` / `:357`, but F-025 / F-027 reduced that file to 133 lines and moved the behavior into
> `file-explorer-context.tsx` (`run()` at 226, `actUpload` at 323, `onUploadPicked` at 327) and
> `file-explorer-parts.tsx` (hidden input at 51, toolbar upload button at 185). Implement against the
> current structure.

### Decisions taken before the build (not in the source spec)

1. **Placement / export scope.** The orchestrator lives in a new
   `packages/react/src/components/upload-queue/` so both explorers import one copy (AC16), but it is
   **not** re-exported through `components/index.ts` — the public API surface stays unchanged.
   `export * from './file-explorer'` would otherwise make it a permanent commitment (§1.7 allows
   `@deprecated` but not removal), and no consumer needs the raw hook today. Exporting later is
   cheap; un-exporting is not.
2. **Circuit breaker vs. batch retries.** `createSandboxFsProviders`'s `track()` evicts a sandbox
   after 3 consecutive `412` / `5xx` (F-021 AC5), while AIMD deliberately retries `5xx`. Batch
   writes therefore report to the tracker **only once a file's retries are exhausted**, not per
   attempt: a genuinely dead sandbox still evicts after 3 failed files, but transient `503`s absorbed
   by the back-off no longer evict a live one. `409` was already excluded by
   `isSandboxLevelFailure` and is unaffected.
3. **Drop zone scope.** The drop zone attaches to the chat explorer's own body only. SourceSet does
   not use `FileExplorerProvider` / parts (it has `use-source-set-explorer.ts`), so this cannot leak
   into it — and its own equivalent is F-025's to add (AC16). No `draggable` attribute is introduced
   anywhere; `source-set-explorer.spec.tsx:237` must keep asserting zero.

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
Each `R#` traces back to the source spec's `AC#`.

- `R1` (AC1) When the user picks N files from the upload input, the system shall enqueue **all N**,
  not only the first — the hidden input carries `multiple`. → T4, T6
- `R2` (AC2) When the user picks a folder, the system shall offer a `webkitdirectory` entry point and
  derive each destination from `dirPath` + `file.webkitRelativePath`, **without** any pre-emptive
  per-level `mkdir` — the backend's `MkdirAll` creates parents. → T3, T4, T6
- `R3` (AC3) When files are dropped onto the panel from outside the browser, the system shall expand
  the tree via `DataTransferItem.webkitGetAsEntry()`, calling `readEntries` **in a loop until it
  returns an empty array**, so a directory larger than one batch (Chromium: 100) loses no file. → T3, T7
- `R4` (AC4) When a dropped tree contains an empty directory, the system shall `mkdir` it explicitly
  to preserve the structure; while the source is the `webkitdirectory` picker, the system shall state
  on screen that empty folders are absent (the FileList cannot express them) rather than differ
  silently. → T3, T5, T8
- `R5` (AC5) When a batch runs, the system shall keep at most `concurrency` requests in flight
  (default 3, injectable) via a worker pool, and shall **never** dispatch with `Promise.all`. → T2
- `R6` (AC6) When a write fails with `429` or `5xx`, the system shall retry with exponential back-off
  (`400ms × 2^(n-1)`, at most 4 attempts) and halve the in-flight ceiling, restoring one slot after 4
  consecutive successes (AIMD), surfacing the reduced ceiling in the panel. → T2, T5
- `R7` (AC7) While a batch runs, the system shall show each file's status
  (`queued` / `uploading` / `done` / `failed` / `skipped`) plus an `n/N` total, and shall offer a
  retry that re-sends **only the failed items**. → T2, T5
- `R8` (AC8) When the user cancels, the system shall abort in-flight requests via `AbortController`,
  stop dispatching the remainder, mark still-queued items as cancelled, roll nothing back, and say so
  in the UI. → T1, T2, T5
- `R9` (AC9) When a write collides, the system shall have sent it with `create_only=true`, and shall
  offer skip / keep-both / overwrite plus an "apply to the remaining N" row in a **dedicated dialog**
  of the `file-explorer-dialog` visual family (never `window.confirm`); keep-both shall rename via
  `dedupeName` while **still** sending `createOnly`. → T2, T5
- `R10` (AC10) When a file exceeds the injected per-file cap, the system shall mark it failed with a
  structured reason **before** dispatching, spending no request to collect a `400`. → T2
- `R11` (AC11) When a batch settles, the system shall refresh the tree **exactly once**, not once per
  file as `run()` does today. → T2, T6
- `R12` (AC12, AC13) When a consumer supplies only the existing `upload`, the system shall degrade to
  sequential per-file uploads still under the rate limit; `upload` / `FsUpload` shall keep their
  current signatures, `uploadMany` shall be additive, and `sandboxFsWrite` shall accept an optional
  `signal` so cancellation truly aborts in-flight requests. → T1, T3, T6
- `R13` (AC14) When any new user-facing string is added, the system shall define it under
  `fileExplorer.*` in **all three** locales (`en-US`, `ja-JP`, `zh-TW`). → T9
- `R14` (AC15) When several files collide concurrently, the system shall serialize the questions and
  hold the resolver in the hook, so neither of the two known deadlocks occurs: a later ask
  overwriting an earlier resolver, and cancellation leaving a waiting worker unresolved. → T2, T7
- `R15` (AC16, AC17) The shared layer shall leak no sandbox concept and shall take cap, concurrency
  and copy as injected parameters, reporting failures as structured codes rather than translated
  strings; SourceSet's own upload path shall remain untouched, with no second copy of the limiter or
  progress model. → T2, T5, T10
- `R16` (decision 2) When a batch write fails with `5xx`, the system shall report to the sandbox
  failure tracker only after that file's retries are exhausted, so transient `5xx` absorbed by
  back-off cannot evict a live sandbox while a genuinely dead one still evicts after 3 failed files. → T3, T7
- `R17` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, the Vitest
  suites, and the `/file-explorer` demo route (`npm run serve:react-demo`) whose mock reproduces the
  three real backend behaviors (recursive parent creation, `409` on `create_only` collision, `503` on
  every 9th file's first attempt), the system shall walk R1–R16 with no build errors. → T11

> **Two acceptance paths cannot be automated, by mechanism rather than by choice.** The
> `webkitdirectory` picker opens a native dialog (`input.click()` is a no-op in jsdom — the existing
> `upload-target-and-errors.spec.tsx` documents this), and a real desktop folder drag requires
> filesystem entries that Playwright's `file_upload` cannot synthesize (it sets `input.files`, not a
> `DataTransfer` entry tree). Both are therefore covered by unit tests over a faked `DataTransfer` /
> entry tree — where the `readEntries` loop, the recursion and the empty-directory branch are pure
> and testable — **plus** a manual step in the local verification handover. Neither is claimed as
> automated.
>
> **One acceptance is blocked upstream and only that one:** a 64MB single file needs
> `FileWriteMaxBytes` raised (EXT-003 / [asgard-core#230](https://github.com/asgard-ai-platform/asgard-core/issues/230)).
> The cap is an injected parameter, so the demo exercises the target value while production stays at
> 8MB; nothing in the implementation is blocked.

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

**Phase 1 — core (no react, no DOM)**

- [x] T1 (R8, R12): Add `signal?: AbortSignal` to `SandboxFsWriteOptions` in
      `packages/core/src/types/sandbox-fs.ts` and pass it to `fetch` in `sandboxFsWrite`
      (`packages/core/src/lib/client.ts`). Purely additive; existing callers unaffected.

**Phase 2 — headless shared layer (`packages/react/src/components/upload-queue/`)**

- [x] T2 (R5–R11, R14, R15): `use-upload-queue.ts` — `useUploadQueue` taking an injected write, an
      optional mkdir, `maxBytes`, `concurrency` and `onSettled`, and returning the item list plus
      `start` / `cancel` / `retryFailed` / `answerConflict` / `dismiss`. Worker pool (no
      `Promise.all`), AIMD, exponential back-off, retry budget kept separate from conflict
      resolution, pre-flight size check, `AbortController`, conflict asks serialized through a
      promise chain with the resolver held by the hook, empty directories created first, `onSettled`
      fired once. Failure reasons are structured `UploadReason` codes — no human language here.
- [x] T3 (R2, R3, R4, R12, R16): `pick-upload.ts` — `pickFiles()` / `pickDirectory()` /
      `readDataTransfer()` / `isFileDrag()` / `dedupeName()`, returning
      `{ items: { relPath, file }[], emptyDirs, source }`. `readEntries` loops to an empty array;
      `DataTransferItemList` roots are collected **synchronously** before the first `await`.

**Phase 3 — chat explorer wiring**

- [x] T4 (R1, R2): `file-explorer-parts.tsx` — add `multiple` to the hidden input, add a second
      `webkitdirectory` input, and turn the toolbar upload button into a two-way menu (files /
      folder) reusing `context-menu.tsx`; add both entries to the context menu.
- [x] T5 (R4, R6, R7, R8, R9, R15): `upload-progress.tsx` + `upload-conflict-dialog.tsx` +
      `upload-queue.module.scss` — progress panel docked below the tree (never covering it,
      dismissable only once settled, listing failed / skipped only, `--warning` bar on partial
      failure, throttle notice, empty-folder notice while `source === 'directory'`) and the
      three-choice conflict dialog with the apply-to-rest row. Both take an injected labels object;
      colors come from CSS variables only (§4.2).
- [x] T6 (R1, R2, R11, R12): `file-explorer-context.tsx` — replace the single-file
      `onUploadPicked`/`actUpload` path with the queue, add the drop-zone handlers, refresh once via
      `onSettled`, and degrade to sequential when only `upload` is supplied.
- [x] T7 (R3, R14, R16): Vitest — `readEntries` loop over a faked entry tree (proves no silent
      loss), recursion + empty-directory branch, both conflict deadlocks (concurrent asks; cancel
      while awaiting an answer), and the tracker reporting only after retries are exhausted.

**Phase 4 — contract, copy, demo**

- [x] T8 (R2, R4, R12): `create-sandbox-fs-providers.ts` + `types.ts` — add the additive
      `uploadMany` / `FsUploadMany` (relative path, `createOnly`, `signal`) and a path-relative
      `mkdir` for empty directories, keeping `upload` / `FsUpload` byte-identical; route the batch
      write through the tracker per decision 2.
- [x] T9 (R13): `packages/react/src/i18n.ts` — new `fileExplorer.*` keys in `en-US`, `ja-JP` and
      `zh-TW`. Keys live in this repo (no Tolgee), so they ship with the code.
- [x] T10 (R15): Confirm SourceSet is untouched — `source-set-explorer.spec.tsx` still green,
      including its zero-`draggable` assertion; no duplicate limiter or progress model introduced.
- [x] T11 (R17): Extend the `/file-explorer` demo mock with the three real backend behaviors
      (recursive parent creation, `409` under `create_only`, `503` on every 9th file's first
      attempt) and a 64MB `maxUploadBytes`, then walk R1–R16 at **both widths** (default shell and
      the full-bleed override, side by side) per `AGENTS.md`.
- [x] T12: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck` +
      `npm run build:core && npm run build:react` + `npm run test:packages`.

---

## Coverage

Use Cases: `R1`–`R17` (R3's recursive-drag path and R2's folder picker are covered by unit tests over a
faked entry tree / live `FileList`, plus a manual drag — see the note under Acceptance Criteria; the
64MB case is blocked on asgard-core#230).

Files:

**`@asgard-js/core`**

- `packages/core/src/types/sandbox-fs.ts` — `SandboxFsWriteOptions.signal`
- `packages/core/src/lib/client.ts` — `sandboxFsWrite` forwards `signal` to `fetch`

**`@asgard-js/react` — new shared layer (`components/upload-queue/`, internal, not re-exported)**

- `pick-upload.ts` — three picking paths, the `readEntries` loop, `dedupeName`, `splitRelPath`
- `use-upload-queue.ts` — worker pool, AIMD, back-off, conflict serialization, cancellation
- `upload-labels.ts` — the injected copy contract + `formatUploadSize`
- `upload-progress.tsx` — docked progress panel
- `upload-conflict-dialog.tsx` — three choices + apply-to-rest
- `upload-queue.module.scss` — both components' styles
- `index.ts` — internal barrel
- `pick-upload.spec.ts` (12 tests), `use-upload-queue.spec.tsx` (16 tests)

**`@asgard-js/react` — wiring**

- `components/file-explorer/file-explorer-context.tsx` — queue wiring, two pickers, upload menu, drop
  zone, degraded sequential path, labels, overlay
- `components/file-explorer/file-explorer-parts.tsx` — two hidden inputs, two-way upload menu, drop
  target on the body, both context-menu entries
- `components/file-explorer/file-explorer-panel.tsx` — `uploadMany` / `maxUploadBytes` /
  `uploadConcurrency` pass-through
- `components/file-explorer/file-explorer-panel.module.scss` — drop highlight + overlay
- `components/file-explorer/create-sandbox-fs-providers.ts` — `uploadMany`, and the tracker's
  `countFailure` so only a terminal `5xx` counts toward eviction
- `components/file-explorer/types.ts` — `FsUploadMany`, `FsProviders.uploadMany`
- `components/file-explorer/index.ts` — exports `FsUploadMany`
- `components/file-explorer/icons.tsx` + `icons.spec.tsx` — `CircleCheckIcon`, `FileWarningIcon`,
  `FolderUpIcon` (geometry taken from lucide 0.487.0, added to the guard's table)
- `components/file-explorer/upload-picked-live-filelist.spec.tsx` (1 test) — regression guard for the
  live-`FileList` defect found in the browser
- `i18n.ts` — 29 new `fileExplorer.*` keys × `en-US` / `ja-JP` / `zh-TW`

**Demo**

- `apps/react-demo/src/app/routes/file-explorer/file-explorer.tsx` — `uploadMany` mock reproducing the
  three real backend behaviors, a 64MB cap, and the wide/narrow side-by-side section

**Not touched (AC16):** `components/source-set-explorer/*` — its 27 tests, including the
zero-`draggable` assertion, still pass unchanged.

---

## Execution Log / Change Log

- 2026-08-20: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/84 (Status: `draft`).
- 2026-08-20: Plan confirmed; branch `feat/f031-batch-upload` cut from `main` (Status: `draft → ready → in-progress`).
- 2026-08-20: Implemented all four phases. Static gate green: `lint:packages` 0 errors (5 pre-existing
  warnings), `typecheck` all three projects, `build:core` + `build:react`, `test:packages` 250 core /
  335 react (+29). `format:check` reports only `CLAUDE.local.md`, which is gitignored and untouched.
- 2026-08-20: Browser pass on `/file-explorer` found **one real defect and fixed it**: the picked
  `FileList` is live, so clearing `input.value` before copying it emptied the list and the batch
  silently never started. jsdom's `fireEvent.change` assigns a plain array and cannot reproduce it, so
  `upload-picked-live-filelist.spec.tsx` restores the live semantics as a regression guard (verified to
  fail against the defect).
- 2026-08-20: R1, R2, R3 (highlight + flat-drop path), R4, R7, R8, R9, R10, R14 walked in Chromium at
  both 987px and 343px; 0 console errors; no horizontal overflow at either width. The three critical
  tests were canary-checked by reintroducing each bug (conflict serialization, cancel-releases-resolver,
  single-read `readEntries`) and confirming the test fails (Status: `in-progress → done`).
