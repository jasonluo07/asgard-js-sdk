# BUILD-007 Tool-Call i18n Locale Prop

## Meta

- Task ID: `BUILD-007`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/5`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-005-tool-call-i18n-locale-prop.md` (+ `use-cases/UC-008`; pinned prototype spec `docs/superpowers/specs/2026-07-10-builtin-tool-call-variants-design.md` §3; reference `src/i18n.ts`)
- Complexity: `M`

---

## Brief

Add the SDK's first i18n mechanism so the synthesized native tool-call labels (F-004) render in the selected language. `<Chatbot>` gains a `locale?: 'en-US' | 'ja-JP' | 'zh-TW'` prop (default fallback `en-US`); it flows through `AsgardTemplateContext` into `toolCallToItemData(toolCall, locale)` and the label synthesis. A tiny catalog (`messages[locale][key]`) + `t(locale, key, vars)` with `en-US` fallback replaces F-004's hardcoded `EN_LABEL`. Bash's `description` is natural language written by the agent — shown as-is, never translated. React-only; no core change.

**Scope this cycle (F-005):** the `t()` mechanism + catalog (the tool-label keys `tool.read` … `tool.websearch` in en/ja/zh) + the `locale` prop wiring + live re-render on locale change. **Not this cycle:** the group summary text (F-006 adds its `summary.*` keys + rendering), the expanded-panel titles (F-008 adds `expand.*`), Task/Subagent strings (F-010/F-012). The catalog only carries the keys F-005 actually uses; later tickets add their own keys.

**Already exists:** F-004's `tool-call-label.ts` (`synthesizeToolCallLabel(call)` with the en-US `EN_LABEL` map + `getToolCallVariant`); `chatbot-body.tsx` `toolCallToItemData`; `AsgardTemplateContext` (carries `renderToolCallGroup` etc., read by `chatbot-body` via `useAsgardTemplateContext`); `chatbot.tsx` `ChatbotProps` + `<AsgardTemplateContextProvider>`. No i18n / `locale` anywhere yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — the catalog + `t()` are precisely typed (`Locale`, key/vars)                            |
| §1.6 | `@asgard-js/core` untouched; react-only                                                            |
| §2.2 | Export the public `Locale` type from the package entry (consumers type the `locale` prop)          |
| §3.1 | Explicit return types (`t(): string`, `synthesizeToolCallLabel(): string`)                         |
| §4.1 | New prop / context field fully typed                                                               |
| §5.3 | All user-facing synthesized text goes through the catalog; consistent wording across the 3 locales |
| §6   | Reuse F-004's `synthesizeToolCallLabel` (add a `locale` param); don't fork a second label path     |
| §7   | Bash `description` bypasses i18n by design; no hardcoded UI strings left in the synthesis helper   |

---

## Acceptance Criteria

- `R1` `<Chatbot>` gains `locale?: 'en-US' | 'ja-JP' | 'zh-TW'` with **default fallback `en-US`** (undefined prop → `en-US`; a missing key or locale in `t()` also falls back to `en-US`). → T1, T3
- `R2` The `locale` flows `<Chatbot>` → `AsgardTemplateContext` → `chatbot-body` → `toolCallToItemData(toolCall, locale)` → `synthesizeToolCallLabel(call, locale)`. → T3
- `R3` A `messages[locale][key]` catalog + `t(locale, key, vars)` (with `{var}` interpolation) drives the native synthesized labels — Read / Write / Edit / Skill / WebFetch / WebSearch render in the selected locale (en/ja/zh per spec §3). → T1, T2
- `R4` Bash's `description` is shown as-is, **not** translated, in every locale. → T2
- `R5` Changing the `locale` prop re-renders the already-shown tool-calls into the new language immediately (UC-008). → T3, T4
- `R6` No `@asgard-js/core` change — the i18n lives in `@asgard-js/react`; `Locale` is exported from the package entry. → T1
- `R7` (Smoke) build green; a scoped react-demo route with a locale switcher shows the native tool labels switching across en-US / ja-JP / zh-TW live, with Bash's description unchanged; screenshot to `.github/screenshots/f-005/`. → T4

---

## Implementation Tasks

- [x] T1 (R1, R3, R6): new `packages/react/src/i18n.ts` — `Locale` type, `MESSAGES` catalog (`tool.read` … `tool.websearch` in en/ja/zh per spec §3), `t(locale, key, vars)` with `{var}` interpolation + `en-US` fallback. Exported via the package entry (`export * from './i18n'`).
- [x] T2 (R3, R4): `tool-call-label.ts` — `synthesizeToolCallLabel(call, locale)` replaces `EN_LABEL` with `t(locale, 'tool.…', vars)`; Bash keeps `parameter.description` raw.
- [x] T3 (R1, R2, R5): `AsgardTemplateContext` gains `locale?: Locale` (context default + provider default `en-US`); `chatbot.tsx` adds the `locale` prop (inherited from `AsgardTemplateContextValue`) → `<AsgardTemplateContextProvider locale={…}>`; `chatbot-body.tsx` reads `locale` (default `en-US`) and passes it to `toolCallToItemData`.
- [x] T4 (R5, R7): scoped `/tool-call-i18n` route with an en/ja/zh switcher + tool-call `initMessages`; browser-verified live switching + Bash untranslated; screenshots to `.github/screenshots/f-005/`.
- [x] T5: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6, R7 (UC-008 locale prop 即時切換)
Files:

- `packages/react/src/i18n.ts` — new `Locale` + `MESSAGES` catalog (tool.\* en/ja/zh) + `t(locale, key, vars)` (en-US fallback)
- `packages/react/src/index.ts` — export `./i18n` from the package entry
- `packages/react/src/components/templates/tool-call-group/tool-call-label.ts` — `synthesizeToolCallLabel(call, locale)` via `t()`; Bash raw
- `packages/react/src/context/asgard-template-context.tsx` — `locale?: Locale` on value + provider (default `en-US`)
- `packages/react/src/components/chatbot/chatbot.tsx` — `locale` prop → `<AsgardTemplateContextProvider locale={…}>`
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` — read `locale`, pass to `toolCallToItemData`
- `apps/react-demo/src/app/routes/tool-call-i18n/{tool-call-i18n.tsx,tool-call-i18n.module.scss,index.ts}` — scoped locale-switcher route
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — register `/tool-call-i18n`

---

## Execution Log / Change Log

- 2026-07-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/5 (F-005 + UC-008, pinned spec §3) (Status: `draft`).
- 2026-07-15: Implemented T1–T5 (react-only; no core change). build:core+react green, lint:packages green, own-file format clean. Browser-verified `/tool-call-i18n`: the seven native labels re-render per locale — en-US (Read/Wrote/Edited/Ran skill/Fetched/Searched), ja-JP (…読み込み/作成/編集/実行/取得/検索), zh-TW (讀取/寫入/編輯/執行 skill/擷取/搜尋) — switching live and round-tripping back to en-US; Bash's `description` row ("建置整個專案…") is byte-identical across all three locales (not translated). 0 console errors. Screenshots: `.github/screenshots/f-005/tool-call-i18n-{en,zh,ja}.png`. `AsgardTemplateContextValue.locale` made optional (consistent with the other fields) so `<Chatbot>` inherits it optional — no breaking change. (Status: `in-progress → done`).
