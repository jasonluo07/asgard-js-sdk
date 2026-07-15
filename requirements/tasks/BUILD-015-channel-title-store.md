# BUILD-015 Channel Title Store (dynamic title + title.update event)

## Meta

- Task ID: `BUILD-015`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/16`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-016-channel-title-動態狀態與-title-update-事件.md` (+ `use-cases/UC-027` seed + live update). Pure data-layer — display UI is F-017.
- Complexity: `M`

---

## Brief

Make the channel title a **dynamic SDK state**. The backend stores `entity.Channel.Title`, returns it from `GET /channel/metadata`, and pushes `asgard.channel.title.update` (wire: `fact.channelTitleUpdate.title`) on the live plane when the topic becomes clear / drifts. asgard-js-sdk today only has a static `title` prop; this ticket adds the reactive state.

**The replay-safety property (critical):** `asgard.channel.title.update` is **ephemeral — live plane only, never persisted**, so a rejoin's history replay does **not** contain it. Therefore the title's initial value can only come from the `GET /channel/metadata` seed (at join time, wired by F-015); after that, live events update it. The title must never be cleared just because a replay lacks the event.

**Design consequence:** the title lives on the **`Channel`** (a `channelTitle$` `BehaviorSubject`, seeded once from config, updated by the live `title.update` event), **not** derived from the conversation — the conversation is rebuilt from replayed events on rejoin and would lose an ephemeral title. This differs from F-013's `tasks$` / `subagents$` (which _are_ conversation-derived), but reuses the same store shape (Observable + `distinctUntilChanged` + snapshot + `ChannelStates` slot).

