# BUILD-010 Tool-Call Expanded Content + Localized Titles

## Meta

- Task ID: `BUILD-010`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/8`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-008-tool-call-展開內容對齊-Initial-Result.md` (+ `use-cases/UC-013`; pinned prototype spec `docs/superpowers/specs/2026-07-10-builtin-tool-call-variants-design.md` §8)
- Complexity: `S`

---

## Brief

Align the tool-call expanded content with the pinned spec §8: each tool-call with content expands to an `Initial` (`{ toolsetName, toolName, parameter }`) and a `Result` (`toolCallResult`) JsonViewer, with the section titles **localized** via the F-005 catalog. The SDK already renders both JsonViewers and already gates the expand chevron on having content; this cycle's actual change is small — replace the hardcoded English `"Initial"` / `"Result"` titles with `t(locale, 'expand.initial' / 'expand.result')`, threading `locale` into the tool-call group. Built-in variant differentiated expansions (Bash terminal view, Edit diff view, …) are explicitly a later stage. React-only; no core change.

**Scope this cycle (F-008):** localize the two expand titles + confirm the Initial/Result expansion and the no-content-no-chevron behavior. **Not this cycle:** variant-specific expanded views (later), `IsError` (F-009).

**Already exists:** `tool-call-group.tsx` `ToolCallItem` renders `{item.initial && <JsonViewer title="Initial" …/>}` + `{item.result && <JsonViewer title="Result" …/>}` inside the expanded panel, and only shows the chevron / toggles when `hasContent` (`item.initial || item.result`); `toolCallToItemData` fills `initial` / `result`; F-005 `i18n.ts` (`t()` + catalog) and the `locale` on `AsgardTemplateContext`. The titles are still hardcoded English; `ToolCallGroup` has no `locale`.

---

## Relevant Rules

| §    | Rule (summary)                                                               |
| ---- | ---------------------------------------------------------------------------- |
| §1.1 | No `any`                                                                     |
| §1.6 | `@asgard-js/core` untouched; react-only                                      |
| §4.1 | New `locale` prop on `ToolCallGroupProps` fully typed                        |
| §5.3 | Expand titles go through the `t()` catalog (en/ja/zh); consistent with F-005 |
| §6   | Reuse the existing expand + F-005 `t()`; don't fork a second i18n path       |
| §7   | No leftover hardcoded UI strings for the expand titles                       |

---

## Acceptance Criteria

- `R1` A tool-call with content (`initial` or `result`) is expandable (chevron) and shows the `Initial` (`{ toolsetName, toolName, parameter }`) and `Result` (`toolCallResult`) JsonViewers. → T2, T4
- `R2` The `Initial` / `Result` section titles are localized through the catalog (`expand.initial` / `expand.result`, en/ja/zh). → T1, T2, T3
- `R3` A tool-call with no content shows no expand chevron (not expandable). → T4 (existing behavior — confirm)
- `R4` No `@asgard-js/core` change; built-in variant differentiated expansions are not in this ticket. → T1, T2, T3
- `R5` (Smoke) build green; a scoped react-demo route showing an expandable tool-call (Initial + Result) with localized titles switching en/ja/zh, and a no-content tool-call with no chevron; screenshot to `.github/screenshots/f-008/`. → T4

---

## Implementation Tasks

- [x] T1 (R2): `i18n.ts` — added `expand.initial` / `expand.result` keys (en `Initial`/`Result`, ja `入力`/`結果`, zh `輸入`/`結果`).
- [x] T2 (R1, R2): `tool-call-group.tsx` — added `locale?: Locale` to `ToolCallGroupProps` (default `en-US`); threaded to `ToolCallItem`; the two `JsonViewer` titles use `t(locale, 'expand.initial' / 'expand.result')`.
- [x] T3 (R2): `chatbot-body.tsx` — passes `locale={locale}` to `ToolCallGroupTemplate`.
- [x] T4 (R1, R3, R5): scoped `/tool-call-expand` route rendering `<ToolCallGroup>` directly with an expandable item + a no-content item + a locale switch; browser-verified expand titles localize + no-content has no chevron.
- [x] T5: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5 (UC-013 展開內容對齊 Initial/Result)
Files:

- `packages/react/src/i18n.ts` — add `expand.initial` / `expand.result` (en/ja/zh)
- `packages/react/src/components/templates/tool-call-group/tool-call-group.tsx` — `ToolCallGroupProps.locale?`; thread to `ToolCallItem`; JsonViewer titles via `t()`
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` — pass `locale` to `ToolCallGroupTemplate`
- `apps/react-demo/src/app/routes/tool-call-expand/{tool-call-expand.tsx,tool-call-expand.module.scss,index.ts}` — scoped demo route (direct `<ToolCallGroup>` + locale switch)
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — register `/tool-call-expand`

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/8 (F-008 + UC-013, pinned spec §8) (Status: `draft`).
- 2026-07-15: Implemented T1–T5 (react-only; no core change). build:core+react green, lint:packages green, own-file format clean. Browser-verified `/tool-call-expand`: the item with content shows the expand chevron and, expanded, an `Initial` (`{ toolsetName, toolName, parameter }`) + `Result` (`toolCallResult`) JsonViewer; the section titles localize — en `Initial`/`Result` → ja `入力`/`結果` → zh `輸入`/`結果`; the no-content item shows **no chevron**. 0 console errors. Screenshots: `.github/screenshots/f-008/tool-call-expand-{en,zh}.png`. Built-in variant differentiated expansions remain a later stage. (Status: `in-progress → done`).
