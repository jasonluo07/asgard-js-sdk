# BUILD-039 Export the theme type surface and wire the phantom tokens

## Meta

- Task ID: `BUILD-039`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/31`
- Source spec: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/31` — issue body §「建議落地順序 → 第一階段」，加上 2026-08-04 於 `main` @ `2989051`（0.3.40）的複驗留言。**PM 尚未把本稽核開成 `tracking/asgard-js-sdk` 下的 F/UC/TASK spec**（已於 `7b917ca` 確認 `features/` 只有 F-001~F-023、`tasks/` 只有 TASK-001 / TASK-003），故本票以 issue 本體為 source spec，經使用者授權先行動工。
- Complexity: `M`

---

## Brief

`@asgard-js/react` 的 theme 系統有兩類缺陷讓消費端「設了沒反應、也收不到任何警告」：**型別出不去**（`ChatbotTheme` 從來不存在、`ChatbotProps` 是未 export 的 `interface`），以及 **SCSS 讀得到、provider 從不寫入的幽靈 CSS 變數**（17 個 `--asgard-*`）。本票把這兩類一次修掉，並清掉三個「設下去會編譯過但什麼都不做」的死 API。

全部改動都是 additive：新增 export、在既有的 `themeVars` 條件注入區塊補上對應 token、把 5 處指向未定義變數的引用改指到真的存在的那個。**未設 theme 的預設外觀必須逐像素不變**——所有新 token 一律沿用既有的條件注入寫法（只有當 theme 指定了對應欄位才寫入），不得改動 SCSS 內的 fallback 值。

不含版面／grid 改動（缺陷 8 另立 BUILD-040），不含第二階段的 SCSS token 化，不含第三階段的 design-system 遷移（`@asgard/design-tokens` 尚未發上 npm，前置未達成）。

