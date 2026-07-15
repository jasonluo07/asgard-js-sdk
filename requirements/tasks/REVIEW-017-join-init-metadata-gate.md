# REVIEW-017 Join-Init Orchestration + metadata-gated autoResetChannel

## Meta

- Task ID: `REVIEW-017`
- Status: `done`
- BUILD Task: `BUILD-017`
- Reviewed commit: `af36ebd` (base) + F-015 working tree on branch
- Reviewed branch: `feat/f-015-join-init-metadata-gate`

---

## §1 Static Code Review

Scanned BUILD-017 `## Coverage` files against `FRONTEND_RULE_COMMON.md`.

### §1.1 Checklist (applicable items — this is a TS SDK library + demo, not a Next.js app)

| Check item                                                                            | Rule        | Result                                                  |
| ------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| No `any` / `as any` (used `as unknown as X` in specs only)                            | §1.1        | ✅                                                      |
| No `@ts-ignore` / `eslint-disable` to bypass type/lint errors                         | §1.2        | ✅                                                      |
| No `console.log` in new library code (the one hit is pre-existing, `debugMode`-gated) | §1.3 / §7   | ✅                                                      |
| No hardcoded colors in `.ts`/`.tsx`                                                   | §1.3        | ✅                                                      |
| Core stays framework-agnostic; react imports core via public entry only               | §1.6        | ✅                                                      |
| Exported functions/methods have explicit return types                                 | §3.1        | ✅                                                      |
| New types centralized in `core/src/types/`, exported from entry                       | §2.2 / §3.2 | ✅                                                      |
| Breaking behavior (`autoResetChannel`) — prop kept, semantics documented              | §1.7        | ✅ (behavior change, recorded in decision + BUILD Note) |
| No `setTimeout` mock delay added; no TODO/FIXME; no dead code                         | §7          | ✅                                                      |

Non-applicable §1.1 rows (Next.js app patterns): `page.tsx` thinness, TanStack Query, RHF+Zod, Zustand, next-intl JSON, Tailwind grouping — N/A (SDK library, no such stack).

### §1.2 Mechanical Grep (scoped to Coverage.Files; `git diff` added-lines for residue)

```
as any (added):            (clean)
eslint-disable/@ts-ignore: (clean)
console.log (added):       (clean — use-channel.ts:323 is the pre-existing debugMode consent log, no `+console.log` in the F-015 diff)
setTimeout (added):        (clean — sleep() setTimeout is pre-existing mock infra; handleMockChannelMetadata adds none)
hardcoded colors (.ts/.tsx): (clean)
TODO/FIXME:                (clean)
```

### §1.3 TypeScript and Lint

```bash
npx tsc --noEmit        # → exit 0
npm run lint:packages   # (this repo's read-only lint; `lint:check` script does not exist here)
```

Results:

```
tsc:  PASS (exit 0, project-wide)
lint: PASS (NX Successfully ran target lint for 2 projects — @asgard-js/core + @asgard-js/react)
```

### §1.4 Static Review Acceptance

- [x] All applicable §1.1 items ✅
- [x] No ❌ violations
- [x] §1.2 greps run; outputs pasted (all clean)
- [x] `npx tsc --noEmit` — no errors
- [x] `npm run lint:packages` — no errors

No §1 BLOCKERs.

---

## §3 Functional Validation

Core logic covered by core Vitest (`client.spec.ts` + `channel.spec.ts` — 71/71 pass). The three react branches + the non-404 fallback exercised through the `/join-init` react-demo mock-client route (no live backend); each branch confirmed by the network trace and screenshots in `.github/screenshots/f-015/`.

Network trace (single walkthrough, request order):
`①` `GET metadata 200 → GET message/sse (replay)` — no POST · `②` `GET metadata 404 → POST message/sse (RESET_CHANNEL)` · `③` `GET metadata 404 → [no auto request] → POST (user first send)` · `④` `GET metadata 500 → [no request]`.

### R# Result Matrix

| R#  | Description                                                                  | Result | Note                                                                                                                                        |
| --- | ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Mount + `customChannelId` → `GET /channel/metadata`; 404 = not exists        | Pass   | All 4 scenarios issued the metadata GET; 404 detected for `join-new-*` (returns `null`).                                                    |
| R2  | Exists → restore (title seed + `rejoinSse` replay), never `RESET_CHANNEL`    | Pass   | ① title bar seeded `庫存分析（已存在的頻道）`, history replayed; network = GET-only, no reset POST. Core: `restore` never calls `fetchSse`. |
| R3  | 404 + `autoResetChannel` default → `RESET_CHANNEL` opening (UC-025)          | Pass   | ② 404 → POST reset → opening reply streamed.                                                                                                |
| R4  | 404 + `autoResetChannel=false` → empty, no request, first send `action=NONE` | Pass   | ③ empty + input enabled, zero auto request; first send (via `sendMessage`, action=NONE) streamed a reply.                                   |
| R5  | Restore holds `isConnecting` until terminal; IDLE releases immediately       | Pass   | Core Vitest: `isConnecting` true during replay → false on terminal. ① input released after replay `run.done`.                               |
| R6  | Non-404 metadata error → safe fallback (no wipe, no hang, surfaced)          | Pass   | ④ 500 → empty + input enabled, no reset POST after the failing GET; error surfaced. Core: 5xx throws `HttpError` (never `null`).            |
| R7  | `initMessages` preserved for preview/offline; not used in live restore       | Pass   | Restore uses an empty conversation (server replay is the source); preview `initMessages` path unchanged (all preview demos still render).   |
| R8  | (Smoke) build green; core Vitest passes; demo 3-branch walkthrough           | Pass   | `build:core`+`build:react` green; 71 Vitest pass; `/join-init` walked through all 4 branches.                                               |

### §3.1 Acceptance

- [x] All R# executed (core Vitest + browser mock-client walkthrough + network trace)
- [x] Each R# Pass
- [x] No e2e spec for `/join-init` (mock-client demo used instead — no live backend needed)
- [x] Loading (input-gated restore), error (500 fallback), and empty-state (no-reset) boundaries confirmed

No §3 BLOCKERs.

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- The `GET /channel/metadata` response shape is parsed defensively (`json.data ?? json`, with `title`/`runState`/`lastActivityAt`); the exact envelope should be confirmed against the real Edge Server once available (mock-verified here). Non-blocking — single point of change in `client.channelMetadata`.

---

## Execution Log

- 2026-07-15: REVIEW task created, paired with BUILD-017 (Status: `draft`).
- 2026-07-15: §1 Static review — all applicable checks ✅; `tsc` exit 0; `lint:packages` green (Status: `draft → in-progress`).
- 2026-07-15: §3 Functional — R1–R8 all Pass (core Vitest 71/71 + `/join-init` mock-client walkthrough + network trace). Zero BLOCKERs (Status: `in-progress → done`).
