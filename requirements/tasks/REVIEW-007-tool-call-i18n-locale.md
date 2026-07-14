# REVIEW-007 Tool-Call i18n Locale Prop

## Meta

- Task ID: `REVIEW-007`
- Status: `done`
- BUILD Task: `BUILD-007`
- Reviewed commit: working tree on `bd477ef` (F-005 delta, pre-commit)
- Reviewed branch: `feat/f-005-tool-call-i18n-locale`

---

## §1 Static Code Review

Scope: BUILD-007 `## Coverage` files (F-005 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                 |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean                                                                                           |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | grep clean                                                                                           |
| No `console.log`                                        | ✅     | grep clean                                                                                           |
| No `<style>` injected into JSX                          | ✅     | none                                                                                                 |
| Explicit return types (§3.1)                            | ✅     | `t(): string`, `synthesizeToolCallLabel(): string`                                                   |
| New prop / context field typed (§4.1)                   | ✅     | `AsgardTemplateContextValue.locale?: Locale`; `t(locale: Locale, key: string, vars?)`                |
| Catalog / interpolation precisely typed (§1.1)          | ✅     | `MESSAGES: Record<Locale, Record<string, string>>`; `t` regex-interpolates `{var}` from typed `Vars` |
| en-US fallback (R1)                                     | ✅     | `MESSAGES[locale]?.[key] ?? MESSAGES['en-US'][key] ?? key`; provider/context default `en-US`         |
| Bash bypasses i18n (§7 / R4)                            | ✅     | Bash returns `parameter.description` raw; no `t()` call                                              |
| `@asgard-js/core` untouched (§1.6 / R6)                 | ✅     | i18n lives in `@asgard-js/react`; no core change                                                     |
| `Locale` exported from package entry (§2.2)             | ✅     | `export * from './i18n'` in `packages/react/src/index.ts` (consumers verified importing `Locale`)    |
| No breaking public API (§1.7)                           | ✅     | `locale` optional on the context value + `<Chatbot>` (inherited) — existing consumers unaffected     |
| All user-facing synthesized text via catalog (§5.3)     | ✅     | the six tool labels resolve through `t()`; the 18 catalog strings are the intentional NL data        |

### §1.2 Grep (F-005 scope)

```
[as any / @ts-ignore / eslint-disable / console.log / <style>]   (none)
[i18n.ts 'tool.' keys]   18  (6 keys × 3 locales — the intentional catalog)
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean (no core change).
- `npm run build:react` (vite dts, authoritative react type check) → green.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.
- `npm run build:core && npm run build:react` → both green.

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

React-only (no core change → no Vitest). All R# via the scoped `/tool-call-i18n` route (Playwright MCP): the locale switcher toggled en-US / ja-JP / zh-TW, extracting the rendered tool-call labels each time.

### R# Result Matrix

| R#  | Description                                                 | Result | Note                                                                                                                                                 |
| --- | ----------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Chatbot `locale` prop; default fallback en-US               | Pass   | initial render = en-US labels (Read/Wrote/Edited/…); prop optional                                                                                   |
| R2  | locale flows Chatbot → context → toolCallToItemData → synth | Pass   | switching the route's `locale` state → the Chatbot `locale` prop → context → labels change                                                           |
| R3  | catalog + t() interpolation; labels render per locale       | Pass   | en-US / ja-JP (…読み込み/作成/編集/実行/取得/検索) / zh-TW (讀取/寫入/編輯/執行 skill/擷取/搜尋) all correct with `{file}`/`{host}`/`{query}` filled |
| R4  | Bash description not translated                             | Pass   | the Bash row ("建置整個專案…") is byte-identical across all three locales                                                                            |
| R5  | locale change re-renders labels immediately                 | Pass   | clicking a locale button re-renders instantly; round-trips back to en-US                                                                             |
| R6  | no core change; Locale exported                             | Pass   | `build:core` unchanged; the demo imports `Locale` from `@asgard-js/react`                                                                            |
| R7  | (browser smoke) live locale switch across en/ja/zh          | Pass   | `/tool-call-i18n` verified, 0 console errors; screenshots `.github/screenshots/f-005/tool-call-i18n-{en,zh,ja}.png`                                  |

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

- 2026-07-14: REVIEW task created, paired with BUILD-007 (Status: `draft`).
- 2026-07-15: §1 Static Code Review — checklist all ✅, grep clean, core tsc clean, react build green, lint green. §3 Functional Validation — R1–R7 all Pass (Playwright locale-switch extraction on `/tool-call-i18n`: en/ja/zh labels + Bash-untranslated + live round-trip, 3 screenshots, 0 console errors). Zero BLOCKERs. Status: `draft → done`.
