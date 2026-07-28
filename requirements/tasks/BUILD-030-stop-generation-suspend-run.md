# BUILD-030 Stop generation must actually suspend the background run

## Meta

- Task ID: `BUILD-030`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/34`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-023-停止生成改為真正中止背景-run.md`
  (use cases: `UC-044-停止生成前的確認與逾時強制停止.md`, `UC-045-停止後不可在既有-run-上送出新訊息.md`, `UC-046-重新整理或重新進房時反映-run-已停止.md`)
- Complexity: `L`

---

## Brief

The stop button today only calls `AbortController.abort()` (`Channel.stopGeneration()`), so no request ever reaches the backend. Because runs execute in the background on the server, "stop" currently means "stop watching": the agent keeps burning tokens, a second send starts a parallel run, a rejoin resumes the supposedly-stopped reply, and `sendMessage()`'s promise stays pending forever.

This task rewires stop-generation onto the backend suspend endpoint (`POST ${botProviderEndpoint}/message/suspend`, uniform across all six downstream relays) and makes the SDK wait for the **existing** SSE stream's terminal event before releasing the input. Stopping becomes a three-phase lifecycle (`idle → stopping → force-stoppable`) exposed as a per-slice store on `Channel`, and `isConnecting` — today one word with four meanings (user run / RESET_CHANNEL welcome / transcript rejoin / invisible nudge) — is split by a `RunKind` so only a user's own run offers a stop control.

No SSE event contract changes: the terminal event that declares "stopped" is the same one a normal run ends with.

**Already exists:** `packages/core/src/lib/channel.ts` (`stopGeneration`, `currentRun`, `isConnecting$`, `buildRunHandlers`, `fetchSse`/`rejoinChannel`/`nudge`), `packages/core/src/lib/client.ts` (`getBaseEndpoint`, `channelMetadata` incl. the already-parsed `runState`, `HttpError` handling), `packages/core/src/lib/create-sse-observable.ts` (abort teardown), per-slice store convention from F-016/F-018/F-019 (`BehaviorSubject` + `distinctUntilChanged` + snapshot accessor + `ChannelStates` field), `packages/react/src/hooks/use-channel.ts`, `packages/react/src/context/asgard-service-context.tsx`, `packages/react/src/components/chatbot/chatbot-footer/chat-composer.tsx` (send/stop/speech tri-state), `packages/react/src/components/templates/quick-replies/quick-replies.tsx`, `packages/react/src/i18n.ts` (`composer.stop` in en-US / ja-JP / zh-TW), `apps/react-demo/src/app/routes/join-init/` (mock-client demo pattern, no real backend needed).

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

## Backend contract (fixed, from asgard-sdk-go `v1.6.10` + the issue's reconciliation comment)

