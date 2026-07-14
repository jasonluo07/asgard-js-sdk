# REVIEW-010 Tool-Call Expanded Content + Localized Titles

## Meta

- Task ID: `REVIEW-010`
- Status: `done`
- BUILD Task: `BUILD-010`
- Reviewed commit: working tree on `a86208e` (F-008 delta, pre-commit)
- Reviewed branch: `feat/f-008-tool-call-expand-localize`

---

## §1 Static Code Review

Scope: BUILD-010 `## Coverage` files (F-008 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                 |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean                                                                                           |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | grep clean                                                                                           |
| No `console.log`                                        | ✅     | grep clean                                                                                           |
| No `<style>` injected into JSX                          | ✅     | none                                                                                                 |
| New prop typed (§4.1)                                   | ✅     | `ToolCallGroupProps.locale?: Locale`; `ToolCallItem` takes a typed `locale`                          |
| Expand titles via catalog (§5.3)                        | ✅     | the two JsonViewer titles resolve `expand.initial` / `expand.result` through `t()`; keys in en/ja/zh |
| Reuse existing expand + i18n (§6)                       | ✅     | reuses the existing `JsonViewer` expand + F-005 `t()`; no new i18n path                              |
| No leftover hardcoded expand strings (§7)               | ✅     | `"Initial"` / `"Result"` replaced with `t(locale, …)`                                                |
| `@asgard-js/core` untouched (§1.6 / R4)                 | ✅     | react-only; no core change                                                                           |

### §1.2 Grep (F-008 scope)

```
[as any / @ts-ignore / eslint-disable / console.log / <style>]   (none)
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean (no core change).
- `npm run build:react` (vite dts, authoritative react type check) → green.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green.

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

React-only (no core change → no Vitest). All R# via the scoped `/tool-call-expand` route (Playwright MCP): a `<ToolCallGroup>` rendered directly with an expandable item + a no-content item + a locale switch.

### R# Result Matrix

| R#  | Description                                       | Result | Note                                                                                                                                       |
| --- | ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | tool-call with content expands → Initial + Result | Pass   | "Wrote report.html" has a chevron; expanded shows the Initial (`{toolsetName,toolName,parameter}`) + Result (`toolCallResult`) JsonViewers |
| R2  | Initial / Result titles localized en/ja/zh        | Pass   | en `Initial`/`Result` → ja `入力`/`結果` → zh `輸入`/`結果`                                                                                |
| R3  | no-content tool-call has no expand chevron        | Pass   | the no-content item renders with `hasChevron: false`                                                                                       |
| R4  | no core change; variant expand not in ticket      | Pass   | `build:core` unchanged; variant-specific expansions explicitly deferred                                                                    |
| R5  | (browser smoke) expand + localized titles render  | Pass   | `/tool-call-expand` verified, 0 console errors; screenshots `.github/screenshots/f-008/tool-call-expand-{en,zh}.png`                       |

**§3 result: PASS — all R1–R5 Pass, zero BLOCKERs.**

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

- 2026-07-15: REVIEW task created, paired with BUILD-010 (Status: `draft`).
- 2026-07-15: §1 Static Code Review — checklist all ✅, grep clean, core tsc clean, react build green, lint green. §3 Functional Validation — R1–R5 all Pass (Playwright on `/tool-call-expand`: expandable item → Initial/Result, titles localized en/ja/zh, no-content item has no chevron, 2 screenshots, 0 console errors). Zero BLOCKERs. Status: `draft → done`.
