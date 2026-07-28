# REVIEW-030 Review: Stop generation must actually suspend the background run

## Meta

- Task ID: `REVIEW-030`
- Status: `done`
- BUILD Task: `BUILD-030`
- Reviewed commit: `461034d8d9468a1acd3b1f2800cd1d4526022a63`
- Reviewed branch: `feat/34-stop-generation-suspend-run`

---

## §1 Static Code Review

Scope: the files listed in `BUILD-030 ## Coverage`. `lint` / `format` / `typecheck` / `build` run
project-wide.

### §1.1 Checklist

| Check item                                                       | Rule                      | Result                                                                                               |
| ---------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `any` / `as any`                                                 | FRONTEND_RULE_COMMON §1.1 | ✅ 0 in added lines                                                                                  |
| `@ts-ignore` / `@ts-nocheck` / `eslint-disable` to bypass errors | §1.2                      | ✅ 0 in added lines                                                                                  |
| `console.log` left in library code                               | §1.3 §7                   | ✅ 0 in added lines                                                                                  |
| Hardcoded API key / endpoint / namespace                         | §1.4                      | ✅ suspend URL derived from `botProviderEndpoint`                                                    |
| RxJS subscription / EventSource / timer teardown                 | §1.5                      | ✅ `forceStopTimer` cleared on 5 paths (see note)                                                    |
| react imports core only via the public entry                     | §1.6                      | ✅ grep for `@asgard-js/core/src` empty                                                              |
| core imports no `react` / `react-dom` / DOM                      | §1.6 §2.1                 | ✅ grep empty                                                                                        |
| Public API change has a `@deprecated` transition                 | §1.7                      | ✅ non-breaking widening — see note                                                                  |
| New public types / functions exported from the package entry     | §2.2                      | ✅ `ChannelBusyError` / `isChannelBusyError` from `src/index.ts`                                     |
| New template type / enum prerequisites present                   | §2.3                      | n/a — no new message template                                                                        |
| Uses `botProviderEndpoint`, not deprecated `endpoint`            | §2.4                      | ✅ `deriveSuspendEndpoint()` → `getBaseEndpoint()`                                                   |
| Exported functions / methods declare explicit return types       | §3.1                      | ✅ `stopGeneration(): Promise<void>`, `getRunStatus(): RunStatus`, `suspendChannel(): Promise<void>` |
| Shared types centralized in core `src/types/`, no duplicates     | §3.2                      | ✅ `RunKind` / `StopPhase` / `RunStatus` in `types/channel.ts`                                       |
| React component props fully typed                                | §4.1                      | ✅ no new props; context fields typed                                                                |
| No hardcoded colors in components                                | §4.2                      | ✅ 0 in added lines; reuses `submit_button__disabled`                                                |
| `react` / `react-dom` stay peerDependencies                      | §4.4                      | ✅ `@asgard-js/core, react, react-dom`                                                               |
| core and react share the same version                            | §5                        | ✅ 0.3.26 / 0.3.26                                                                                   |
| Repeated logic (≥2×) / types / JSX (≥3×) extracted               | §6                        | ✅ `settleRun()`, `clearForceStopTimer()`, `runStatusEqual()`, derived booleans hoisted into context |
| `setTimeout` mock delays, dead commented code, TODO / FIXME      | §7                        | ✅ the only `setTimeout` is the AC7 force-stop timer; 0 TODO / FIXME                                 |

**§1.7 note.** `stopGeneration()` keeps its name and gains a widened return type (`void` →
`Promise<void>`) plus an optional argument. Nothing is removed and `() => Promise<void>` stays
assignable to `() => void`, so `onClick={stopGeneration}` still compiles — there is no removed surface
to mark `@deprecated`. `suspendChannel` is **optional** on `IAsgardServiceClient`, so existing custom
clients keep compiling and fall back to the legacy local abort. The behavioural change is carried by
JSDoc and both READMEs (R12).

**§1.5 note.** `forceStopTimer` is cleared in `clearForceStopTimer()`, called from `settleRun()` (every
terminal), the suspend-failure path, `armForceStopTimer()` (re-arm), `abortConnection()`, and `close()`
— `channel.ts:438, 650, 660, 676, 701, 714`. A Vitest case asserts a pending timer firing after
`close()` does not throw.

### §1.2 Mechanical Grep

Run against added lines only (`git diff a3ced8f..HEAD` filtered to `^+`), because a repo-wide scan
surfaces only pre-existing hits — debug-gated `console.log` behind `eslint-disable-next-line no-console`
in `client.ts` / `use-channel.ts`, and two prose matches for the word "any".

```
: any            0
<any>            0
as any           0
@ts-ignore       0
@ts-nocheck      0
eslint-disable   0
console.log      0
TODO             0
FIXME            0
```

Package-boundary and colour scans (repo-wide; exit 1 = no match = pass):

```
grep -rn "from 'react'|react-dom" packages/core/src/            → exit 1 ✅
grep -rn "@asgard-js/core/src|core/src/lib" packages/react/src/ → exit 1 ✅
added lines matching '#[0-9a-fA-F]{3,6}|rgba('                  → exit 1 ✅
```

Timer scan (`setTimeout` / `clearTimeout` in added lines):

```
+  private forceStopTimer?: ReturnType<typeof setTimeout>;
+    clearTimeout(this.forceStopTimer);
+    this.forceStopTimer = setTimeout(() => {
```

The single timer is the AC7 escalation, not a mock delay, and has teardown — §7 and §1.5 satisfied.

### §1.3 Build / Lint / Format / Typecheck

