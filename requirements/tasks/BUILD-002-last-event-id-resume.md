# BUILD-002 Last-Event-ID Resume

## Meta

- Task ID: `BUILD-002`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/2`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-002-last-event-id-斷線續傳.md` (+ `use-cases/UC-003`, `UC-004`)
- Complexity: `M`

---

## Brief

Enable transparent mid-stream reconnection via the standard **Last-Event-ID** cursor, and remove the pre-resume workarounds that fight it. `@microsoft/fetch-event-source` already tracks the last `id:` and reconnects with a `Last-Event-ID` header on its own — the task is to **stop suppressing that** (the `onerror` `throw` and the RxJS `retry(3)` that re-POSTs), while the SDK adds a **no-duplicate-dispatch guard**: only let the native reconnect run once a cursor exists; when there is no cursor (pre-200 failure / no `id:` yet) the error surfaces to the caller as `HttpError` and the POST is **not** blindly resent (which the backend would treat as a new run). Backend contract: asgard-sdk-go `CHANGELOG` v1.6.0 (`POST + non-empty cursor` = resume, `POST + empty cursor` = re-dispatch).

**Scope this cycle:** UC-003 (transparent resume) + UC-004 (no-cursor → surface, no re-dispatch) — verifiable via a scoped demo mock. **Deferred (needs a real dev backend to avoid regressing bug #2):** removing `openWhenHidden` (R4 background-tab) and reworking `detach` into a cursor rejoin (R5) — documented as a follow-up; not changed blindly here.

**Already exists:** `packages/core/src/lib/create-sse-observable.ts` (`onerror` throws :92 → suppresses native reconnect; `onmessage` :72 ignores `esm.id`; `openWhenHidden: true` :52). `packages/core/src/lib/client.ts` (`retry(3)` :125 → re-POSTs; `detach` :163 long-hold). `packages/react` demo mock has a drop-then-resume harness pattern (from the F-011 scoped-mock approach).

---

## Relevant Rules

| §    | Rule (summary)                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any`                                                                                     |
| §1.2 | No `@ts-ignore` / `eslint-disable`                                                                      |
| §1.5 | Clean teardown — the `AbortController` teardown stays; native reconnect must still abort on unsubscribe |
| §1.6 | `@asgard-js/core` stays framework-agnostic                                                              |
| §1.7 | Preserve the public `HttpError` contract surfaced on pre-200 / no-cursor failure (no breaking change)   |
| §3.1 | Explicit return types                                                                                   |
| §3.3 | RxJS: error goes through the stream's error channel (not swallowed); no re-POST retry at the RxJS layer |
| §7   | No `setTimeout` mock delays in library code (demo mock may stage the drop)                              |

---

## Acceptance Criteria

- `R1` When a stream is established (200 received, at least one event carried an `id:`) and the connection drops mid-stream, the SDK shall auto-resume via the library's native `Last-Event-ID` reconnect — seamless, no missed events, no duplicates. → T1, T2
- `R2` Resume shall use the standard `Last-Event-ID` (reconnect carries the last cursor and obeys the server `retry:` interval) — driven by the un-suppressed library, not a hand-rolled cursor. → T1
- `R3` When there is no cursor (failure before 200, or no `id:` received yet), the SDK shall **not** auto-reconnect the POST; the failure surfaces to the caller as `HttpError` (no duplicate dispatch). → T1, T2
- `R4` (Deferred — needs dev backend) Background tab → foreground resumes correctly; `openWhenHidden` returns to the library default only after confirming no regression of the "background display broken" bug. → documented follow-up, not changed this cycle.
- `R5` (Deferred — evaluate) `detach` / `keepConnectionOnUnmount` reworked to cursor rejoin instead of a 90s long-hold. → documented follow-up.
- `R6` Replay (GET rejoin) / reconnection render consistently with live. → T3
- `R7` (Smoke) `build:core && build:react` green; a react-demo route whose scoped mock drops mid-stream then resumes from the `Last-Event-ID` shows a transparent resume (no dup, no gap), and a pre-200 / no-cursor failure surfaces as an error (no re-POST); screenshot/GIF to `.github/screenshots/`. → T3, T4

---

## Implementation Tasks

- [x] T1 (R1–R3): `create-sse-observable.ts` — track a cursor flag from `esm.id` in `onmessage`; in `onerror`, when a cursor exists **do not throw** (let the library reconnect with `Last-Event-ID`), when no cursor exists surface the error (`subscriber.error`) + abort (no reconnect). Keep the `onopen` pre-200 `HttpError` path and the `AbortController` teardown.
- [x] T2 (R1, R3): `client.ts` — remove the RxJS `retry(3)` (it re-POSTs → duplicate dispatch); resume is now the library's job.
- [x] T3 (R6, R7): react-demo scoped route + mock — drop the socket mid-stream, then on the `Last-Event-ID` reconnect resume from the cursor (transparent); and a no-cursor/pre-200 branch that surfaces an error. Browser-verify; screenshot.
- [x] T4 (R4, R5): write `requirements/tasks/FOLLOWUP-f002-background-tab-detach.md` capturing the deferred `openWhenHidden` + `detach→rejoin` items (need dev-backend regression); do **not** remove `openWhenHidden` / rewrite `detach` this cycle.
- [x] T5: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R6, R7 (UC-003 transparent resume + UC-004 no-cursor guard). R4 / R5 deferred (follow-up).
Files:

- `packages/core/src/lib/create-sse-observable.ts` — `hasCursor` flag from `esm.id`; `onerror` returns (native reconnect) when a cursor exists, surfaces + aborts when none.
- `packages/core/src/lib/client.ts` — removed the RxJS `retry(3)` (re-POST) + its now-unused `retry` import.
- `apps/react-demo/src/mock-server/sse-mock.ts` — scoped `stream-resume-demo` handler (`writeCursorEvent` with `id:`; drop-then-resume by `Last-Event-ID`; `no-cursor` → 500 pre-200).
- `apps/react-demo/src/app/routes/stream-resume/{stream-resume.tsx,.module.scss,index.ts}` (new) — demo route.
- `apps/react-demo/src/app/app.tsx`, `components/layout/layout.tsx` — route + nav.
- `requirements/tasks/FOLLOWUP-f002-background-tab-detach.md` (new) — deferred R4 (`openWhenHidden`) / R5 (`detach` rejoin).
- `.github/screenshots/f-002/stream-resume-demo.png` (new) — verification artifact.

Verification: build:core + build:react ✅ · lint:packages ✅ · vitest 5/5 (F-011 unaffected) ✅. Browser `/stream-resume` (proven via DevTools Network): **R1/R2/R6** — after a mid-stream drop, the reconnect POST carries `last-event-id: resume-msg:3`; the mock resumes from idx 4 through to `complete` with the full text (no gap, no dup). **R3** — the `no-cursor` click is a **single** POST → `500` (no `retry(3)` re-POST); the `HttpError` surfaces via `onSseError`. Console shows only the expected `ERR_INCOMPLETE_CHUNKED_ENCODING` (the drop) + `500` (no-cursor), no crash. **R4 / R5** deferred (need dev backend; documented).

---

## Execution Log / Change Log

- 2026-07-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/2 (F-002 + UC-003/UC-004) (Status: `draft`).
- 2026-07-14: Implemented T1–T5 — un-suppress native Last-Event-ID reconnect (onerror cursor guard) + remove RxJS retry(3); scoped resume demo route/mock; deferred R4/R5 follow-up. Network-verified transparent resume + no-cursor single-POST surface; build/lint/tests green; screenshot committed (Status: `in-progress → done`).
