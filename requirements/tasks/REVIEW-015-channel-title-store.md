# REVIEW-015 Channel Title Store

## Meta

- Task ID: `REVIEW-015`
- Status: `done`
- BUILD Task: `BUILD-015`
- Reviewed commit: working tree on `c66abc0` (F-016 delta, pre-commit)
- Reviewed branch: `feat/f-016-channel-title-store`

---

## §1 Static Code Review

Scope: BUILD-015 `## Coverage` files (F-016 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                                                                                                                                             |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean in library code; the demo store-stub uses `as unknown as Channel` (harness). **Fixed during review**: the mock client's `fetchSse` params were implicit `any` (TS7006) → typed `FetchSsePayload` / `FetchSseOptions?` |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | the one `eslint-disable` (use-channel:256) is **pre-existing** consent debug logging, not in the F-016 diff                                                                                                                      |
| No `console.*` (own code)                               | ✅     | grep clean                                                                                                                                                                                                                       |
| No `setTimeout` / `setInterval` residue (§7)            | ✅     | grep clean                                                                                                                                                                                                                       |
| `channelTitle$` completed on close (§1.5)               | ✅     | `channelTitleSubject.complete()` in `Channel.close()`                                                                                                                                                                            |
| core stays framework-agnostic (§1.6)                    | ✅     | `channel.ts` imports no react/react-dom; the store is RxJS; the hook lives in react                                                                                                                                              |
| Additive only (§1.7)                                    | ✅     | new event data + Fact key, `ChannelStates.channelTitle`, `ChannelConfig.channelTitle` seed — no breaking                                                                                                                         |
| SSE Fact type before use (§2.3)                         | ✅     | `ChannelTitleUpdateEventData` + `Fact.channelTitleUpdate` added before the Channel / react read them                                                                                                                             |
| RxJS store typed + distinctUntilChanged (§3.3)          | ✅     | `channelTitle$: Observable<string \| null>` = `BehaviorSubject.pipe(distinctUntilChanged())`                                                                                                                                     |
| Replay-safe (§7)                                        | ✅     | title lives on the Channel (seed + live event), not conversation-derived; a replay lacking the event keeps it                                                                                                                    |

### §1.2 Grep (F-016 scope)

```
[: any / as any / <any>]        (none in library; demo uses `as unknown as`; the spec-mock `fetchSse` params are now typed)
[@ts-ignore / eslint-disable]   1 hit → pre-existing consent debug log (not F-016)
[console.*]                     (none)
[core: from 'react' / react-dom](none)
[channelTitleSubject.complete]  present in Channel.close()
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean (after typing the mock-client `fetchSse` params).
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green.

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

R1–R5 via core Vitest (`channel.spec.ts` 7 new, first channel test with a mock client; **63/63 core tests pass**). R6/R7 via the scoped `/channel-title` route (Playwright MCP).

### R# Result Matrix

| R#  | Description                                   | Result | Note                                                                                                                                                                                                       |
| --- | --------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | ChannelTitleUpdateEventData + Fact            | Pass   | `{ title: string \| null }` + `Fact.channelTitleUpdate`; consumed type-safely in the Channel                                                                                                               |
| R2  | Channel consumes title.update → channelTitle$ | Pass   | Vitest: a scripted `title.update` sets `getChannelTitle()` / emits on `channelTitle$`                                                                                                                      |
| R3  | channelTitle$ slice store + ChannelStates     | Pass   | Vitest: late subscriber replays the snapshot; `distinctUntilChanged` suppresses a same-title event (emissions `[null,'X','Y']`); `states.channelTitle` set                                                 |
| R4  | ChannelConfig.channelTitle seed mechanism     | Pass   | Vitest: config seed is the initial snapshot; `setChannelTitle()` overrides (for the F-015 metadata restore)                                                                                                |
| R5  | replay-safe: no title event keeps the seed    | Pass   | Vitest: a message-only stream keeps the seeded title (title is not conversation-derived)                                                                                                                   |
| R6  | useChannelTitle + context bridge              | Pass   | DOM: the title renders **outside** the Chatbot via `useChannelTitle`; a same-title event does not re-render (badge stays ×3). `channelTitle` on the context                                                |
| R7  | (build + Vitest + browser smoke)              | Pass   | build:core + build:react green; core Vitest 63/63; `/channel-title` 0 console errors; badge null→ 訂單查詢(×2)→ 庫存分析(×3)→ 同名(×3)→ 清空(×4); screenshot `.github/screenshots/f-016/channel-title.png` |

**§3 result: PASS — zero BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- Fixed during review: the `channel.spec.ts` mock client's `fetchSse` parameters were implicit `any` (caught by `tsc`, not by Vitest which strips types) → typed with `FetchSsePayload` / `FetchSseOptions`.
- The `/channel-title` demo casts a store-shaped object `as unknown as Channel` to feed the real `useChannelTitle` hook without a live SSE connection — an intentional demo harness (not library code).
- The F-015 `GET /channel/metadata` → seed wiring is out of scope (F-016 provides the `ChannelConfig.channelTitle` / provider `channelTitle` seed slot it will fill).

---

## Execution Log

- 2026-07-15: REVIEW task created, paired with BUILD-015 (Status: `draft`).
- 2026-07-15: §1 static — all checklist ✅ after typing the mock-client params (tsc caught an implicit `any`); the lone eslint-disable is pre-existing; lint/build green. §3 functional — R1–R7 all Pass (Vitest 63/63 + `/channel-title` same-title-no-rerender + screenshot). Zero BLOCKERs (Status: `done`).