```
lint:packages:       PASS — 0 errors (1 pre-existing warning, file-view.tsx:171 exhaustive-deps, untouched)
format:check:        PASS — All matched files use Prettier code style!
typecheck:packages:  PASS — Successfully ran target typecheck for 2 projects
build:core:          PASS — exit 0
build:react:         PASS — 0 error TS
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked
- [x] No ❌ violations
- [x] All §1.2 greps run and output pasted
- [x] `npm run typecheck:packages` clean (the command that actually fails on a type error)
- [x] `npm run lint:packages` — no ESLint errors

**§1 result: 0 violations.**

---

## §3 Functional Validation

Two harnesses: core Vitest (150 passed, +24 for this task) and a Playwright walkthrough of the
`/stop-generation` demo route (15/15 checks). The walkthrough was run twice — once by the BUILD task
and once here as independent confirmation — with identical results.

### R# Result Matrix

| R#  | Description                                                    | Result | Note                                                                                                                                   |
| --- | -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Stop calls `POST /message/suspend`, not just a local abort     | Pass   | Browser: `…/message/suspend?custom_channel_id=stop-generation-demo&request_id=91aa896f-…`. Vitest asserts the stream stays subscribed. |
| R2  | Accepted stop holds the stream; releases on the terminal event | Pass   | Browser: no send button until `run.done`; Vitest asserts `stopPhase: 'stopping'` persists, then resets on terminal.                    |
| R3  | Stop control inert while stopping                              | Pass   | Browser: `aria-label="Stopping…" disabled=true`; Vitest asserts a repeat press hits the endpoint only once.                            |
| R4  | Failed suspend leaves `stopping`, retryable                    | Pass   | Browser: 500 → control back to `Stop generating`, pressable; Vitest asserts rejection + rollback + a successful retry.                 |
| R5  | Send button / Enter / quick replies closed; draft preserved    | Pass   | Browser: Enter no-op, draft text retained, message never sent (DOM count 1 = textarea only).                                           |
| R6  | `sendMessage()` rejects with `ChannelBusyError`, no bubble     | Pass   | Vitest: rejects while running and while stopping; asserts only the first user bubble exists.                                           |
| R7  | 10s timeout → force-stoppable → `force=true`                   | Pass   | Browser: escalates to `Force stop`, re-call carries `&force=true`, run then ends. Vitest covers the timer with fake timers.            |
| R8  | Non-user runs offer no stop control and call no endpoint       | Pass   | Browser: welcome run shows no stop control, 0 suspend requests. Vitest covers `reset` / `nudge` / `restore` kinds.                     |
| R9  | Non-`RUNNING` rejoin settles straight into waiting-for-input   | Pass   | Vitest: `runState: 'IDLE'` → `replay`, `'RUNNING'` → `restore`, absent → `replay`. React binds `RunningIndicator` to `isRunning`.      |
| R10 | Deliberate abort never reconnects; guarded by a test           | Pass   | `create-sse-observable.spec.ts` 3 cases: abort-then-error neither reconnects nor surfaces; a genuine mid-stream failure still does.    |
| R11 | Stop copy / a11y labels resolve through i18n                   | Pass   | Browser: `aria-label` and `title` both `Stop generating`; catalog carries `composer.stop/stopping/forceStop` in en-US / ja-JP / zh-TW. |
| R12 | Async transition documented                                    | Pass   | JSDoc on `Channel.stopGeneration` + `UseChannelReturn['stopGeneration']`; "Stopping generation" sections in both READMEs.              |
| R13 | Smoke: build + Vitest + demo walkthrough                       | Pass   | build 0 errors, Vitest 150 + 41 passed, demo walkthrough 15/15.                                                                        |

### §3.1 Acceptance

- [x] Every R# in `BUILD-030 ## Coverage` executed (static read + browser operation + boundary cases)
- [x] Each R# marked Pass with evidence
- [x] Vitest run and green (150 core / 41 react)
- [x] Boundary conditions confirmed: suspend failure (500), timeout with no terminal, repeat press,
      non-user run kinds, and draft retention under a blocked send

**§3 result: 13 / 13 R# Pass, 0 Fail.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **The demo app sits outside the type-check gate.** `npm run typecheck:packages` covers only
   `@asgard-js/core` and `@asgard-js/react`, so `apps/react-demo` type errors go unreported.
   `npx tsc --noEmit -p apps/react-demo/tsconfig.app.json` currently reports 8 — all pre-existing, in
   unrelated files (`ChatbotTheme` / `Theme` imports that no longer exist, `ToolCallStatus.cancelled`
   missing from a record), none in files this task touched. Worth folding into the follow-up that
   re-enables CI.

2. **Enter while stopping inserts a newline.** `onKeyDown` calls `preventDefault()` only when
   `canSend`, so a blocked Enter falls through to the textarea default. The draft survives — which is
   what UC-045 requires — but gains a trailing `\n`. Pre-existing behaviour for every other reason
   `canSend` is false, not introduced here.

---

## Execution Log

- 2026-07-28: REVIEW task created, paired with BUILD-030 (Status: `draft`).
- 2026-07-28: BUILD-030 reached `done`; REVIEW promoted (Status: `draft → ready`).
- 2026-07-28: §1 static review — 19 checklist items ✅, 0 ❌; all greps empty on added lines;
  lint / format / typecheck / build green.
- 2026-07-28: §3 functional validation — Vitest 150 core + 41 react passed; Playwright walkthrough of
  `/stop-generation` 15/15, re-run independently with identical results; 13 / 13 R# Pass.
- 2026-07-28: 0 BLOCKERs; 2 Minor findings recorded, both pre-existing and out of scope
  (Status: `ready → done`).
