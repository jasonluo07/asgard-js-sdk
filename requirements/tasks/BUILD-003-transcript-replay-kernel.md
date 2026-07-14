# BUILD-003 Transcript Replay Kernel + message.user

## Meta

- Task ID: `BUILD-003`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/14`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-014-transcript-冷啟動重播內核與-message-user-事件.md` (+ `use-cases/UC-023`; decision `docs/decisions/2026-07-13-transcript-first-class-init-lifecycle.md`)
- Complexity: `L`

---

## Brief

Give `@asgard-js/core` the data kernel for asgard-core's **transcript cold-start replay**: when a channel exists, a `GET /message/sse` (empty `Last-Event-ID`) replays the collapsed history (user + assistant) as **self-sufficient `*.complete` frames + a new `asgard.message.user` event**, with no `start`/`delta`. This is the **Phase 0 prerequisite** for F-015. The reducer reuses F-011 (complete-self-sufficient, idempotent, order-independent) for the assistant completes, adds a `message.user` branch for the user side, and the GET transport builds on F-002's un-suppressed native `Last-Event-ID`. **Key invariant:** `message.user` is persist-only on the backend (never echoed on a live POST), so the optimistically-rendered user bubble and a later rejoin `message.user` must be de-duplicated by id.

**Scope this cycle:** the replay _kernel_ — the events, the `message.user` assembly + dedup, and the ability to fire a GET cold-start replay that assembles into the conversation (UC-023). **Not this cycle:** wiring it into channel-open lifecycle / `autoResetChannel` (that is F-015).

