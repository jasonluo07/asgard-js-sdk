# BUILD-008 Tool-Call Grouping + Group Summary

## Meta

- Task ID: `BUILD-008`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/6`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-006-tool-call-分組與-group-summary.md` (+ `use-cases/UC-009`, `UC-010`; pinned prototype spec `docs/superpowers/specs/2026-07-10-builtin-tool-call-variants-design.md` §4, §5)
- Complexity: `M`

---

## Brief

Replace the static tool-call group header `'Answer preparation steps'` with a dynamic, localized summary `{n} steps · Used {s} skills · Processed {f} files` (per spec §5), and confirm the grouping (§4). `n` = tool-calls in the group; `s` = native Skill calls; `f` = native Read + Write + Edit calls; the `skills` / `files` segments are hidden when their count is 0. The summary reuses F-005's `t()` catalog (new `summary.*` keys). Grouping is already derived by `chatbot-body`'s `groupMessages` (consecutive tool-calls, broken by any non-tool-call message — i.e. a `message.start` / `thinking.start` between them starts a new group), and blocks already render in event-arrival (Map insertion) order — this cycle verifies that and wires the summary in. React-only; no core change.

**Scope this cycle (F-006):** the `summary.*` catalog keys + a `groupSummary(calls, locale)` helper + passing it as the group title; verify §4 grouping + order preservation. **Not this cycle:** Write/Edit diff (F-007), expanded-panel localization (F-008), `IsError` (F-009), Subagent grouping (F-012).

**Already exists:** `chatbot-body.tsx` `groupMessages` (groups consecutive `tool-call` messages, flushes on any non-tool-call → §4 break-on-message/thinking already holds) + the tool-call-group render passing `title`; `tool-call-group.tsx` `ToolCallGroup` default `title = 'Answer preparation steps'`; F-005 `i18n.ts` (`t()` + catalog) and `tool-call-label.ts` (`synthesizeToolCallLabel`, native detection). No dynamic summary yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — count/summary helpers precisely typed                                                   |
| §1.6 | `@asgard-js/core` untouched; react-only                                                            |
| §3.1 | Explicit return types (`groupSummary(): string`)                                                   |
| §5.3 | Summary text goes through the `t()` catalog (en/ja/zh); consistent with F-005                      |
| §6   | Reuse the existing `groupMessages` + F-005 `t()`; don't fork a second grouping or i18n path        |
| §7   | Remove the now-dead static `'Answer preparation steps'` reliance (the dynamic summary replaces it) |

---

## Acceptance Criteria

- `R1` Consecutive tool-calls form one group; a `message.start` or `message.thinking.start` (any non-tool-call message) between them starts a new group; `.start`/`.complete` are already paired by the reducer (one message per call). → T3
- `R2` Each group shows one dynamic summary `{n} steps · Used {s} skills · Processed {f} files` (localized via `t()`), replacing the static `'Answer preparation steps'`. → T1, T2, T3
- `R3` Segment gating: `s === 0` hides ` · Used {s} skills`; `f === 0` hides ` · Processed {f} files`; `{n} steps` always shows. `s` = native Skill count, `f` = native Read + Write + Edit count. → T2
- `R4` The summary is localized (en/ja/zh) through the F-005 catalog (new `summary.*` keys). → T1, T2
- `R5` Blocks render in event-arrival order — an interleaved thinking block / tool-call group / answer within one turn keeps its order (naturally from `groupMessages` + Map insertion order). → T3
- `R6` No `@asgard-js/core` change. → T1, T2, T3
- `R7` (Smoke) build green; a scoped react-demo route showing multiple groups (tool-calls split by an interleaved thinking / message) with correct per-group summaries + segment gating + localization; screenshot to `.github/screenshots/f-006/`. → T4

---

## Implementation Tasks

- [x] T1 (R2, R4): `i18n.ts` — added `summary.steps` / `summary.skills` / `summary.files` keys (en/ja/zh per spec §5).
- [x] T2 (R2, R3, R4): `tool-call-label.ts` — `groupSummary(calls, locale)` computing `n` / `s` (native Skill) / `f` (native Read+Write+Edit) → `t(locale, 'summary.steps', { n })` + gated `summary.skills` / `summary.files`.
- [x] T3 (R1, R2, R5): `chatbot-body.tsx` — passes `title={overrides?.title ?? groupSummary(group.toolCalls, locale)}` to `ToolCallGroupTemplate`. `groupMessages` already breaks on any non-tool-call and preserves Map insertion order — no logic change (verified).
- [x] T4 (R7): scoped `/tool-call-grouping` route with `initMessages` = group A (Bash+Read+Write+Edit+Skill) + a thinking block + group B (WebFetch+WebSearch); browser-verified 2 groups, per-group summaries + segment gating + en/ja/zh.
- [x] T5: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6, R7 (UC-009 分組、UC-010 group summary)
Files:

- `packages/react/src/i18n.ts` — add `summary.steps` / `summary.skills` / `summary.files` (en/ja/zh)
- `packages/react/src/components/templates/tool-call-group/tool-call-label.ts` — `groupSummary(calls, locale)` (n/s/f + `t()`, s/f=0 gated)
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` — pass the dynamic summary as the group title
- `apps/react-demo/src/app/routes/tool-call-grouping/{tool-call-grouping.tsx,tool-call-grouping.module.scss,index.ts}` — scoped demo route (2 groups split by a thinking block + locale switch)
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — register `/tool-call-grouping`

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/6 (F-006 + UC-009/UC-010, pinned spec §4/§5) (Status: `draft`).
- 2026-07-15: Implemented T1–T5 (react-only; no core change). build:core+react green, lint:packages green, own-file format clean. Browser-verified `/tool-call-grouping`: the tool-calls split into **2 groups** (a thinking block between them breaks the group; the thinking×tool-call order is preserved), each with the dynamic summary replacing the static 'Answer preparation steps' — group A = "5 steps · Used 1 skills · Processed 3 files" (n=5, s=1, f=3, all segments), group B = "2 steps" (s=0/f=0 → skills/files segments hidden). Localized across en-US / ja-JP (5 ステップ · スキル 1 件 · ファイル 3 件) / zh-TW (5 個步驟 · 使用 1 個 skill · 處理 3 個檔案). 0 console errors (a transient vite HMR CSS 404 from running build alongside the live dev server cleared on reload). Screenshots: `.github/screenshots/f-006/tool-call-grouping-{en,zh}.png`. (Status: `in-progress → done`).