**Already exists:** `packages/react/src/context/asgard-theme-context.tsx`（`themeVars` 條件注入區塊 `:826-878`、`wash()` helper、`AsgardThemeContextValue`）、`packages/react/src/index.ts`（`export *` 進入點）、`packages/react/src/i18n.ts`（`Locale` **已於 BUILD-038 export，本票不再處理**）。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.4 | No hardcoded API key / endpoint / namespace — pass via `config`                                                           |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)            |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §2.3 | Template type (`core/src/types/sse-response.ts`) + enum (`core/src/constants/enum.ts`) exist before the react component   |
| §2.4 | Use `botProviderEndpoint`, not the deprecated `endpoint`                                                                  |
| §3.1 | Exported functions / methods declare explicit return types                                                                |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                       |
| §4.1 | React component props fully typed (no `any`)                                                                              |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context                                         |
| §4.4 | `react` / `react-dom` stay peerDependencies (not bundled)                                                                 |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                     |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a consumer writes `import type { ChatbotTheme } from '@asgard-js/react'`, the system shall resolve it to the `theme` prop's own type (`Partial<AsgardThemeContextValue>`) so a theme object setting only some sections type-checks successfully. → T1
- `R2` When a consumer writes `import type { ChatbotProps } from '@asgard-js/react'`, the system shall resolve it to the `<Chatbot>` prop type and type-check successfully. → T1
- `R3` When `npx tsc -p apps/react-demo/tsconfig.app.json --noEmit --pretty false` is run, the system shall report **zero** errors mentioning `ChatbotTheme`, taking the demo from 8 errors to 5. **Corrected during build**: 3 (not 6) of the 8 were caused by `ChatbotTheme`; the earlier count came from grepping pretty-printed output, which repeats the symbol on the code-frame line. The remaining 5 are pre-existing and unrelated (`ErrorMessage` shape, `events` handler signature, `history-scroll-bug` template type, core has no `Theme` export, `tool-call` missing `cancelled`) — they belong to the standing backlog item about the demo not being inside the typecheck gate. → T1, T6
- `R4` When a theme supplies the field each token derives from, the system shall write the **8** `--asgard-*` custom properties whose fallbacks are hardcoded dead values — `markdown-link`, `markdown-link-hover`, `consent-modal-primary-fg`, `consent-modal-code-bg`, `consent-modal-code-border`, `json-viewer-text`, `thinking-reasoning`, `tool-call-hover` — into the `.chatbot_root` style. **Corrected during build**: the audit counted 17 phantom names, but 9 of them (`consent-modal-bg` / `-border` / `-headline` / `-accent` / `-accent-hover` / `-muted` / `-title` / `-input-bg` / `-danger`) already fall through to `--asg-color-*` (e.g. `var(--asgard-consent-modal-bg, var(--asg-color-surface, #1f1f1f))`), so they follow the theme today and writing them would be redundant. → T2
- `R5` When no theme (or a theme without the deriving field) is supplied, the system shall write **none** of those 8 properties, leaving every SCSS fallback in effect so the untouched default appearance is pixel-identical to 0.3.40. The two inset tokens (`consent-modal-code-bg` / `-code-border`) additionally require a concrete color, since `chatbot.backgroundColor` / `borderColor` default to `var(--asg-color-*)` strings that are truthy but must not repaint an unthemed chatbot. → T2, T6
- `R6` When any component reads the default message text color, the system shall resolve it through a custom property that the palette actually defines (`--asg-color-text-primary`), so that a consumer setting that token observes the bubble text change — the 5 SCSS + 2 provider references to the never-defined `--asg-color-text` shall no longer exist. **Deliberate visual change**: bubble and composer text stop inheriting the host page's color and take the palette value, which is the defect being fixed (a dark host page previously rendered dark-on-dark). This is the one place in this task where the unthemed rendering may move, and only on hosts whose inherited text color differs from the palette. → T3
- `R7` When a consumer sets `botMessage.linkColor`, `chatbot.borderRadius`, or `template.references.item`, the system shall either honor the value or mark the field `@deprecated` with a comment naming the replacement — no field may silently accept a value and do nothing, and the incorrect `darkenColor(bg, 0.2)` link derivation shall be gone. → T4
- `R8` When the existing test suites run, the system shall keep every current test passing and add regression coverage asserting (a) the 8 tokens are emitted when the deriving theme fields are present, (b) none is emitted for an unthemed chatbot, and (c) the two inset tokens stay off when the theme passes a `var()` through instead of a concrete color. → T5
- `R9` (Smoke check) When the developer runs `npm run lint:packages && npm run format:check && npm run typecheck:packages` then `npm run build:core && npm run build:react`, and exercises the themed surfaces in the react-demo (`npm run serve:react-demo`, http://localhost:4200) at `/all-features-wide` under the **Crazy** preset, the system shall render consent modal / markdown links / thinking / tool-call hover in theme colors with no build errors, and the same route under the default (unthemed) state shall be visually unchanged from 0.3.40. → T6

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R2, R3): Add `export type ChatbotTheme = Partial<AsgardThemeContextValue>` beside the context type; add `export` to `interface ChatbotProps`; confirm both reach the package entry through the existing `export *` chain.
- [x] T2 (R4, R5): In `asgard-theme-context.tsx`, extend the existing conditional `themeVars` blocks to emit the 8 dead-fallback tokens, each derived from the theme field that matches its semantic role, reusing `wash()` where the SCSS fallback is an alpha wash. Do not introduce unconditional writes.
- [x] T3 (R6): Replace the 5 SCSS + 2 provider references to `--asg-color-text` with `--asg-color-text-primary` (keeping each site's existing literal fallback).
- [x] T4 (R7): Remove the `linkColor` derivation; mark `linkColor` / `chatbot.borderRadius` / `template.references.item` `@deprecated` with the replacement named in the comment (§1.7 — deprecate, do not remove).
- [x] T5 (R8): Add Vitest coverage for the themed / unthemed token emission.
- [x] T6 (R3, R5, R9): Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react`; re-run the demo typecheck; smoke check in the react-demo per R9 and screenshot to `.github/screenshots/` (themed + unthemed).

---

## Coverage

Use Cases: R1–R9 (R1/R2 型別解析、R3 demo typecheck、R4/R5/R8 token 注入與條件、R6 `--asg-color-text`、R7 死 API、R9 瀏覽器 smoke)

Files:

- `packages/react/src/context/asgard-theme-context.tsx` (react) — `ChatbotTheme` alias、3 個 `@deprecated`、移除 `linkColor` 推導、8 個 token 條件注入、2 處 `--asg-color-text` → `-text-primary`
- `packages/react/src/context/asgard-theme-context.spec.tsx` (react) — 新增 `phantom --asgard-* tokens` 3 個測試
- `packages/react/src/components/chatbot/chatbot.tsx` (react) — `export interface ChatbotProps`
- `packages/react/src/components/chatbot/chatbot-footer/attachment-preview.module.scss` (react) — 2 處 `--asg-color-text` → `-text-primary`
- `packages/react/src/components/chatbot/chatbot-footer/chat-composer.module.scss` (react) — 3 處 `--asg-color-text` → `-text-primary`

---

## Execution Log / Change Log

- 2026-08-04: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/31 (Status: `draft`). PM 未開 F/UC spec，經使用者授權以 issue 本體為 source spec。缺陷 8（grid row）拆出為 BUILD-040。
- 2026-08-04: 實作開始 (Status: `draft → in-progress`)。
- 2026-08-04: T1–T6 完成，全部 R# 達成 (Status: `in-progress → done`)。
  - **兩處對票面數字的更正**（皆在 AC 內留下記錄）：幽靈 token 實際需接線的是 **8 個**而非 17（其餘 9 個的 fallback 鏈已通到 `--asg-color-*`）；demo 由 `ChatbotTheme` 造成的型別錯誤是 **3 個**而非 6（先前用 pretty 輸出 grep，符號在 code-frame 行重複計入）。
  - **設計調整**：`ChatbotTheme` 定為 `Partial<AsgardThemeContextValue>` 而非直接 alias。先做直接 alias 時 demo 錯誤反而從 8 升到 10——消費端是拿它標註「只設部分區塊」的 theme 物件，而 `theme` prop 本身就是 `Partial<…>`。
  - 靜態檢查：`lint:packages` exit 0（0 error / 1 既有 warning）、`format:check` 全綠、`typecheck:packages` 兩個 project 成功、`build:core` + `build:react` 成功。
  - 測試：core 165 / react 87（新增 3）全綠。
  - demo typecheck：8 → **5**，`ChatbotTheme` 相關歸零；剩 5 個為既有無關項（backlog）。
  - 瀏覽器驗證（react-demo 4200）：`/all-features-wide` Default 外觀無變化；Crazy 下 7/8 token 生效（`consent-modal-primary-fg` 未寫入為正確條件行為——兩個 preset 都沒設 `onMainColor`）；`/markdown-theme` Light 主題下連結實際渲染為 `rgb(23,23,23)`（跟隨 accent，改動前固定 `#3b82f6`），三個 wash token 一併翻成深色。截圖見 `.github/screenshots/39-*.jpeg`。
  - **已知驗證缺口**：`--asgard-consent-modal-primary-fg` 只有單元測試覆蓋——demo 沒有任何 preset 設定 `onMainColor`，瀏覽器上無法觸發；consent modal 本身也需要真實 consent bot 才會出現。
