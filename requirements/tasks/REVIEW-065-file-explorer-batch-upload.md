# REVIEW-065 Review: batch upload for the chat File Explorer

## Meta

- Task ID: `REVIEW-065`
- Status: `done`
- BUILD Task: `BUILD-065`
- Reviewed commit: `38a90db4` (branch tip at review time; the cycle's work is uncommitted on the branch)
- Reviewed branch: `feat/f031-batch-upload`

---

## §1 Static Code Review

Scope = the files in `BUILD-065 ## Coverage`. `lint` / `format` / `typecheck` / `build` run project-wide.

### §1.1 Checklist

| Check item                                                              | Rule                           | Result                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `any` / `as any`                                                        | FRONTEND_RULE_COMMON §1.1      | ✅ — `lib.dom.d.ts` already declares `FileSystemDirectoryReader`, `File.webkitRelativePath` and `HTMLInputElement.webkitdirectory`, so the prototype's casts were unnecessary. The two `as unknown as` in `pick-upload.spec.ts` build fake DOM objects, which is test scaffolding, not production typing                                         |
| `@ts-ignore` / `@ts-nocheck` / `eslint-disable` used to bypass errors   | FRONTEND_RULE_COMMON §1.2      | ✅ — none added. The five `eslint-disable-next-line no-console` in `client.ts` are pre-existing (lines 68, 393, 399, 442, 448) and outside this diff, which touches only the `fetch` call at 578                                                                                                                                                 |
| `console.log` left in library code                                      | FRONTEND_RULE_COMMON §1.3 §7   | ✅ for this task — the two hits in `client.ts` (394, 443) are pre-existing; see Minor 1                                                                                                                                                                                                                                                          |
| Hardcoded API key / endpoint / namespace                                | FRONTEND_RULE_COMMON §1.4      | ✅ — the size cap and concurrency are injected props, not constants; the shared layer names no endpoint at all                                                                                                                                                                                                                                   |
| RxJS subscription / EventSource / timer teardown                        | FRONTEND_RULE_COMMON §1.5      | ✅ — `useUploadQueue` unmount cleanup aborts the controller and releases a worker waiting on a collision answer. **Found and fixed during this review:** the exponential back-off `setTimeout` was not cleared on abort, so cancelling mid-back-off left one armed timer per waiting worker (see Findings)                                       |
| `@asgard-js/react` imports core via its public entry only               | FRONTEND_RULE_COMMON §1.6      | ✅ — `isHttpError` and `HttpError` come from `@asgard-js/core`; grep for `core/src` is empty                                                                                                                                                                                                                                                     |
| `@asgard-js/core` free of `react` / `react-dom` / DOM                   | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅ — the core change is one optional `signal` field plus passing it to `fetch`; `AbortSignal` is a platform type, not DOM-only, and the grep for react imports in core is empty                                                                                                                                                                  |
| Public API change goes through `@deprecated`                            | FRONTEND_RULE_COMMON §1.7      | ✅ — entirely additive: `SandboxFsWriteOptions.signal?`, `FsProviders.uploadMany?`, two optional provider props, two optional panel props, and new fields on the read-only `FileExplorerContextValue`. `FsUpload` and `actUpload` keep their exact signatures **and** behavior, which `upload-target-and-errors.spec.tsx` still proves unchanged |
| New public types / functions / components exported from the entry       | FRONTEND_RULE_COMMON §2.2      | ✅ — `export type { FsUploadMany }` reaches the entry via `components/file-explorer/index.ts` → `components/index.ts`. The `upload-queue/` module is deliberately **not** exported; the reason is recorded in its `index.ts` and in BUILD-065 decision 1                                                                                         |
| Message-template prerequisites (type + enum before component)           | FRONTEND_RULE_COMMON §2.3      | ✅ n/a — no message template added                                                                                                                                                                                                                                                                                                               |
| Uses `botProviderEndpoint`, not `endpoint`                              | FRONTEND_RULE_COMMON §2.4      | ✅ n/a — the fs endpoint is derived by the existing `deriveSandboxFsEndpoint`, untouched                                                                                                                                                                                                                                                         |
| Exported functions declare explicit return types                        | FRONTEND_RULE_COMMON §3.1      | ✅ — enforced by `@typescript-eslint/explicit-function-return-type`, which flagged six sites during the build (four label callbacks and two test helpers) and now reports none                                                                                                                                                                   |
| Shared types centralized; no duplicate interfaces                       | FRONTEND_RULE_COMMON §3.2      | ✅ for this task — `FsUploadMany` is declared once in `file-explorer/types.ts` and **imported** by `create-sandbox-fs-providers.ts` rather than redeclared. That file's pre-existing local copies of `FsUpload` / `FsMutatePath` / `FsMutateSrcDst` are untouched; see Minor 2                                                                   |
| React component props fully typed                                       | FRONTEND_RULE_COMMON §4.1      | ✅ — `UploadProgressProps` / `UploadConflictDialogProps` / `UploadLabels` are fully typed, and failure reasons are a discriminated union rather than a string                                                                                                                                                                                    |
| Hardcoded color values in components                                    | FRONTEND_RULE_COMMON §4.2      | ✅ — no colour literal in any `.ts` / `.tsx`. `upload-queue.module.scss` uses `--asg-color-*` with fallbacks, matching `file-explorer-dialog.module.scss`. The partial-progress bar uses the **existing** `--asg-color-warning` token the palette already generates, so no theme surface was widened                                             |
| `react` / `react-dom` stay peerDependencies                             | FRONTEND_RULE_COMMON §4.4      | ✅ — `packages/react/package.json` still lists both as peers only                                                                                                                                                                                                                                                                                |
| core / react version parity                                             | FRONTEND_RULE_COMMON §5        | ✅ — both `0.3.68`, peer pin `0.3.68`; untouched by this task                                                                                                                                                                                                                                                                                    |
| Repeated logic (≥2×) / JSX (≥3×) extracted                              | FRONTEND_RULE_COMMON §6        | ✅ — the two picker handlers were identical apart from the plan source, so both now delegate to one `takePicked`. The two context-menu upload entries and the toolbar menu share `actUpload` / `actUploadFolder` rather than duplicating the picker logic                                                                                        |
| `setTimeout` mock delays / commented dead code / untracked TODO / FIXME | FRONTEND_RULE_COMMON §7        | ✅ — no TODO / FIXME, no dead code. The one `setTimeout` added (`use-upload-queue.ts`) is the **real** exponential back-off the design mandates, not a simulated API delay; the rule targets fake latency in mock data. All other hits are pre-existing files outside this diff                                                                  |

**19 ✅ / 0 ❌.**

### §1.2 Mechanical Grep

Scoped to the Coverage paths; the two §1.6 greps run over whole packages as the rule specifies.

```
### any / as any                (no output)
### ts-ignore / eslint-disable  client.ts:68,393,399,442,448  — pre-existing, outside this diff
### console.log                 client.ts:394,443             — pre-existing, outside this diff
### TODO / FIXME                (no output)
### core imports react          (no output)
### react deep-imports core     (no output)
### hardcoded colors (ts/tsx)   file-explorer-context.tsx:220, request-file-loop.spec.tsx:11
                                  → false positives: both are the text "#427" (a GitHub issue number)
                                    inside a comment, not a colour literal
### setTimeout
use-upload-queue.ts:135                     — this task; the real back-off (justified above)
client.ts:37,330                            — pre-existing (detach timer)
file-explorer/file-view.tsx:123,127         — pre-existing (autosave debounce)
file-explorer/paste-dedupe.spec.tsx:109     — pre-existing (test)
```

### §1.3 Build / Lint / Format

```
lint:packages: PASS — 0 errors, 5 warnings, all pre-existing and in files outside this diff
               (the two warnings this task introduced — a JSX fragment invalidating a useMemo,
                and a closure declared inside the pump loop — were both fixed during the build)
format:check:  PASS for every version-controlled file. The single report is CLAUDE.local.md,
               which is gitignored (`*.local.*`), was never opened by this task, and cannot
               reach CI
typecheck:     PASS — all three projects (core, react, react-demo)
build:         PASS — build:core + build:react
test:packages: PASS — core 250, react 336 (+30 from this task)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅/❌
- [x] All ❌ violations listed with file path and line number — none
- [x] All §1.2 grep commands run and output pasted
- [x] `typecheck` run — no TypeScript errors
- [x] `lint:packages` run — no ESLint errors

---

## §3 Functional Validation

Two harnesses, as the rule prescribes: Vitest for logic, and the react-demo `/file-explorer` route in
Chromium for UI and interaction. The demo mock reproduces the three real backend behaviors (recursive
parent creation, `409` under `create_only`, `503` on every 9th file's first attempt) — without the third
the rate limiter and back-off never execute and would only "look right in the source".

**Three tests were canary-checked** by reintroducing the bug each one guards and confirming it fails:
conflict serialization, cancel-releases-the-waiting-worker, and the single-read `readEntries`. A fourth
canary covers the back-off timer fixed during this review.

### R# Result Matrix

| R#  | Description                                          | Result | Note                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Multi-file pick enqueues all N                       | Pass   | Browser: 12 files → `12 / 12`, bar `aria-valuenow=100`, all 12 in the tree. All eight `input[type=file]` on the route carry `multiple`. **This is where the one real defect was found** — see Findings                                                                                                                                                |
| R2  | Folder pick, dst from `webkitRelativePath`, no mkdir | Pass   | Browser: picking `notes/` uploaded 3 files and the tree shows `notes/ → sub/ → b.md, c.md` — the levels were created by the write itself, with no `mkdir` call issued                                                                                                                                                                                 |
| R3  | Drop recurses; `readEntries` loops to empty          | Pass   | Unit: 25 files through a reader yielding 2 per call returns 25 (a single read returns 2 — canary-verified). Browser: dragover highlights the whole body with the dashed outline and "Drop to upload to /home/user/project"; a synthesized drop uploaded 2/2. **The recursive-entry drag itself is manual** — `webkitGetAsEntry` cannot be synthesized |
| R4  | Empty dirs preserved on drop; stated for the picker  | Pass   | Unit: `emptyDirs: ['notes/empty']` from a drop, and `[]` from the picker. Browser: the caveat text is on screen for the whole `source === 'directory'` batch, and `empty/` correctly did not appear                                                                                                                                                   |
| R5  | Worker pool ceiling, never `Promise.all`             | Pass   | Unit: 9 files at concurrency 3 peak at exactly 3 in flight and all finish                                                                                                                                                                                                                                                                             |
| R6  | 429/5xx back-off + AIMD, ceiling shown               | Pass   | Unit: 3 attempts across 400ms + 800ms, ceiling halved 4 → 2 → 1; a 403 is not retried. Browser: the 9th file's 503 was absorbed and the batch still completed 12/12                                                                                                                                                                                   |
| R7  | Per-file status, `n/N`, retry only the failed        | Pass   | Unit: retry re-sends only the recoverable failure, never the success and never the oversized file. Browser: only failed/skipped rows are listed, and the bar switches to `progressFillPartial` (warning, not error)                                                                                                                                   |
| R8  | Cancel aborts, stops dispatch, explains itself       | Pass   | Browser: cancelling from the dialog settled the batch at once — all 8 items "Cancelled", none left as "queued", Cancel replaced by Dismiss. Unit: nothing dispatched after cancel; cancelling mid-back-off settles without waiting it out                                                                                                             |
| R9  | `create_only`, three choices + apply-to-rest         | Pass   | Browser: dialog on `README.md` offering Skip / Keep both / Overwrite plus "Apply to the remaining 5". "Keep both" produced `f1 (2).txt`; unit test proves the retry stays `createOnly`. The apply-to-rest row correctly disappears on the last item                                                                                                   |
| R10 | Oversized file fails before dispatch                 | Pass   | Browser: `big.bin` → "Over the 64.0 MB per-file limit (this one is 70.0 MB)". Unit: `write` called once for two files, so no request was spent                                                                                                                                                                                                        |
| R11 | One refresh per batch                                | Pass   | Unit: `onSettled` fires exactly once for a 5-file batch. Browser: the tree is correct after each batch. **The "exactly once" claim rests on the unit test** — the in-memory demo mock exposes no request log to count against                                                                                                                         |
| R12 | Old signatures intact; `uploadMany` additive         | Pass   | `upload-target-and-errors.spec.tsx` passes **unchanged**, still asserting `upload(sourceId, dirPath, File)`. A source with only `upload` runs at concurrency 1 and routes the relative directory through `dirPath`, so folder structure survives even degraded                                                                                        |
| R13 | Three locales for every new key                      | Pass   | 29 new `fileExplorer.*` keys present in `en-US`, `ja-JP` and `zh-TW`, counted per locale                                                                                                                                                                                                                                                              |
| R14 | Serialized asks; cancel releases the waiter          | Pass   | Unit: both deadlocks, both canary-verified. Browser: three simultaneous collisions produced exactly one dialog at a time, advancing `f1.txt` → `f2.txt`, and the batch reached `12 / 12`                                                                                                                                                              |
| R15 | Shared layer leaks nothing; all inputs injected      | Pass   | No occurrence of sandbox / volume / channel in `upload-queue/`; failures are `UploadReason` codes and every string arrives via `UploadLabels`                                                                                                                                                                                                         |
| R16 | Only a terminal 5xx counts toward eviction           | Pass   | Unit: `lastAttempt` is `false, false, false` while retries remain and `true` on the fourth. The tracker gained a `countFailure` parameter that batch writes pass through                                                                                                                                                                              |
| R17 | Smoke: build + demo walk                             | Pass   | Build green; both widths walked (987px and 343px) with 0 console errors and no horizontal overflow at either — progress panel 341px and conflict dialog 309px both fit inside the 343px shell                                                                                                                                                         |

### §3.1 Acceptance

- [x] Every R# executed (static read + browser operation + boundary conditions)
- [x] Each R# marked Pass / Fail / Blocked
- [x] Vitest green for every R# with unit coverage
- [x] Boundary conditions confirmed: oversized, collision, cancellation, cancel-during-back-off, empty
      plan, last-item collision (no apply-to-rest row), unmount mid-batch

### Not verified, and why

- **A real desktop drag of a folder.** `webkitGetAsEntry()` returns filesystem entries that no
  automation can fabricate — Playwright's file-upload helper sets `input.files`, which is a different
  code path. The recursion, the `readEntries` loop and the empty-directory branch are pure functions
  and unit-tested against a faked entry tree; the drag gesture itself needs a hand.
- **A 64MB file actually uploading.** Blocked upstream on `FileWriteMaxBytes` (EXT-003 /
  asgard-core#230); production is still 8MB. The cap is an injected parameter, so the demo exercises
  the target value and the pre-flight rejection above it — only "does a 64MB file reach the sandbox"
  is out of reach.

---

## Findings

### Critical (must fix before done)

None outstanding. One was found and fixed inside this cycle:

1. **[FRONTEND_RULE_COMMON §1.5] The back-off timer was not cleared on abort.**
   `use-upload-queue.ts` — cancelling a batch during an exponential back-off left one armed
   `setTimeout` per waiting worker, each firing up to 1.6s after the user had already given up. Fixed
   by making the delay abort-aware, with a test that fails against the old version
   (`vi.getTimerCount()` is 0 immediately after cancel).

### Important (should fix in this cycle)

Fixed during the build, recorded because of how it was found:

1. **The picked `FileList` is live, and clearing `input.value` emptied it before use.**
   The batch silently never started — no error, no console output, nothing on screen. Every unit test
   passed, because `fireEvent.change(input, { target: { files: [...] } })` assigns a plain array and
   discards the live semantics entirely. **Only driving a real browser caught it.** Fixed by copying
   the list before clearing the input, and guarded by
   `file-explorer/upload-picked-live-filelist.spec.tsx`, whose fixture restores the browser's own
   behavior (`files` returns one object; setting `value` empties that object) and which fails against
   the defect with "called 0 times".

### Minor (nice to have)

1. **Pre-existing `console.log` in `packages/core/src/lib/client.ts`** (394, 443), each with an
   `eslint-disable-next-line no-console` above it. §1.3 forbids library `console.log` that is not
   behind a debug option. Outside this task's diff — left alone rather than swept in.
2. **Pre-existing duplicate provider types.** `create-sandbox-fs-providers.ts` declares its own
   `FsUpload` / `FsMutatePath` / `FsMutateSrcDst` alongside the copies in `types.ts` (§3.2). This task
   imported `FsUploadMany` from `types.ts` instead of adding a fourth duplicate, but did not
   consolidate the existing three.
3. **`format:check` is red on `CLAUDE.local.md`.** Gitignored personal notes, so CI never sees it, but
   it does mean the documented "static checks all green" command reports a warning on this machine.

---

## Execution Log

- 2026-08-20: REVIEW task created, paired with BUILD-065 (Status: `draft`).
- 2026-08-20: §1 static review — 19 ✅ / 0 ❌; lint 0 errors, typecheck 3/3, build green, 586 tests
  green. One §1.5 finding raised and fixed in source (back-off timer not cleared on abort), then §1
  re-run green.
- 2026-08-20: §3 functional validation — R1–R17 all Pass across Vitest and Chromium at both widths;
  four tests canary-verified against the bugs they guard; two acceptance gaps stated explicitly
  (manual folder drag, 64MB blocked on asgard-core#230) (Status: `in-progress → done`).