**Scope this cycle (F-016):** the `channelTitle$` store + the `title.update` consumer + the seed **mechanism** (`ChannelConfig.channelTitle`) + the React `useChannelTitle` adapter. **Not this cycle:** the actual `GET /channel/metadata` → seed wiring (that is F-015's join orchestration — F-016 provides the seed slot it will fill); the header display UI + custom renderer + hide (F-017, prototype-first).

**Already exists:** the `CHANNEL_TITLE_UPDATE = 'asgard.channel.title.update'` enum (F-014); `conversation.onMessage`'s `default: return this` (so a title event is a conversation no-op); F-013's store pattern (`createDerivedStores`, `distinctUntilChanged`, `ChannelStates` slices, `useSyncExternalStore` hooks). No `channelTitleUpdate` Fact type, no title store yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — the title fact is typed `{ title: string \| null }`                                              |
| §1.5 | `channelTitle$` completed in `Channel.close()`                                                              |
| §1.6 | core stays framework-agnostic — the store is RxJS; the React hook lives in `@asgard-js/react`               |
| §1.7 | Additive only — new event data + Fact key, `ChannelStates.channelTitle`, `ChannelConfig.channelTitle` seed  |
| §2.3 | SSE Fact type added before the Channel / react read it                                                      |
| §3.3 | RxJS: `channelTitle$` via `BehaviorSubject` + `distinctUntilChanged`; `Observable<string \| null>`          |
| §7   | Replay-safe: the title is seeded + live-updated, never derived from replayed events; replay never clears it |

---

## Acceptance Criteria

- `R1` (Event type) `sse-response.ts` gains `ChannelTitleUpdateEventData { title: string | null }` + `Fact.channelTitleUpdate`. → T1
- `R2` (Consume) the `Channel` consumes `asgard.channel.title.update` (`fact.channelTitleUpdate.title`) → pushes the new title into `channelTitle$`. → T3
- `R3` (Slice store) `Channel` exposes `channelTitle$` (`BehaviorSubject` + `distinctUntilChanged`) + `getChannelTitle()`; `ChannelStates` gains `channelTitle: string | null`; framework-agnostic (Observable, no React). → T2, T3
- `R4` (Seed mechanism) `ChannelConfig.channelTitle` seeds the initial value (`null` = unnamed); the F-015 metadata wiring fills it later. → T2, T3
- `R5` (Replay-safe) a run / rejoin whose stream lacks a `title.update` keeps the seeded (or last live) title — the title is never cleared by a replay missing the event. → T4
- `R6` (React adapter) `useChannelTitle(channel)` via `useSyncExternalStore`; `channelTitle` bridged through `use-channel` states → the service context, so in-chatbot consumers (F-017) read it without a high-frequency re-render. → T5
- `R7` (Smoke) build green; core Vitest (a mock client drives a `title.update` → `channelTitle$` updates; `distinctUntilChanged` suppresses a same-title event; the config seed is the initial snapshot; a stream with no title event keeps the seed); a scoped `/channel-title` demo rendering the title **outside** the Chatbot via the hook with simulate-update + seed controls; screenshot to `.github/screenshots/f-016/`. → T4, T6

---

## Implementation Tasks

- [x] T1 (R1): core `sse-response.ts` — `ChannelTitleUpdateEventData { title: string | null }` + `Fact.channelTitleUpdate`.
- [x] T2 (R3, R4): core `types/channel.ts` — `ChannelStates.channelTitle: string | null`; `ChannelConfig.channelTitle?: string | null` (seed).
- [x] T3 (R2, R3, R4): core `channel.ts` — `channelTitleSubject` `BehaviorSubject` seeded from `config.channelTitle ?? null`; in `fetchSse` `onSseMessage`, on `CHANNEL_TITLE_UPDATE` push `fact.channelTitleUpdate.title`; public `channelTitle$` (Observable via `distinctUntilChanged`) + `getChannelTitle()` + `setChannelTitle()`; included in the states `combineLatest`; completed in `close()`.
- [x] T4 (R5, R7): core Vitest `channel.spec.ts` (7 tests) — a minimal mock `IAsgardServiceClient` replays scripted events; `title.update` updates the store; a same-title event does not re-emit (emissions `[null,'X','Y']`); the config seed is the initial value; a message-only stream keeps the seed; `setChannelTitle`; the `channelTitle` reaches `statesObserver`. **63/63 core tests pass**.
- [x] T5 (R6): react `hooks/use-derived-state.ts` — `useChannelTitle(channel)` via `useSyncExternalStore` (null channel → stable `null`); exported. Bridged `channelTitle` through `use-channel.ts` (`statesObserver` → state → `UseChannelReturn`, seed via `channelTitle` prop) → service context value + interface + default; provider accepts a `channelTitle` seed prop (defaults `null`; F-015 fills from metadata).
- [x] T6 (R7): scoped `/channel-title` route — the title rendered **outside** the Chatbot via `useChannelTitle` (channel stub) + render-count badge. Browser-verified: null→ 訂單查詢(×2)→ 庫存分析(×3)→**同名 title.update stays ×3**→ 清空(×4). Screenshot `.github/screenshots/f-016/channel-title.png`.
- [x] T7: `npm run lint:packages` ✅ + `npm run format:check` ✅ + `npm run build:core && npm run build:react` ✅.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5 (core Vitest `channel.spec.ts`), R6 (`/channel-title` demo), R7 (build + Vitest + browser smoke)
Files:

- `packages/core/src/types/sse-response.ts` (core) — `ChannelTitleUpdateEventData` + `Fact.channelTitleUpdate`
- `packages/core/src/types/channel.ts` (core) — `ChannelStates.channelTitle` + `ChannelConfig.channelTitle`
- `packages/core/src/lib/channel.ts` (core) — `channelTitle$` store + consume event + accessors + states wiring + teardown
- `packages/core/src/lib/channel.spec.ts` (core) — 7 new tests (mock client)
- `packages/react/src/hooks/use-derived-state.ts` (react) — `useChannelTitle`
- `packages/react/src/hooks/use-channel.ts` (react) — bridge `channelTitle` + seed prop
- `packages/react/src/context/asgard-service-context.tsx` (react) — expose `channelTitle` + seed prop
- `apps/react-demo/src/app/routes/channel-title/*` (demo) — scoped route
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` (demo) — registration

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/16 (F-016 + UC-027; pure data-layer, UI is F-017) (Status: `draft`).
- 2026-07-15: Implemented T1–T7. Core: `ChannelTitleUpdateEventData` + Fact; `Channel` gains `channelTitle$` (BehaviorSubject seeded from `config.channelTitle`, piped `distinctUntilChanged`) + `getChannelTitle()`/`setChannelTitle()`, consumes `CHANNEL_TITLE_UPDATE` in `onSseMessage`, wired into the states `combineLatest`, completed in `close()`; `ChannelStates.channelTitle` + `ChannelConfig.channelTitle`. React: `useChannelTitle` hook; `channelTitle` bridged through use-channel + service context (+ seed prop for F-015). Title lives on the Channel (not conversation-derived) → replay-safe. Core Vitest 63/63 (7 new channel, first channel.spec with a mock client). `/channel-title` demo browser-verified (same-title event doesn't re-render). lint + format + build green (Status: `done`).
