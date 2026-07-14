# REVIEW-013 Subagent List Panel

## Meta

- Task ID: `REVIEW-013`
- Status: `done`
- BUILD Task: `BUILD-013`
- Reviewed commit: working tree on `50042f4` (F-012 delta, pre-commit)
- Reviewed branch: `feat/f-012-subagent-list`

---

## §1 Static Code Review

Scope: BUILD-013 `## Coverage` files (F-012 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                                        |
| ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean; SSE/sidecar/adapter fields narrowed via typed shapes + guards (`str`, `?.`)                                     |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | grep clean                                                                                                                  |
| No `console.*`                                          | ✅     | grep clean                                                                                                                  |
| No `setTimeout` / `setInterval` residue (§7)            | ✅     | grep clean                                                                                                                  |
| core stays framework-agnostic (§1.6)                    | ✅     | `subagent-reducer.ts` / `subagent.ts` import no react/react-dom/DOM                                                         |
| No deep cross-package import (§1.6)                     | ✅     | react imports the subagent API + types from the `@asgard-js/core` entry                                                     |
| Additive only (§1.7)                                    | ✅     | new events, new optional tool-call ids, new `ConversationSubagentMessage` variant, new API — no breaking change             |
| New public API exported from entry (§2.2)               | ✅     | `isAgentTool` / `isSubagentChildTool` / `reduceSubagents` / `SubagentEvent` from `index.ts`; types via barrel               |
| Enum + Fact before use (§2.3)                           | ✅     | `SUBAGENT_START/COMPLETE` + Fact entries added before the reducer / react read them                                         |
| Explicit return types on exports (§3.1)                 | ✅     | `isAgentTool(): boolean`, `reduceSubagents(): Subagent[]`; component fns typed `ReactNode`                                  |
| SubagentList theming via tokens, no hex in tsx (§4.2)   | ✅     | colors only in `.module.scss`; amber `#faad14` / red `#ff4d4f` match the tool-call status idiom, else tokens                |
| lucide icons byte-identical to 0.487.0 (§4.4)           | ✅     | Bot / CircleSlash extracted from prototype node_modules 0.487.0; LoaderCircle / CircleCheck / CircleAlert / Chevrons reused |
| Replay-safe (§7)                                        | ✅     | status terminal only via `subagentComplete`; async `Agent` tool completion is never fed as a complete                       |

### §1.2 Grep (F-012 scope)

```
[: any / as any / <any>]        (none)
[@ts-ignore / eslint-disable]   (none)
[console.*]                     (none)
[setTimeout / setInterval]      (none)
[core: from 'react' / react-dom](none)
[@asgard-js/(core|react)/src]   (none)
[hex/rgba in subagent-list.tsx] (none — colors only in scss)
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green (vite dts type check authoritative).

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

R1/R3/R4/R5 via core Vitest (`subagent-reducer.spec.ts` 11 + `conversation.spec.ts` 4 new; **47/47 core tests pass**). R2/R6/R7/R8/R9 via the scoped `/subagent-list` route (Playwright MCP), verified by DOM extraction + screenshot.

### R# Result Matrix

| R#  | Description                                                 | Result | Note                                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | subagent events + toolUseId/parentToolUseId plumbed         | Pass   | Vitest: `onToolCallStart` carries the ids; `onSubagentStart/Complete` store `subagent:X:{start,complete}` with agentId/subagentType/status/summary                                                                                                                                        |
| R2  | Agent + child tools routed out of the main group            | Pass   | DOM: thread shows only `Read inventory.md`; no `Agent` / child tool / subagent leaks into the thread group                                                                                                                                                                                |
| R3  | reduceSubagents fold (child tools, terminal states)         | Pass   | Vitest: agentStart/subagentStart ensure, child tool folding (completed/error), subagentComplete terminal (completed/failed/cancelled), first-seen order                                                                                                                                   |
| R4  | async-launched Agent tool does not mark subagent done       | Pass   | Vitest (附錄 A) + DOM: subagent #1 stays `running` with its child tools done and its `Agent` tool `result.status="async_launched"`; shows `↳ Running: {tool}`                                                                                                                             |
| R5  | replay-safe: terminal only via subagent.complete            | Pass   | Vitest: re-seen agentStart/subagentStart never reverts a completed subagent; any prefix folds consistently                                                                                                                                                                                |
| R6  | docked above Task List; never→hidden, all-terminal→collapse | Pass   | DOM: `.asgard-subagent-list` renders above `<TaskList>`; any-running → expanded; the all-done toggle → header stays (`2/2`) with the list auto-collapsed                                                                                                                                  |
| R7  | item glyph + current-tool / tool-count + expand tools       | Pass   | DOM: running amber spin + `↳ Running: execute_database_query`; completed muted check + `2 tools`; expand → child labels `compute_stats` / `Wrote trend.md`                                                                                                                                |
| R8  | subagent.\* i18n en/ja/zh                                   | Pass   | Live locale selector: zh-TW → 子代理 / 進行中 / 已完成 / 執行中:{tool} / {n} 個工具; en-US → Subagents / Running / Done / Running: {tool} / {n} tools; child `reason` labels stay untranslated (查詢 SWRCH35K…). Required moving `ChatbotFooter` inside the template provider — see Minor |
| R9  | (build + Vitest + browser smoke)                            | Pass   | build:core + build:react green; core Vitest 47/47; `/subagent-list` 0 console errors; screenshot `.github/screenshots/f-012/subagent-list.png`                                                                                                                                            |

**§3 result: PASS — zero BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- Build-time defect found + fixed in this cycle: `ConversationSubagentMessage` reached the thread `ConversationMessageRenderer` and crashed on `.template`; `groupMessages` now skips `type === 'subagent'` (chrome-only). Re-verified 0 console errors.
- i18n defect found + fixed in this cycle: `ChatbotFooter` was rendered _outside_ `AsgardTemplateContextProvider`, so the docked `TaskList` (F-010, already on main) / `SubagentList` panels always resolved `locale` to the default `en-US`. Moved the footer inside the provider (`chatbot.tsx`); the fix also repairs F-010's TaskList i18n. Verified live via the demo locale selector (zh-TW / en-US).

---

## Execution Log

- 2026-07-15: REVIEW task created, paired with BUILD-013 (Status: `draft`).
- 2026-07-15: §1 static — all checklist ✅, all greps clean, tsc/lint/build green. §3 functional — R1–R9 all Pass (Vitest 47/47 + `/subagent-list` DOM + screenshot). Zero BLOCKERs (Status: `done`).
