# BUILD-066 Keep a File Explorer file drop inside the panel

## Meta

- Task ID: `BUILD-066`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/446`
- Source spec: the issue body itself (bug reported in this repo; PM has no tracking spec for it). Behavioral
  context: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-031-對話-file-explorer-批次上傳-多檔-資料夾遞迴.md`
  AC3 (the panel's external drop zone) and F-021 (the built-in aside).
- Complexity: `S`

---

## Brief

A batch of files dropped onto the chat-side File Explorer is handled **twice**: the panel uploads it to
the sandbox (correct), and the same `drop` event then bubbles to `<ChatbotContainer>`, which turns every
file into a composer attachment chip the user has to dismiss one by one. One gesture, two outcomes.

The panel's `dropZoneProps.onDrop` calls only `preventDefault()`, which suppresses the browser default
and nothing else — propagation continues to `chatbot.tsx`'s `handleDrop`. Its own `stopPropagation()`
there does not help: it is the second handler, not the one being shadowed. The same omission applies to
the drag-tracking events: the panel has no `onDragEnter` at all, so the chatbot's `dragCounterRef`
increments while the cursor is over the panel and the global "drop to attach" overlay lights up next to
the panel's own "Drop to upload to /work" highlight.

Fix: the panel **claims** a file drag it can serve — `stopPropagation()` alongside the existing
`preventDefault()`, plus the missing `onDragEnter` — and stays entirely out of the way (no
`preventDefault`, no `stopPropagation`) for drags it cannot serve, so the composer-attachment path is
unchanged when there is no upload provider, a file view is open, or the drag carries no files.

**Already exists:** `packages/react/src/components/file-explorer/file-explorer-context.tsx`
(`DropZoneProps` at 45, `dropZoneProps` at 545), `file-explorer-parts.tsx` (`FileExplorerRoot` at 38
binds `rootRef` and hosts the dialog + upload overlay; `FileExplorerBody` at 321 spreads the zone and
renders the highlight), `packages/react/src/components/chatbot/chatbot.tsx` (`handleDragEnter` /
`handleDragOver` / `handleDragLeave` / `handleDrop` at 348–392, `dragCounterRef`, `DropZoneOverlay`),
`packages/react/src/components/upload-queue/pick-upload.ts` (`isFileDrag`),
`apps/react-demo/src/app/routes/file-explorer/file-explorer.tsx` (built-in aside over the in-memory fs
mock — the F-031 verification route).

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
Each criterion is mapped to one or more Implementation Tasks (→ T#).

- `R1` When a file drag is dropped on the File Explorer's drop zone, while the panel can serve it (an
  `upload` or `uploadMany` provider is present and no file view is open), the system shall handle the
  drop as an upload **only** — the event shall not reach an enclosing `<Chatbot>`, so no composer
  attachment is created for that batch. → T2
- `R2` When a file drag enters, moves over, or leaves that same drop zone, the system shall keep those
  events inside the panel, so the chatbot's global drop overlay does not light up alongside the panel's
  own "Drop to upload to …" highlight. → T2
- `R3` When a file drag crosses out of the panel into the chat column and is dropped there, the system
  shall still create composer attachments — the chatbot's drag counter shall not be left unbalanced by
  the panel having claimed the events it saw (no overlay stuck on, none missing). → T2
- `R4` When the panel cannot serve the drag (no `upload` / `uploadMany` provider, a file view is open, or
  the drag carries no files), the system shall leave the events untouched, so the existing
  composer-attachment behavior is bit-for-bit unchanged. → T2
- `R5` When a file drag is dropped anywhere on the panel that is **not** the tree area — the source-picker
  header row, the cwd line, the toolbar, or the upload progress panel — while the panel can serve it, the
  system shall treat it exactly as a drop on the tree area. → T3
  > **Confirmed at the plan gate (2026-08-20).** R5 widens the fix past the issue's own suggestion, which
  > asks only for `stopPropagation()` on the existing zone. Without it those four strips still leak to the
  > composer, because the zone was spread on the body element alone — and the progress panel in particular
  > covers the tree's own bottom edge for the whole duration of a batch. Implemented as a move of the
  > spread from `FileExplorerBody` to `FileExplorerRoot`; the `dropping` highlight stays in the body.
- `R6` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, the new Vitest
  suite, and walks R1–R5 in the react-demo `/file-explorer` route (`npm run serve:react-demo -- -- --port 5100`)
  at both the default 375px shell and a full-bleed wide shell, the system shall behave as R1–R5 describe
  with no build errors and no regression in the F-031 batch upload flow. → T4, T5, T6

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1–R4): TDD first — add `packages/react/src/components/file-explorer/drop-propagation.spec.tsx`:
      mount the explorer parts inside an outer element carrying the same four handlers as
      `ChatbotContainer` (spies), then assert the outer spies are silent for a served file drop
      (R1 / R2), fire for the fall-through cases (R4), and that enter/leave stay balanced across the
      panel boundary (R3). Confirm the suite fails against today's code before touching the source.
