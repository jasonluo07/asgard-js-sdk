# REVIEW-012 Task Check List Panel

## Meta

- Task ID: `REVIEW-012`
- Status: `done`
- BUILD Task: `BUILD-012`
- Reviewed commit: working tree on `af97c30` (F-010 delta, pre-commit)
- Reviewed branch: `feat/f-010-task-check-list`

---

## §1 Static Code Review

Scope: BUILD-012 `## Coverage` files (F-010 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                                      |
| ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | only hit is the word "any" in a JSDoc comment (`task-reducer.ts:41`); sidecar narrowed via `asRecord` / `asString` guards |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | the one `eslint-disable` (footer:627) is **pre-existing** export-handler code, not in the F-010 diff                      |
| No `console.*` (own code)                               | ✅     | the one `console.error` (footer:628) is **pre-existing** export handler; F-010 diff adds none                             |
| No `setTimeout` / `setInterval` residue (§7)            | ✅     | grep clean                                                                                                                |
| core stays framework-agnostic (§1.6)                    | ✅     | `task-reducer.ts` / `task.ts` import no react/react-dom/DOM; pure functions + types                                       |
| No deep cross-package import (§1.6)                     | ✅     | react imports `isTaskTool` / `reduceTaskEvents` / `Task` from the `@asgard-js/core` entry                                 |
| Additive optional fields only (§1.7)                    | ✅     | `toolUseResultSidecar?` / `sidecar?` new optional; `Task` / reducer are new API — no breaking change                      |
| New public API exported from entry (§2.2)               | ✅     | `isTaskTool` / `reduceTaskEvents` / `TaskToolEvent` from `index.ts`; `Task` / `TaskStatus` via `types` barrel             |
| Type before use (§2.3)                                  | ✅     | SSE `toolUseResultSidecar?` added before the reducer / react read the message `sidecar`                                   |
| Explicit return types on exports (§3.1)                 | ✅     | `isTaskTool(): boolean`, `reduceTaskEvents(): Task[]`; component fns typed `ReactNode`                                    |
| TaskList theming via tokens, no hex in tsx (§4.2)       | ✅     | colors only in `.module.scss`; amber `#faad14` matches the existing tool-call running accent, else `--asgard-*` tokens    |
| lucide icons byte-identical to 0.487.0 (§4.4)           | ✅     | LoaderCircle / CircleCheck / Circle / ListTodo / ChevronDown / ChevronRight extracted from prototype node_modules 0.487.0 |
| Replay-safe (§7)                                        | ✅     | `reduceTaskEvents` pure; id/status from sidecar not the result string; any prefix folds to the same snapshot              |

### §1.2 Grep (F-010 scope)

```
[: any / as any / <any>]        1 hit → "any prefix" in a JSDoc comment (not a type)
[@ts-ignore / eslint-disable]   1 hit → pre-existing footer export handler (not F-010)
[console.*]                     1 hit → pre-existing footer export handler (not F-010)
[setTimeout / setInterval]      (none)
[core: from 'react' / react-dom](none)
[@asgard-js/(core|react)/src]   (none)
[hex/rgba in task-list.tsx]     (none — colors only in scss)
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green (vite dts type check authoritative).

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

R1–R3 via core Vitest (`task-reducer.spec.ts` 13 + `conversation.spec.ts` 2 new; **32/32 core tests pass**). R4–R7 via the scoped `/task-list` route (Playwright MCP), verified by DOM extraction + screenshot.

### R# Result Matrix

| R#  | Description                                       | Result | Note                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | task tools routed out of the tool-call group      | Pass   | DOM: the thread group shows only `Read inventory.md`; no TaskCreate/TaskUpdate and no task subjects leak into the thread                                                                                                                       |
| R2  | reduceTaskEvents fold (sidecar authority, replay) | Pass   | Vitest: create→pending, update via `sidecar.statusChange.to`, `parameter.status` fallback, unknown-id skip, update-before-create ignore, create-order, full+prefix replay (附錄 A)                                                             |
| R3  | sidecar plumbed onto the SSE type + message       | Pass   | Vitest: `onToolCallComplete` carries `toolUseResultSidecar` onto the message; absent when omitted                                                                                                                                              |
| R4  | docked above the seam; empty → hidden             | Pass   | DOM: `.asgard-task-list` renders above `RunningIndicator` in the footer; toggling to a task-less set → panel absent while the thread keeps the Read call                                                                                       |
| R5  | tri-state + label + expand + header collapse      | Pass   | DOM: completed=muted check `rgb(140,140,140)`, in_progress=amber spin `rgb(250,173,20)` + `activeForm` bold, pending=muted 0.4; header `1/3`, primary icon `rgb(71,103,235)`; row1 expands to its description; header collapse keeps the count |
| R6  | task.\* i18n en/ja/zh; content not translated     | Pass   | en-US renders `Tasks` / `Done` / `In progress` / `To do` (aria-labels); ja/zh keys in the catalog; `t()` fallback proven (F-005–F-008); subject/activeForm/description shown raw                                                               |
| R7  | (build + Vitest + browser smoke)                  | Pass   | build:core + build:react green; core Vitest 32/32; `/task-list` 0 console errors; screenshot `.github/screenshots/f-010/task-list.png`                                                                                                         |

**§3 result: PASS — zero BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- `chatbot-footer.tsx:627–628` carries a pre-existing `eslint-disable` + `console.error` in the export-download handler — **outside F-010 scope**, noted for awareness only; not changed (per "only clean up your own mess").

---

## Execution Log

- 2026-07-15: REVIEW task created, paired with BUILD-012 (Status: `draft`).
- 2026-07-15: §1 static — all checklist ✅ (2 grep hits triaged as a comment word + pre-existing footer code), tsc/lint/build green. §3 functional — R1–R7 all Pass (Vitest 32/32 + `/task-list` DOM + screenshot). Zero BLOCKERs (Status: `done`).
