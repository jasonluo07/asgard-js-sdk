# BUILD-046 Make `deepMerge` treat `undefined` as "no opinion"

## Meta

- Task ID: `BUILD-046`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/52`
- Source spec: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/52` — issue body 本身即規格（含 probe 實測輸出、根因兩段程式碼、兩個修法選項）。
- Complexity: `S`

---

## Brief

theme 系統文件宣稱 props > annotations > default 三層優先序，但 default 層對六個顏色欄位形同不存在：annotations pass 無條件建構 `{ botMessage: { color: annotations?.embedConfig?.theme?.botMessage?.color, … } }`，沒有 annotations 時每個欄位都是 `undefined`；而 `deepMerge` 對 non-object 值一律賦值，`Object.entries` 又會列舉值為 `undefined` 的 key，於是 default 在 props theme 合併之前就被抹掉。這些表面實際改由 SCSS 硬編值上色，palette token 到泡泡的鏈路整段斷開。

採 issue 的**選項 A**：`deepMerge` 遇到 `undefined` 直接 `continue`。一行修正、語意正確（該層沒意見就不該覆蓋下層），且涵蓋所有現在與未來的呼叫端；選項 B 只堵住 theme context 一處，同樣的錯誤換個地方還會犯。

**Already exists:** `packages/react/src/utils/deep-merge.ts`（唯一要改的一行）、`packages/react/src/context/asgard-theme-context.tsx:226` 的 `defaultAsgardThemeContextValue` 與 :402-500 的 annotations pass（本任務不改，只讓其 default 生效）、BUILD-039 在 :266-276 留下的成因註解。

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
| §    | Rule (summary)                                                                                                            |

|

---

## Acceptance Criteria

- `R1` When a source object carries a key whose value is `undefined`, `deepMerge` shall keep the target's value. → T1, T2
- `R2` When a source object carries an explicit falsy value (`''` / `0` / `null`), `deepMerge` shall still let it win — only `undefined` means "no opinion". → T2
- `R3` When neither annotations nor a props theme are supplied, the resolved theme shall expose every one of the six previously-clobbered defaults. → T1, T3
- `R4` When a props theme sets one field of a group, the sibling fields' defaults shall survive. → T3
- `R5` (Downstream) 逐一稽核七個消費端，指出每一處會改變的表面並判定其方向；不得有非預期的回歸。→ T4
- `R6` (Smoke check) `npm run typecheck:packages`, `npm run build:core && npm run build:react`, `npm run test:packages` all pass. → T5

---

## Implementation Tasks

- [x] T1: `deep-merge.ts` — skip `undefined` before the non-object assignment; document why in place.
- [x] T2: `deep-merge.spec.ts` — 7 cases: undefined skipped, nested partial source, explicit falsy wins, key addition, nested merge, array replacement, missing source.
- [x] T3: `theme-default-layer.spec.tsx` — resolve the real context with no annotations / no props theme and assert all six defaults survive; plus props-wins-without-killing-siblings.
- [x] T4: 下游稽核 —— 逐一讀七個消費端傳給 `<Chatbot>` 的 theme，列出未設欄位，並查該欄位在 SDK 內的實際讀取點與 SCSS 現況。
- [x] T5: `lint:packages` + `format:check` + `typecheck:packages` + `build:core && build:react` + `test:packages`。

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6

Files:

- `packages/react/src/utils/deep-merge.ts` (react) — the one-line guard + rationale comment
- `packages/react/src/utils/deep-merge.spec.ts` (react, new) — 7 cases
- `packages/react/src/context/theme-default-layer.spec.tsx` (react, new) — 2 cases at the real context level

---

## 下游稽核（T4）

> **實作後更正（2026-08-05）**：初版稽核的結論是「七個消費端零視覺差異」，**那是錯的**。實測 Mimir 後發現淺色模式有真實且有益的變化，且初版寫的「沒有消費端覆寫 palette token」也不成立——`--asg-color-text-primary` 不必消費端自己定義，SDK 會從 `primaryComponent.secondaryColor` 推導出來（`asgard-theme-context.tsx:937` `themeVars['--asg-color-text-primary'] = effectiveForeground`）。以下是修正後的稽核。

