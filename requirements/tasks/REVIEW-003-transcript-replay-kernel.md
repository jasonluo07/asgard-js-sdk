# REVIEW-003 Transcript Replay Kernel + message.user

## Meta

- Task ID: `REVIEW-003`
- Status: `done`
- BUILD Task: `BUILD-003`
- Reviewed commit: working tree on `f9100cb` (F-014 delta, pre-commit)
- Reviewed branch: `feat/f-014-transcript-replay-kernel`

---

## §1 Static Code Review

Scope: BUILD-003 `## Coverage` files (F-014 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                 | Result | Note                                                                                                           |
| ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                        | ✅     | grep clean across all F-014 files                                                                              |
| No `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | ✅     | grep clean                                                                                                     |
| No new `eslint-disable`                              | ✅     | only pre-existing hits in `client.ts` (file-upload / cwd-download, lines 55/270-326) — not in the F-014 delta  |
| Explicit return types (new public / exported fns)    | ✅     | `rejoinSse(): void`, `runSse(): void`, `onMessageUser(): Conversation`, `createSseObservable(): Observable<…>` |
| Clean teardown (§1.5)                                | ✅     | GET replay reuses `runSse` → `takeUntil(this.destroy$)` + the same `AbortController` (`signal`) as POST        |
| `@asgard-js/core` framework-agnostic (§1.6)          | ✅     | no react/DOM import; `time: new Date()` follows the established reducer convention (6 existing handlers)       |
| Replay-safe (§1.6 / R6)                              | ✅     | dedup keyed on `messageId` / `customMessageId`, never on arrival time; `time` is display-only, not ordering    |
| Additive-only (§1.7)                                 | ✅     | `method?` / `payload?` optional, new enum members, new `rejoinSse`; POST path unchanged                        |
| New public API exported from entry (§2.2)            | ✅     | `MessageUserEventData` via `types` barrel; `rejoinSse` on `AsgardServiceClient` + `IAsgardServiceClient`       |

### §1.2 Grep (F-014 scope)

```
[any]            (none)
[ts-ignore]      (none)
[eslint-disable] (none in F-014 delta — pre-existing upload/download code only)
[console.]       (none in F-014 delta)
[setTimeout]     (none in F-014 delta — pre-existing keep-connection detach timer only)
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean.
- `npx tsc --noEmit -p packages/react/tsconfig.lib.json` → TS6305 only ("output file has not been built from source"): a composite / project-reference build-ordering artifact from react's `include` of core sources, **not a code type error**. Authoritative type check is the vite dts build (`npm run build:react`) → green.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects` (the "Nx Cloud problems" line is cloud connectivity, not a lint failure).
- `npm run build:core && npm run build:react` → both green. (Fixed a latent dts error first: test-fixture helper return types widened to `SseResponse<EventType>`.)

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

R2/R5 via core Vitest (`conversation.spec.ts`, 9/9 green); R1/R3/R4/R6/R7 via the scoped GET-replay demo route `/transcript-replay` (Playwright MCP), network + console captured.

### R# Result Matrix

| R#  | Description                                                      | Result | Note                                                                                                                                     |
| --- | ---------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | EventType adds message.user + channel.title.update; unknown skip | Pass   | enum has both; `onMessage` `default: return this` preserved (safe skip); build + Vitest green                                            |
| R2  | message.user → ConversationUserMessage (all fields)              | Pass   | Vitest "assembles message.user … with all fields" (text/customMessageId/identityHint/blobIds)                                            |
| R3  | client fires GET cold-start replay (empty Last-Event-ID)         | Pass   | Network: `GET /mock-asgard/message/sse?custom_channel_id=existing-transcript-demo → 200` (both button clicks)                            |
| R4  | replay of completes + message.user assembles (reuses F-011)      | Pass   | Vitest "replay of message.user + a self-sufficient message.complete assembles both"; browser assembles 2 user + 2 bot collapsed frames   |
| R5  | optimistic vs rejoin message.user de-duped by id                 | Pass   | Vitest "dedup … by customMessageId is skipped"; browser: optimistic bubble (`c-opt-1`) kept, first user turn shows once (not duplicated) |
| R6  | replay (GET) consistent with live (POST); replay-safe            | Pass   | same reducer (`onMessage`) + same `runSse` transport; cold shows backend text, optimistic-dedup preserves the bubble — both correct      |
| R7  | (browser smoke) transcript replay assembled, no dup              | Pass   | `/transcript-replay` both flows verified, 0 console errors; screenshots `.github/screenshots/f-014/transcript-replay-{cold,dedup}.png`   |

**§3 result: PASS — all R1–R7 Pass, zero BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

None.

---

## Execution Log

- 2026-07-14: REVIEW task created, paired with BUILD-003 (Status: `draft`).
- 2026-07-14: §1 Static Code Review — checklist all ✅, grep clean, core tsc clean, lint:packages green, build:core+react green. §3 Functional Validation — R1–R7 all Pass (Vitest 9/9 + Playwright browser verify of `/transcript-replay`, network + console captured, 2 screenshots). Zero BLOCKERs. Status: `draft → done`.
