# BUILD-017 Join-Init Orchestration + metadata-gated autoResetChannel

## Meta

- Task ID: `BUILD-017`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/15`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-015-進房初始化編排與-autoresetchannel-metadata-gated-改版.md`
- Complexity: `L`

---

## Brief

Rewrite the chatbot join-init lifecycle so mounting into an **existing** channel no longer wipes its history. Today `use-channel.ts` mount effect unconditionally sends `RESET_CHANNEL` whenever `autoResetChannel !== false` (default) — for an existing channel this is delete-then-ensure = data loss. F-015 gates init on `GET /channel/metadata`: **exists → always restore** (seed title from `metadata.title`, replay history via F-014's `rejoinSse`, hold input until a terminal), **404 → per `autoResetChannel`** (`true` → `RESET_CHANNEL` opening; `false` → empty, first send `action=NONE`). `autoResetChannel` semantics change from "unconditional mount reset" to "reset only when the channel does not exist" (breaking behavior; default still `true`). The heavy logic lands in **core** (a new `client.channelMetadata()` and a `Channel.restore()` static) so it is covered by core Vitest; the react hook keeps only the thin 3-way branch.

**Already exists:** `packages/core/src/lib/client.ts` (`rejoinSse` F-014 GET replay — currently unused; `uploadFile` non-SSE fetch pattern); `packages/core/src/lib/channel.ts` (`Channel.create`/`Channel.reset` statics, `channelTitleSubject` + `setChannelTitle` F-016, `isConnecting` gating); `packages/react/src/hooks/use-channel.ts` (`resetChannel`/`initChannel`/mount effect `:277-287`); `packages/core/src/types/channel.ts` (`ChannelConfig.channelTitle` seed). New channel-metadata endpoint is distinct from the existing bot-provider `/metadata` fetch in `packages/react/src/models/bot-provider.ts`.

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                                  |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                             |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                       |
| §1.4 | No hardcoded API key / endpoint / namespace — pass via `config`                                                              |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)               |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`)    |
| §1.7 | No breaking public-API change without `@deprecated` transition (see Note on `autoResetChannel` — behavior change, prop kept) |
| §2.2 | New public types / functions / methods exported from the package entry with explicit `export type`                           |
| §2.4 | Use `botProviderEndpoint`, not the deprecated `endpoint`                                                                     |
| §3.1 | Exported functions / methods declare explicit return types                                                                   |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                          |
| §4.1 | React component / hook props fully typed (no `any`)                                                                          |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                        |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                      |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                             |

---

## Acceptance Criteria

EARS form. Each criterion maps to one or more Implementation Tasks (→ T#).

- `R1` When the chatbot mounts with a `customChannelId` and a live `client`, the system shall call `GET /channel/metadata?custom_channel_id=…` before creating any run, and treat HTTP `404` as "channel does not exist". → T1, T2, T4
- `R2` When channel metadata returns `200` (exists), the system shall **restore and never send `RESET_CHANNEL`**: seed the channel title from `metadata.title` (F-016) and replay collapsed history via `rejoinSse` (F-014). This is the data-loss fix — an existing channel's history/title/session are preserved on join. → T1, T3, T4
- `R3` When channel metadata is `404` and `autoResetChannel` is not `false` (default), the system shall open the channel via the existing `RESET_CHANNEL` path (UC-025). → T4
- `R4` When channel metadata is `404` and `autoResetChannel === false`, the system shall issue no request and stay in an empty, input-enabled state; the first user send shall use the normal `action=NONE` path (UC-026). → T4
- `R5` While restoring, the system shall keep input disabled by holding `isConnecting` (F-003) until a terminal (`run.done` / `run.error`) arrives, then release; an IDLE channel releases immediately via the backend's synthesized terminal. → T3, T4
- `R6` When `GET /channel/metadata` fails with a non-`404` error (network / 5xx), the system shall fall back **without wiping history and without hanging** — it shall not auto-`RESET_CHANNEL` on an indeterminate result; it shall settle in an input-enabled empty state and surface the error via `onSseError`. → T2, T4
- `R7` `initMessages` shall remain supported for **preview / offline (`!client`)** static rendering and shall **not** seed the live restore path (server transcript is the single source). Full removal is out of scope (TASK-001). → T5
- `R8` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, the core Vitest suite for `channelMetadata` (200 / 404 / 5xx) and `Channel.restore` (title seeded, history replayed, `isConnecting` released on terminal, no `RESET_CHANNEL`) passes, and a react-demo mock-client route demonstrates all three branches (restore / reset / empty), the system shall behave per R1–R7 with no build errors. → T6, T7, T8, T9

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [ ] T1 (R1, R2): Add `ChannelMetadata` (`{ title: string | null; runState: ChannelRunState; lastActivityAt?: string }`) + `ChannelRunState` (`'RUNNING' | 'IDLE'`) to `packages/core/src/types/`; export from the core entry.
- [ ] T2 (R1, R6): Implement `client.channelMetadata(customChannelId): Promise<ChannelMetadata | null>` in `packages/core/src/lib/client.ts` — `GET {base}/channel/metadata?custom_channel_id=…` (derive `{base}` by stripping `/message/sse`; reuse `uploadFile`'s apiKey/customHeaders pattern); `200` → parse, `404` → `null`, other → throw. Add to `IAsgardServiceClient` (optional, like `rejoinSse`).
- [ ] T3 (R2, R5): Add `Channel.restore(config)` static in `packages/core/src/lib/channel.ts` (parallel to `reset`) — seed title via `config.channelTitle`, start `client.rejoinSse(customChannelId, …)`, hold `isConnecting` until terminal then release; clean teardown. Wire the same `statesObserver`/onSse callbacks shape as `reset`.
- [ ] T4 (R1–R6): Rewrite the `use-channel.ts` mount effect into a **cancellation-safe async gate**: call `client.channelMetadata` → exists → `restoreChannel()` (new callback over `Channel.restore`, seeds title from `metadata.title`); `404` → `autoResetChannel !== false ? resetChannel(resetPayload) : initChannel()`; non-404 error → `initChannel()` + `onSseError`. Guard against setState after unmount / React StrictMode double-invoke.
- [ ] T5 (R7): Keep the preview `initMessages` path intact; ensure the live restore path does not seed from `initMessages`. Document the scope boundary vs TASK-001 in a code comment.
- [ ] T6 (R8): Add core Vitest — `client.channelMetadata` (mock `fetch`: 200 → parsed, 404 → null, 500 → throws) and `Channel.restore` (mock client whose `rejoinSse` emits replay events + a terminal → assert title seeded, conversation replayed, `isConnecting` false at end, `fetchSse` never called).
- [ ] T7 (R8): Add a scoped react-demo route with a mock client (implements `channelMetadata` + `rejoinSse` + `fetchSse`) toggling exists / 404+autoReset / 404+noReset (+ a non-404 error case) to visually demonstrate restore vs reset vs empty. Do not touch other demo routes' mocks.
- [ ] T8: Run `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react`.
- [ ] T9 (R8): Smoke check — build, run core Vitest, walk the demo mock-client route through all branches; screenshot the restore (history + seeded title) and empty states to `.github/screenshots/f-015/`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6, R7, R8 (UC-024 restore / UC-025 auto-reset / UC-026 empty)
Files:

- `packages/core/src/types/channel.ts` (core) — `ChannelMetadata` + `ChannelRunState`
- `packages/core/src/types/client.ts` (core) — `IAsgardServiceClient.channelMetadata?`
- `packages/core/src/lib/client.ts` (core) — `channelMetadata()` + `deriveChannelMetadataEndpoint()`
- `packages/core/src/lib/channel.ts` (core) — `buildRunHandlers` extraction + `rejoinChannel()` + `Channel.restore()`
- `packages/core/src/lib/client.spec.ts` (core, new) — `channelMetadata` 200/404/5xx/network
- `packages/core/src/lib/channel.spec.ts` (core) — `Channel.restore` seed/replay/no-reset, isConnecting gate, no-rejoin
- `packages/react/src/hooks/use-channel.ts` (react) — `restoreChannel()` + metadata-gated mount effect
- `apps/react-demo/src/mock-server/sse-mock.ts` (demo) — `handleMockChannelMetadata` (404 default / 200 join-existing / 500 join-error)
- `apps/react-demo/vite.config.ts` (demo) — `/mock-asgard/channel/metadata` mount
- `apps/react-demo/src/app/app.tsx` (demo) — `/join-init` route
- `apps/react-demo/src/app/routes/join-init/{join-init.tsx,join-init.module.scss,index.ts}` (demo, new) — 4-scenario walkthrough

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/15 (Status: `draft`).
- 2026-07-15: Plan confirmed by user; implementation started (Status: `draft → ready → in-progress`).
- 2026-07-15: Implemented core (`channelMetadata` + `Channel.restore` + shared `buildRunHandlers`) and react metadata gate; 8 new core Vitest cases (71 total green); lint/format/build green.
- 2026-07-15: Smoke check — `/join-init` demo (mock-client) walked through all 4 branches; network trace confirms restore=GET-only (no RESET_CHANNEL), 404+autoReset=POST reset, 404+noReset=empty→first-send, 500=safe fallback. Screenshots in `.github/screenshots/f-015/` (Status: `in-progress → done` pending review).