判定關鍵：`botMessage.color` 的 default 是 `var(--asg-color-text-primary)`，而該變數由 SDK 依消費端的 `primaryComponent.secondaryColor` 推導。因此**只有「有設 `secondaryColor`、但沒設 `botMessage.color`」的消費端會變**。

| 消費端       | 設了 `botMessage.color`？ | `secondaryColor`                                                   | 實際影響                                                                                                      |
| ------------ | ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Mimir**    | ✗                         | 淺 `#0d0d0d` / 深 `#fff`                                           | **淺色模式：白字 → `rgb(13,13,13)`。修好既有 bug——bot 的最終回答原本白字白底、完全看不見。** 深色不變。已截圖 |
| Heimdall     | ✗                         | `var(--foreground)`；app 強制深色，`.dark` 下為 `oklch(0.985 0 0)` | 近白 → 近白，肉眼不可辨                                                                                       |
| VS Code 擴充 | ✗                         | `#fafafa`                                                          | `#ffffff` → `#fafafa`，肉眼不可辨                                                                             |
| Odin         | ✓                         | —                                                                  | props 層勝出，無變化                                                                                          |
| Sindri       | ✓                         | —                                                                  | props 層勝出，無變化                                                                                          |
| embed        | ✓                         | —                                                                  | props 層勝出，無變化                                                                                          |
| sdk-demo     | ✓                         | —                                                                  | props 層勝出，無變化                                                                                          |

其餘五個復活欄位不造成任何變化，依據為兩項程式碼查證：

1. **`botMessage.backgroundColor` 沒有任何元件拿去畫背景。** 它只在 theme context 內被用來推導 quick-reply / unsent 背景，而那幾處都由 annotations 值的三元判斷把關，default 復活不會觸發。bot 泡泡由 `.text--bot { background: transparent }` 決定。
2. **`chatbot.backgroundColor` / `borderColor` / `userMessage.*` 的 default 與現況同值**：`--asg-color-primary` 是 `#4767eb`，與 `.text--user { background: #4767eb }` 相同；`chatbot.backgroundColor` 的 `var(--asg-color-bg)` 與 `.chatbot_container` 已用的同一個 token 相同。issue #52 把 user 泡泡背景列為風險項時沒有查證這一點。

**讀 `botMessage.color` 的元件不只 `BotMessageText`**（初版稽核漏列）：`references.tsx:29`、`table-template.tsx:175`、`chart-template.tsx:69` 也讀它。三者 CSS 皆為深底白字，在深色消費端無差異；在 Mimir 淺色模式下它們同樣會跟著變深，方向與上表一致。

### 實測（Mimir，最高風險的消費端）

用同一個既有 thread（內容完全相同、無 LLM 變異），只切換 `node_modules` 裡的 SDK：

|                   | 淺色 bot 文字        | inline style                           |
| ----------------- | -------------------- | -------------------------------------- |
| before（0.3.47）  | `rgb(255, 255, 255)` | 無（default 被抹掉，由 SCSS 上色）     |
| after（含本修正） | `rgb(13, 13, 13)`    | `color: var(--asg-color-text-primary)` |

深色模式 before / after 皆為 `rgb(255,255,255)`，無變化。截圖見 `.github/screenshots/pm52-mimir-{light,dark}-{before,after}.png`。

## Execution Log / Change Log

- 2026-08-05: BUILD task created from asgard-sdk-pm#52 (Status: `draft → in-progress`)。
- 2026-08-05: 兩支測試皆確認在修正前失敗（deep-merge 2 條、theme-default-layer 2 條），修正後全過。
- 2026-08-05: 下游稽核初版結論「零視覺差異」**經實測推翻**：Mimir 淺色模式的 bot 回答文字由白轉深，修好了既有的白字白底 bug。稽核表已改寫，並補上 `--asg-color-text-primary` 由 SDK 從 `secondaryColor` 推導這個關鍵事實。
- 2026-08-05: lint / format:check / typecheck / test（core 177 + react 114）/ build:core / build:react 全綠（Status: `in-progress → done`）。