- [x] T2 (R1–R4): In `file-explorer-context.tsx`, add `onDragEnter` to `DropZoneProps` and to
      `dropZoneProps`, and add `event.stopPropagation()` to every claimed path (`dragenter`, `dragover`,
      `dragleave`, `drop`). Keep every existing guard clause as a **plain early return** — no
      `preventDefault`, no `stopPropagation` — so an unservable drag passes through untouched.
- [x] T3 (R5, if confirmed): move the `{...zone}` spread from `FileExplorerBody` to `FileExplorerRoot`
      so the whole panel is the claim surface, leaving the `dropping` highlight and its overlay where
      they are; extend the T1 suite with a drop on the toolbar.
- [x] T4 (R6): Give the `/file-explorer` route's built-in-aside `<Chatbot>` the `enableUpload` prop it
      lacks. Without it `isDropEnabled` is false, `handleDrop` early-returns, and the bug is not
      reachable in the demo at all — Odin (the reporting consumer) does pass it.
- [x] T5: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck` +
      `npm run build:core && npm run build:react` + `npm run test:packages`
- [x] T6 (R6): Browser verification. External file drops cannot be produced by CDP synthetic mouse
      events, so drive them the way the issue reporter did: dispatch a real `DragEvent` carrying a
      populated `DataTransfer` at the target element and let native bubbling + React delegation do the
      rest — propagation is exactly what is under test, and it is genuine. Walk R1–R5 at both widths
      (the shell is full-bleed on this route, so resizing the window resizes the shell; this fix is
      behavioral, not layout, so a side-by-side pair of shells buys nothing here).

---

## Coverage

Use Cases: `R1`–`R6`. R1–R4 have unit coverage in `drop-propagation.spec.tsx` (4 of the 6 cases fail
against the pre-fix source); R1–R5 were also walked in the browser on the real `<Chatbot
fileExplorer="builtin">`, including a before/after pair captured by reverting the two source files.

Files:

**`@asgard-js/react`**

- `components/file-explorer/file-explorer-context.tsx` — `DropZoneProps.onDragEnter`; `dropZoneProps`
  reworked around `serves()` + `claim()` so a served drag is taken out of circulation on all four
  events and an unservable one passes through untouched; `openFile` folded into the served condition
  and into the memo deps
- `components/file-explorer/file-explorer-parts.tsx` — the zone moves from `FileExplorerBody` to
  `FileExplorerRoot`; the body keeps the highlight and now keys it on `dropping` alone (the duplicate
  "can this panel upload, and is the tree on screen" condition is gone — §6)
- `components/file-explorer/drop-propagation.spec.tsx` — **new**, 6 tests

**`apps/react-demo`**

- `src/app/routes/file-explorer/file-explorer.tsx` — the built-in-aside `<Chatbot>` gains
  `enableUpload` + `enableDocumentUpload`, which is what makes the shell a live drop target on this
  route at all, plus a paragraph naming the check

Not touched, deliberately: `components/chatbot/chatbot.tsx`. The shell's four handlers and its counter
are unchanged, so the composer-attachment path carries no risk from this fix.

---

## Execution Log / Change Log

- 2026-08-20: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/446 (Status: `draft`).
- 2026-08-20: Plan confirmed with R5 included; branch `fix/446-explorer-drop-stays-in-panel` cut from
  `main` (Status: `draft → ready → in-progress`).
- 2026-08-20: TDD — `drop-propagation.spec.tsx` written first; 4 of 6 cases failed against the pre-fix
  source (upload _and_ attachment for one drop, the shell overlay lit beside the panel highlight, a
  toolbar drop not served, the shell counter left wrong after a boundary crossing). The 2 that passed
  before and after are the fall-through guards.
- 2026-08-20: Fix implemented; all 6 pass. `lint:packages` ✅, `typecheck` (core + react + demo) ✅,
  `build:core` + `build:react` ✅, `test:packages` 592 passed (core 250 / react 342, +6).
- 2026-08-20: Browser verification on `/file-explorer` (port 5100), external file drops driven by
  dispatching real `DragEvent`s carrying a populated `DataTransfer` — native bubbling and React
  delegation are what is under test, so a synthesized event exercises the real path. **Before** (both
  source files reverted): one drop on the panel gave `Upload finished 2 / 2` _and_ two composer chips,
  and hovering the panel lit the shell's "Drop files here" card beside the panel's own "Drop to upload
  to /home/user/project" — the second half of the report, which the issue had only inferred from the
  source. **After**: R1 upload only, no chips; R2 shell overlay stays dark; R3 the overlay hands back
  and forth correctly across the boundary and a thread drop still attaches; R4 with a file view open
  the panel declines and the drop attaches as before; R5 drops on the toolbar, the header strip and
  the upload progress panel all upload. The standalone panels in the F-031 wide/narrow pair still
  upload from both the tree and the toolbar at 989px and 343px (Status: `in-progress → done`).
