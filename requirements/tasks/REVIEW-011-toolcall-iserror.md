# REVIEW-011 Tool-Call Failure Detection via Backend isError

## Meta

- Task ID: `REVIEW-011`
- Status: `done`
- BUILD Task: `BUILD-011`
- Reviewed commit: working tree on `a3233d3` (F-009 delta, pre-commit)
- Reviewed branch: `feat/f-009-toolcall-iserror`

---

## §1 Static Code Review

Scope: BUILD-011 `## Coverage` files (F-009 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                          |
| ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean; spec fixtures use the established `as unknown as SseResponse<EventType>` cast (F-011/F-014/F-001) |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | grep clean                                                                                                    |
| No `console.*`                                          | ✅     | grep clean                                                                                                    |
| No `setTimeout` / `setInterval` residue (§7)            | ✅     | grep clean                                                                                                    |
| Additive optional field only (§1.7)                     | ✅     | `isError?: boolean` new optional on `ToolCallCompleteEventData` + `ConversationToolCallMessage`; no breaking  |
| Type before use (§2.3)                                  | ✅     | SSE wire type gains `isError?` before the reducer / react read it                                             |
| Reducer carries the flag (§3.2 / §6)                    | ✅     | `onToolCallComplete` sets `isError: toolCallComplete.isError`; reuses the existing method, no 2nd path        |
| React status reads `isError` + fallback (§6)            | ✅     | `status = (toolCall.isError \|\| toolCall.result?.error) ? 'error' : 'completed'`                             |
| core has no react/react-dom import (§1.6)               | ✅     | grep clean; change is pure types + reducer                                                                    |
| No deep cross-package import (§1.6)                     | ✅     | grep clean                                                                                                    |
| Replay-safe (§7)                                        | ✅     | `isError` comes from the event fact, not derived from arrival time                                            |

### §1.2 Grep (F-009 scope)

```
[: any / as any / <any>]              (none)
[@ts-ignore / @ts-expect-error / eslint-disable]  (none)
[console.(log|debug|info|warn|error)] (none)
[setTimeout / setInterval]            (none)
[@asgard-js/(core|react)/src]         (none)
[core: from 'react' / react-dom]      (none)
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green (vite dts type check authoritative).

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

R1/R4 via core Vitest (`packages/core/src/lib/conversation.spec.ts`, **17/17 pass**, 3 new for F-009). R2/R3/R5 via the scoped `/tool-call-iserror` route (Playwright MCP), verified by DOM extraction + screenshot.

### R# Result Matrix

| R#  | Description                                                  | Result | Note                                                                                                                                                             |
| --- | ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | isError on SSE type + variant; reducer carries it            | Pass   | Vitest: `onToolCallComplete` with `isError:true` → message `{ isComplete:true, isError:true }`                                                                   |
| R2  | error status driven by isError (native / platform / general) | Pass   | DOM: Bash (native, plain-text result `{text}`, `isError:true`) → `status_icon--error` stroke `rgb(255,77,79)` red — the old `result.error` heuristic misses this |
| R3  | result.error retained as fallback                            | Pass   | DOM: WebSearch (no `isError`, `result.error` present) → red alert; Vitest confirms `result` retained on the message                                              |
| R4  | omitted isError → completed                                  | Pass   | Vitest: omitted `isError` → flag falsy; DOM: Read (native, `isError` omitted) → no `status_icon` (completed, no mark)                                            |
| R5  | (build + Vitest + browser smoke)                             | Pass   | build:core + build:react green; Vitest 17/17; `/tool-call-iserror` 0 console errors; screenshot `.github/screenshots/f-009/tool-call-iserror.png`                |

**§3 result: PASS — zero BLOCKERs.**

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

- 2026-07-15: REVIEW task created, paired with BUILD-011 (Status: `draft`).
- 2026-07-15: §1 static — all checklist ✅, all greps clean, tsc/lint/build green. §3 functional — R1–R5 all Pass (Vitest 17/17 + `/tool-call-iserror` DOM + screenshot). Zero BLOCKERs (Status: `done`).