- Endpoint: **`POST ${botProviderEndpoint}/message/suspend`** — uniform across all six downstream relays, exactly mirroring the existing `GET ${botProviderEndpoint}/message/sse`, so the SDK derives it the same way with **no per-backend special case**.
- Always send `?custom_channel_id=<id>` (some backends read the channel from the path and ignore it; others require it).
- Optional query: `request_id` (suspend only that run), `force=true` (give up on the run instead of letting it wind down).
- Response: **any 2xx is success** — `204 No Content` and `200` + envelope are both used; never hardcode one. `404` = channel not created = "nothing to stop", **not** an error. Any other non-2xx is a real failure.
- The call returning only means **accepted**, never **stopped**. The stop is declared by the terminal event on the already-open SSE stream — the same event a normal run ends with. **No new SSE event type; the frontend event contract is unchanged.**
- Repeatedly suspending, or suspending an already-finished run, is a successful no-op.
- Conversation survives: the transcript is kept and the next message continues the same conversation; the suspended turn is rolled back.

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.
Each criterion is mapped to one or more Implementation Tasks (→ T#). The `AC#` column traces back to F-023.

- `R1` (AC1) When the user stops their own in-flight run, the system shall `POST ${botProviderEndpoint}/message/suspend?custom_channel_id=<id>` (adding `request_id` when the run's id is known, and `force=true` when forcing) rather than only aborting the local connection. → T2, T3
- `R2` (AC3) When the suspend call is accepted (any 2xx, or `404` treated as "nothing to stop"), the system shall keep the existing SSE stream open and stay in `stopping`, releasing to "waiting for input" only once that stream reaches its terminal (`run.done` / error). → T3, T4
- `R3` (AC2) While `stopping`, the system shall render the stop control as non-interactive so a second press dispatches nothing, and shall not present a send affordance in its place. → T6, T7
- `R4` (AC4) When the suspend call fails (network error, or a non-2xx that is not `404`), the system shall leave `stopping`, restore the stop affordance, and surface the failure through the channel's error path — the UI shall never be stuck in `stopping`. → T3, T6
- `R5` (AC5) While `stopping`, the system shall disable every send entrance (send button, Enter key, quick replies) while preserving the user's draft text and attachments. → T6, T7
- `R6` (AC6) When `Channel.sendMessage()` is called while any run is in flight, the system shall reject with a named `ChannelBusyError` without pushing a user bubble and without dispatching a second run, so the channel never holds two concurrent runs. → T2, T3
- `R7` (AC7) When the terminal event has not arrived within 10 s of an accepted suspend, the system shall expose a `force-stoppable` state whose control, when activated, re-calls the endpoint with `force=true`. → T3, T6
- `R8` (AC8) When the connection is held by a run the user did not send — `RESET_CHANNEL` welcome, transcript rejoin, or an invisible nudge — the system shall present no stop control and shall not call the suspend endpoint. → T1, T3, T6
- `R9` (AC9) When a channel is joined or refreshed and its `GET /channel/metadata` `runState` is not `RUNNING`, the system shall replay the transcript and settle directly into "waiting for input" — no run-in-progress indicator and no stop control. → T5
- `R10` (AC10) When the local connection is aborted deliberately (unmount, channel switch, or the no-suspend-support fallback), the system shall not classify it as an error and shall not auto-reconnect; this shall be guarded by a Vitest case rather than by the transport library's implicit behavior. → T4, T8
- `R11` (AC11) All stop-related visible copy and accessibility labels shall resolve through the i18n catalog for `en-US` / `ja-JP` / `zh-TW`, with no hardcoded English in components. → T7
- `R12` (AC12) `stopGeneration()` becoming asynchronous and fallible shall be documented per the repo's public-API transition convention (JSDoc on both the core method and the react hook return type), and the stop-generation flow shall be documented in `packages/core/README.md` and `packages/react/README.md`. → T9
- `R13` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, the core Vitest suite, and the react-demo (`npm run serve:react-demo`, http://localhost:4200) `/stop-generation` route, the system shall walk through R1–R11 — accepted stop, failed stop, force stop after timeout, blocked send entrances, and the three non-user run kinds — with no build errors. → T10

---

## Design

### Core — `packages/core`

1. **`RunKind` + `StopPhase` + `RunStatus` (`src/types/channel.ts`)** — split the four meanings of `isConnecting`:

   ```ts
   export type RunKind = 'user' | 'reset' | 'restore' | 'nudge';
   export type StopPhase = 'idle' | 'stopping' | 'force-stoppable';
   export interface RunStatus {
     kind: RunKind | null; // null when nothing is in flight
     stopPhase: StopPhase;
     requestId?: string; // captured from the first frame of the current run
   }
   ```

   `replyToolCallConsents` continues the user's turn, so it runs as `'user'` (stoppable).
   Exposed as `Channel.runStatus$` (BehaviorSubject + `distinctUntilChanged`, per-slice like `channelTitle$` / `sandboxPhase$` / `launchedSandboxes$`) + `getRunStatus()` snapshot + `ChannelStates.runStatus`. `isConnecting` stays as-is (no downstream break); `runStatus` is the new, finer signal.

2. **`AsgardServiceClient.suspendChannel()` (`src/lib/client.ts`)** — `suspendChannel(customChannelId, options?: { requestId?: string; force?: boolean }): Promise<void>`. Derives `${getBaseEndpoint()}/message/suspend`, POSTs with `custom_channel_id` (+ optional `request_id` / `force`), resolves on any 2xx **and** on `404`, throws `HttpError` otherwise. Declared **optional** on `IAsgardServiceClient` so existing custom clients keep compiling (§1.7).

3. **`Channel.stopGeneration()` (`src/lib/channel.ts`)** — `stopGeneration(options?: { force?: boolean }): Promise<void>`:

   - no-op resolve when nothing is in flight or `runStatus.kind !== 'user'` (R8);
   - no-op resolve when already `stopping` and not forcing (R3 defence in depth);
   - enter `stopping`, arm a 10 s timer → `force-stoppable` (R7);
   - call `client.suspendChannel(...)` with the captured `requestId`;
   - **accepted** → keep the stream open and return; the terminal handler in `buildRunHandlers` clears `stopping` + the timer and drops `isConnecting` (R2);
   - **failed** → clear `stopping` + the timer and rethrow so the caller can retry (R4);
   - **no `suspendChannel` on the client** (custom `IAsgardServiceClient`) → fall back to the legacy local abort so behavior does not regress.
   - The timer is cleared on terminal, on failure, and in `close()` (§1.5).

4. **`Channel.sendMessage()` guard** — reject with `ChannelBusyError` (new named error in `src/types/`) when a run is in flight, before the optimistic user bubble is pushed (R6).

5. **`create-sse-observable.ts`** — make the deliberate-abort path explicit: a `disposed` flag set by the teardown, checked in `onerror` so an abort can never be misread as a retryable failure. Backed by a Vitest case instead of relying on `@microsoft/fetch-event-source`'s internal `signal.aborted` guard (R10).

6. **Run kind wiring** — `fetchSse` takes the kind (`sendMessage`/`replyToolCallConsents` → `user`, `resetChannel` → `reset`, `nudge` → `nudge`); `rejoinChannel` → `restore`. `buildRunHandlers` captures `response.requestId` on the first frame and clears the whole run status on terminal.

### React — `packages/react`

7. **`use-channel.ts`** — `stopGeneration` becomes `(options?: { force?: boolean }) => Promise<void>`; expose `runStatus` from the states observer. R9: on the metadata gate, when `metadata.runState !== 'RUNNING'`, restore the transcript without presenting a live run (no running indicator, no stop control).
8. **`asgard-service-context.tsx`** — expose `runStatus` plus the two derived booleans components actually need (`canStop`, `isStopping`).
9. **`chat-composer.tsx`** — stop control only when `canStop`; `stopping` → disabled; `force-stoppable` → enabled with the force label + `force: true`; send button / Enter / speech gated on `isStopping` as well as `isConnecting`; draft preserved.
10. **`quick-replies.tsx`** — disabled while `isStopping` too.
11. **`i18n.ts`** — new `composer.stopping` / `composer.forceStop` keys in all three locales (R11).

### Demo — `apps/react-demo`

12. New `/stop-generation` route driven by a mock `IAsgardServiceClient` (same pattern as `/join-init`), so all branches are exercisable without a live backend: accepted stop, failing stop, terminal-never-arrives → force stop, blocked send entrances, and the `reset` / `restore` / `nudge` run kinds showing no stop control.

### §1.7 note

`stopGeneration()` keeps its name and gains a widened return type (`void` → `Promise<void>`) plus an optional argument. Nothing is removed and `() => Promise<void>` stays assignable to `() => void`, so existing call sites (`onClick={stopGeneration}`) keep compiling — there is no removed surface to mark `@deprecated`. The behavioral change (asynchronous, can reject) is carried by JSDoc + both READMEs per R12. If review judges this insufficient, the fallback is a `@deprecated abortConnection()` escape hatch exposing the old local-abort-only semantics.

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [ ] T1 (R8): Add `RunKind` / `StopPhase` / `RunStatus` + `ChannelBusyError` to `packages/core/src/types/`; add `runStatus` to `ChannelStates`; export from the core entry.
- [ ] T2 (R1, R6): Add `suspendChannel()` to `AsgardServiceClient` + optional member on `IAsgardServiceClient`; endpoint derivation, `custom_channel_id` / `request_id` / `force` query, 2xx-and-404 success, `HttpError` otherwise.
- [ ] T3 (R1, R2, R4, R6, R7, R8): Rewrite `Channel.stopGeneration()` as the async suspend + wait-for-terminal lifecycle; add the `runStatus$` store + snapshot; thread `RunKind` through `fetchSse` / `rejoinChannel` / `nudge` / `resetChannel` / `replyToolCallConsents`; capture `requestId`; add the `sendMessage` busy guard; arm/clear the 10 s force timer (including in `close()`).
- [ ] T4 (R2, R10): Make the deliberate-abort path explicit in `create-sse-observable.ts`; clear run status on every terminal in `buildRunHandlers`.
- [ ] T5 (R9): Consume `metadata.runState` in `use-channel.ts`'s join-init gate so a non-`RUNNING` channel replays and settles straight into "waiting for input".
- [ ] T6 (R3, R4, R5, R7, R8): React state surface — `use-channel` async `stopGeneration` + `runStatus`; `asgard-service-context` exposing `runStatus` / `canStop` / `isStopping`.
- [ ] T7 (R3, R5, R11): `chat-composer.tsx` stop / stopping / force-stop tri-state + send-entrance gating; `quick-replies.tsx` gating; new i18n keys in en-US / ja-JP / zh-TW.
- [ ] T8 (R1, R2, R4, R6, R7, R8, R10): Core Vitest — suspend endpoint shape, 2xx/404/failure branches, stopping→terminal release, force-stop after timeout, `ChannelBusyError`, non-user run kinds not calling suspend, deliberate abort not reconnecting.
- [ ] T9 (R12): JSDoc on `Channel.stopGeneration` + `UseChannelReturn['stopGeneration']`; stop-generation sections in `packages/core/README.md` and `packages/react/README.md`.
- [ ] T10-1: Run `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react` + `npm run test:packages`.
- [ ] T10 (R13): Add the `/stop-generation` react-demo route; walk through R1–R11 in the browser via Playwright MCP; screenshots to `.github/screenshots/`.

---

## Coverage

Use Cases: R1–R13 (F-023 AC1–AC12; UC-044 停止前的確認與逾時強制停止, UC-045 停止後不可送出新訊息, UC-046 重新進房反映 run 已停止)

Files:

**`packages/core`**

- `src/types/channel.ts` — new `RunKind` / `StopPhase` / `RunStatus` / `StopGenerationOptions`; `ChannelStates.runStatus`; `ChannelConfig.runState`
- `src/types/channel-busy-error.ts` — **new**; `ChannelBusyError` + `isChannelBusyError`
- `src/types/client.ts` — optional `suspendChannel()` on `IAsgardServiceClient`
- `src/types/index.ts`, `src/index.ts` — export the new error from the package entry
- `src/lib/client.ts` — `suspendChannel()` + `deriveSuspendEndpoint()`; renamed `sandboxFsHeaders()` → `apiHeaders()`
- `src/lib/channel.ts` — async `stopGeneration()`, `runStatus$` store + `getRunStatus()`, run-kind threading, `requestId` capture, `sendMessage` busy guard, force-stop timer, `abortConnection()` fallback
- `src/lib/create-sse-observable.ts` — explicit `disposed` flag so a deliberate abort never reconnects
- `src/lib/stop-generation.spec.ts` — **new**, 21 cases
- `src/lib/create-sse-observable.spec.ts` — **new**, 3 cases (AC10)
- `README.md` — "Stopping generation" section + `suspendChannel` / `runStatus$` / `stopGeneration` entries

**`packages/react`**

- `src/hooks/use-channel.ts` — async `stopGeneration`, `runStatus` state, `runState` seed through the restore path
- `src/context/asgard-service-context.tsx` — `runStatus` + derived `isRunning` / `canStop` / `isStopping` / `canForceStop`
- `src/components/chatbot/chatbot-footer/chat-composer.tsx` — stop / stopping / force-stop tri-state, send + Enter gating
- `src/components/chatbot/chatbot-footer/chatbot-footer.tsx` — `RunningIndicator` bound to `isRunning` (AC9)
- `src/components/templates/quick-replies/quick-replies.tsx` — gated on `isStopping`
- `src/i18n.ts` — `composer.stopping` / `composer.forceStop` in en-US / ja-JP / zh-TW
- `README.md` — "Stopping generation" section + context table entries

**`apps/react-demo`**

- `src/mock-server/sse-mock.ts` — `handleMockSuspend` + `handleStopGenerationMock` (accepted / failing / timeout channels)
- `vite.config.ts` — `/mock-asgard/message/suspend` middleware
- `src/app/routes/stop-generation/{stop-generation.tsx,stop-generation.module.scss,index.ts}` — **new** route, 5 scenarios
- `src/app/app.tsx` — route registration

---

## Execution Log / Change Log

- 2026-07-28: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/34 (Status: `draft`).
- 2026-07-28: Plan confirmed by the user; full AC1–AC12 scope (Status: `draft → ready`).
- 2026-07-28: Implementation started on `feat/34-stop-generation-suspend-run` (Status: `ready → in-progress`).
- 2026-07-28: Paused mid-build to fix two unrelated blockers on `main` — the Nx project graph dying on the `references/` submodules (PR #362) and the absence of any type-check gate (PR #363). Both merged; this branch was rebased onto them.
- 2026-07-28: T9 (READMEs) + T10 (`/stop-generation` demo route, mock suspend endpoint) complete. Browser walkthrough via Playwright: **15/15 checks pass** across R1–R11; screenshots in `.github/screenshots/f023-*.png`. core Vitest 150/150 (+24). lint / format / typecheck / build all green (Status: `in-progress → done`).
