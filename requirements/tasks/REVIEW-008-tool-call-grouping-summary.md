# REVIEW-008 Tool-Call Grouping + Group Summary

## Meta

- Task ID: `REVIEW-008`
- Status: `done`
- BUILD Task: `BUILD-008`
- Reviewed commit: working tree on `c8c8a93` (F-006 delta, pre-commit)
- Reviewed branch: `feat/f-006-tool-call-grouping-summary`

---

## §1 Static Code Review

Scope: BUILD-008 `## Coverage` files (F-006 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                        |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean                                                                                                  |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | grep clean                                                                                                  |
| No `console.log`                                        | ✅     | grep clean                                                                                                  |
| No `<style>` injected into JSX                          | ✅     | none                                                                                                        |
| Explicit return types (§3.1)                            | ✅     | `groupSummary(): string`                                                                                    |
| Summary text via the catalog (§5.3)                     | ✅     | `groupSummary` resolves `summary.steps/skills/files` through `t()`; new keys added in en/ja/zh              |
| Reuse existing grouping + i18n (§6)                     | ✅     | uses the existing `groupMessages` (no new grouping path) + F-005 `t()`; native counts via `isNativeBuiltin` |
| Static title replaced (§7 / R2)                         | ✅     | `chatbot-body` passes the dynamic summary; the static `'Answer preparation steps'` is no longer rendered    |
| `@asgard-js/core` untouched (§1.6 / R6)                 | ✅     | react-only; no core change                                                                                  |

### §1.2 Grep (F-006 scope)

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

React-only (no core change → no Vitest). All R# via the scoped `/tool-call-grouping` route (Playwright MCP): `initMessages` = group A (Bash+Read+Write+Edit+Skill) + a thinking block + group B (WebFetch+WebSearch), with a locale switch.

### R# Result Matrix

| R#  | Description                                                      | Result | Note                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | consecutive tool-calls group; non-tool-call message breaks group | Pass   | DOM: exactly **2** group headers; the thinking block sits between them (breaks the group)                                                                                                         |
| R2  | dynamic summary replaces the static title                        | Pass   | group A header = "5 steps · Used 1 skills · Processed 3 files" (not "Answer preparation steps")                                                                                                   |
| R3  | segment gating (s=0 / f=0 hidden); n always shows                | Pass   | group A (n=5,s=1,f=3) shows all three segments; group B (n=2,s=0,f=0) shows only "2 steps"                                                                                                        |
| R4  | summary localized en/ja/zh via catalog                           | Pass   | en "5 steps · Used 1 skills · Processed 3 files" / ja "5 ステップ · スキル 1 件 · ファイル 3 件" / zh "5 個步驟 · 使用 1 個 skill · 處理 3 個檔案"                                                |
| R5  | blocks render in event-arrival order (thinking×tool-call)        | Pass   | order = group A → thinking block → group B, matching the initMessages sequence                                                                                                                    |
| R6  | no core change                                                   | Pass   | `build:core` unchanged                                                                                                                                                                            |
| R7  | (browser smoke) multiple groups + summaries render               | Pass   | `/tool-call-grouping` verified, 0 console errors (a transient vite HMR CSS 404 from a concurrent build cleared on reload); screenshots `.github/screenshots/f-006/tool-call-grouping-{en,zh}.png` |

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

- 2026-07-15: REVIEW task created, paired with BUILD-008 (Status: `draft`).
- 2026-07-15: §1 Static Code Review — checklist all ✅, grep clean, core tsc clean, react build green, lint green. §3 Functional Validation — R1–R7 all Pass (Playwright on `/tool-call-grouping`: 2 groups split by a thinking block, per-group summaries + segment gating + en/ja/zh localization, 2 screenshots, 0 console errors). Zero BLOCKERs. Status: `draft → done`.
