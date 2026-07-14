# REVIEW-006 Built-in Tool-Call Variants + Label Synthesis

## Meta

- Task ID: `REVIEW-006`
- Status: `done`
- BUILD Task: `BUILD-006`
- Reviewed commit: working tree on `ab07cf0` (F-004 delta, pre-commit)
- Reviewed branch: `feat/f-004-builtin-tool-call-variants`

---

## §1 Static Code Review

Scope: BUILD-006 `## Coverage` files (F-004 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                                     |
| ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean; parameter reads go through a `str(v: unknown): string` guard, not a cast                                     |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | grep clean                                                                                                               |
| No `console.log`                                        | ✅     | grep clean                                                                                                               |
| No `<style>` injected into JSX                          | ✅     | icons are inlined `<svg>` components; styling in the scss module                                                         |
| SVG paths inlined into components                       | ✅     | the seven native lucide icons + Wrench inlined alongside the existing tool-call icons (no lucide dep added)              |
| Colors via CSS variables (§4.2)                         | ✅     | `.tool_call_item__variant_icon` uses `var(--asgard-tool-call-icon, #8c8c8c)` (icons draw with `currentColor`)            |
| Explicit return types (§3.1)                            | ✅     | `synthesizeToolCallLabel(): string`, `getToolCallVariant(): ToolCallVariant`, icon fns `: ReactNode`                     |
| Component props / new field typed (§4.1)                | ✅     | `ToolCallItemData.variant: ToolCallVariant`; `VariantIcon` props typed                                                   |
| `@asgard-js/core` untouched (§1.6 / R5)                 | ✅     | no core change; `toolsetName` / `toolName` / `reason` / `parameter` read from the existing `ConversationToolCallMessage` |
| en-US strings grouped for F-005 (§7)                    | ✅     | the synthesized strings live in `EN_LABEL`; F-005 will lift them into the locale catalog                                 |
| New public API exported from entry (§2.2)               | ✅     | `synthesizeToolCallLabel` / `getToolCallVariant` / `ToolCallVariant` via the templates barrel                            |

### §1.2 Grep (F-004 scope)

```
[as any / @ts-ignore / eslint-disable / console.log / <style>]   (none)
[.scss variant_icon color]   var(--asgard-tool-call-icon, #8c8c8c)  (CSS-var fallback, theme)
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean (no core change).
- `npm run build:react` (vite dts, authoritative react type check) → green; raw `tsc -p packages/react/tsconfig.lib.json` emits only the pre-existing TS6305 composite artifact.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green.

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

React-only display logic (no core change → no Vitest). All R# via the scoped `/tool-call-variants` route (Playwright MCP DOM extraction of the nine rendered items — label text + the left variant-icon SVG signature).

### R# Result Matrix

| R#  | Description                                                                   | Result | Note                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | label priority reason → synthesize → toolName                                 | Pass   | native seven (reason `""`) → synthesized; general (`crm-toolset`) + platform (`execute_database_query`) with a non-empty `reason` → their `reason`        |
| R2  | native gated on toolName∈seven && toolsetName==""; platform not misclassified | Pass   | `execute_database_query` (`toolsetName === ""`, not in the seven) rendered `reason` + the generic Wrench, **not** treated as native                       |
| R3  | synthesis en-US (Bash=description, file basename, skill, host, query)         | Pass   | Bash→"建置整個專案" (description); Read/Write/Edit→"Read/Wrote/Edited {basename}"; Skill→skill; WebFetch→host `docs.asgard-ai.com`; WebSearch→"…{query}…" |
| R4  | per-native variant icon; general/platform generic icon                        | Pass   | icon signatures: Bash=Terminal, Read=FileText, Write=FilePlus, Edit=FilePen, Skill=Sparkles, WebFetch=Globe, WebSearch=Search; general + platform=Wrench  |
| R5  | no core change (reads existing fields)                                        | Pass   | `build:core` unchanged; helper reads existing `ConversationToolCallMessage` fields                                                                        |
| R6  | (browser smoke) native + general + platform render correctly                  | Pass   | `/tool-call-variants` all nine verified, 0 console errors; screenshots `.github/screenshots/f-004/tool-call-variants{,-top}.png`                          |

**§3 result: PASS — all R1–R6 Pass, zero BLOCKERs.**

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

- 2026-07-14: REVIEW task created, paired with BUILD-006 (Status: `draft`).
- 2026-07-14: §1 Static Code Review — checklist all ✅, grep clean, core tsc clean, react build green, lint green. §3 Functional Validation — R1–R6 all Pass (Playwright DOM extraction of the nine tool-calls on `/tool-call-variants`: labels + variant-icon signatures, incl. the platform no-misclassification case, 2 screenshots, 0 console errors). Zero BLOCKERs. Status: `draft → done`.