**Already exists:** `packages/core/src/constants/enum.ts` (`EventType`, 14 events), `packages/core/src/types/sse-response.ts` (`Fact` / `MessageEventData`), `packages/core/src/lib/conversation.ts` (`ConversationUserMessage` type + F-011 complete assembly + `default: return this` safe-skip), `packages/core/src/lib/create-sse-observable.ts` / `client.ts` (POST SSE + F-002 native Last-Event-ID). No `message.user`, no GET replay yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any`                                                                                        |
| §1.5 | Clean teardown — the GET replay stream aborts on unsubscribe like the POST one                             |
| §1.6 | `@asgard-js/core` stays framework-agnostic; no time-derived values (replay-safe, AGENTS #5)                |
| §1.7 | Additive only — new enum members / event types / an optional GET path; no breaking change to existing POST |
| §2.2 | Export new public types (`message.user` data, any new client method) from the package entry                |
| §2.3 | `EventType` + payload type exist before the reducer branch                                                 |
| §3.1 | Explicit return types                                                                                      |
| §3.2 | Reuse `ConversationUserMessage`; do not duplicate the user-message shape                                   |
| §6   | Reuse F-011 complete assembly + F-002 transport; don't fork a second SSE path                              |
| §7   | No `setTimeout` mock delays in library code (demo mock may stage the replay)                               |

---

## Acceptance Criteria

- `R1` `EventType` gains `MESSAGE_USER` (`asgard.message.user`, consumed here) and `CHANNEL_TITLE_UPDATE` (`asgard.channel.title.update`, reserved for F-016); unknown events are still safely skipped (existing `default`). → T1
- `R2` A `message.user` event (`messageId`, `text`, `blobIds`, `customMessageId`, `identityHint`) assembles into a `ConversationUserMessage` with all fields. → T1, T2
- `R3` The client can initiate a `GET /message/sse?custom_channel_id=…` cold-start replay (empty `Last-Event-ID`); the transport reuses F-002's native `Last-Event-ID` (each replayed event carries `id:` as the cursor). → T3
- `R4` A replay of self-sufficient `*.complete` (`message` / `thinking` / `tool_call`) + `message.user` — no `start`/`delta` — assembles correctly (reuses F-011: complete self-sufficient, idempotent, order-independent). → T2, T4
- `R5` An optimistically-sent user message and a later rejoin `message.user` with the same `messageId` / `customMessageId` do **not** duplicate (dedup by id). → T2, T5
- `R6` Replay (GET) and live (POST) render consistently — replay-safe: no value derived from event arrival time. → T4
- `R7` (Smoke) build green; core Vitest for `message.user` assembly + dedup + replay-of-completes; a react-demo route whose scoped mock serves a `GET` transcript replay (message.user + completes) shows the history assembled with no dup; screenshot/GIF to `.github/screenshots/`. → T5, T6

---

## Implementation Tasks

- [x] T1 (R1, R2): `enum.ts` — add `MESSAGE_USER` + `CHANNEL_TITLE_UPDATE`; `sse-response.ts` — `MessageUserEventData` (`messageId`/`text`/`blobIds?`/`customMessageId?`/`identityHint?`) + `Fact` entries.
- [x] T2 (R2, R4, R5): `conversation.ts` — `onMessage` `MESSAGE_USER` branch → `ConversationUserMessage`; de-dup against an existing user message with the same `messageId` / `customMessageId` (optimistic bubble). Assistant completes reuse F-011.
- [x] T3 (R3): `create-sse-observable.ts` / `client.ts` — GET support (method option / a `rejoinSse` entry that issues `GET /message/sse?custom_channel_id=…` with empty body, sharing the F-002 Last-Event-ID transport + teardown); export from the package entry.
- [x] T4 (R4, R6): confirm the replayed completes assemble via the F-011 path; no time-derived values; GET vs POST consistent.
- [x] T5 (R2, R5, R7): core Vitest — `message.user` assembly, dedup (optimistic vs replay), and a full collapsed-replay sequence.
- [x] T6 (R7): react-demo scoped route + mock `GET /message/sse` transcript replay; browser-verify the assembled history + dedup; screenshot.
- [x] T7: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6, R7 (UC-023 transcript cold-start replay)
Files:

- `packages/core/src/constants/enum.ts` — `MESSAGE_USER` (`asgard.message.user`) + `CHANNEL_TITLE_UPDATE` (reserved F-016)
- `packages/core/src/types/sse-response.ts` — `MessageUserEventData` + `Fact.messageUser`
- `packages/core/src/types/channel.ts` — `ConversationUserMessage` gains `customMessageId?` / `identityHint?`
- `packages/core/src/lib/conversation.ts` — `onMessage` `MESSAGE_USER` branch + `onMessageUser` (dedup by `messageId` / `customMessageId`)
- `packages/core/src/lib/create-sse-observable.ts` — `method?: 'GET' | 'POST'` option; preserve endpoint query on the URL; GET sends no body
- `packages/core/src/lib/client.ts` — extracted private `runSse`; new `rejoinSse(customChannelId, options)` GET cold-start replay
- `packages/core/src/types/client.ts` — `rejoinSse?` on `IAsgardServiceClient`
- `packages/core/src/lib/conversation.spec.ts` — F-014 tests (message.user assembly all-fields, cold-rejoin add, dedup by customMessageId, replay message.user + complete)
- `apps/react-demo/src/mock-server/sse-mock.ts` — scoped GET transcript-replay handler (`existing-transcript-demo`): replays 2 user + 2 bot collapsed frames, each with `id:` cursor, no start/delta
- `apps/react-demo/src/app/routes/transcript-replay/{transcript-replay.tsx,transcript-replay.module.scss,index.ts}` — scoped demo route driving `client.rejoinSse()`
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — register the `/transcript-replay` route + nav link

---

## Execution Log / Change Log

- 2026-07-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/14 (F-014 + UC-023) (Status: `draft`).
- 2026-07-14: Implemented T1–T7. Core Vitest 9/9 green (5 F-011 + 4 F-014). Fixed a latent dts type error (test-fixture helper return types narrowed to `SseResponse<MessageEventType>` / `SseResponse<EventType.MESSAGE_USER>` — not assignable to `onMessage(SseResponse<EventType>)`; widened both to `SseResponse<EventType>`). Browser-verified `/transcript-replay`: cold GET rejoin assembles 4 collapsed frames; optimistic-bubble rejoin dedups the first user turn (shows once) — network confirms real `GET /message/sse?custom_channel_id=existing-transcript-demo → 200`, 0 console errors. Screenshots: `.github/screenshots/f-014/transcript-replay-{cold,dedup}.png`. `lint:packages` + `build:core`/`build:react` green; own-file `format:check` clean. (Status: `in-progress → done`).
