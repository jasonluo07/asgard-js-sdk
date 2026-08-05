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
- `R5` (Downstream) For each of the seven consumers, the change shall not alter any rendered surface; every field they leave unset shall resolve to a value visually identical to what SCSS paints today. → T4
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

七個消費端傳給 `<Chatbot theme>` 的內容，對照六個復活欄位：

| 消費端       | 未設的欄位                                                     | 復活後的解析值        | 目前由誰上色                                                 | 視覺差異   |
| ------------ | -------------------------------------------------------------- | --------------------- | ------------------------------------------------------------ | ---------- |
| Heimdall     | `botMessage.color` / `botMessage.backgroundColor`              | `#ffffff` / `#585858` | `.text { color: white }`；bot 泡泡 `background: transparent` | 無（見下） |
| Mimir        | `chatbot.borderColor`、`botMessage.color` / `.backgroundColor` | 同上                  | 同上                                                         | 無         |
| Odin         | 無（六個全設）                                                 | —                     | —                                                            | 無         |
| Sindri       | `chatbot.backgroundColor`                                      | `var(--asg-color-bg)` | `.chatbot_container` 已用同一個 token 上色                   | 無         |
| VS Code 擴充 | `botMessage.color` / `.backgroundColor`                        | `#ffffff` / `#585858` | 同 Heimdall                                                  | 無         |
| embed        | 無（六個全設，且空字串會被 SDK 的 truthy 檢查跳過）            | —                     | —                                                            | 無         |
| sdk-demo     | 無（六個全設）                                                 | —                     | —                                                            | 無         |

判定依據，兩點都是查程式碼而非推論：

1. **`botMessage.backgroundColor` 沒有任何元件拿去畫背景。** 它只在 `asgard-theme-context.tsx` 內被用來推導 `unsentBackgroundColor` / `quickReplyBackgroundColor`，而那幾處都由 annotations 值的三元判斷把關（`themeFromAnnotations.botMessage?.backgroundColor ? … : …`），default 復活不會觸發。bot 泡泡本身由 `.text--bot { background: transparent }` 決定，`BotMessageText` 的 inline style 只寫 `color`。
2. **`botMessage.color` 的 default 與 SCSS 同值。** `--asg-color-text-primary` 在建置產物是 `#ffffff`，`.text { color: white }` 等值；`--asg-color-primary` 是 `#4767eb`，與 `.text--user { background: #4767eb }` 完全相同。**issue 把 user 泡泡背景列為風險項時沒有查證這一點**，實際上兩者同色。

**殘留風險（已知、可接受）**：若某個消費端覆寫了 palette token（例如自己定義 `--asg-color-primary`）卻不設 props theme，修好後那條 token 路徑會開始生效——那正是這個 bug 一直阻斷的功能。七個消費端目前都走 props theme，沒有這種用法。

---

## Execution Log / Change Log

- 2026-08-05: BUILD task created from asgard-sdk-pm#52 (Status: `draft → in-progress`)。
- 2026-08-05: 兩支測試皆確認在修正前失敗（deep-merge 2 條、theme-default-layer 2 條），修正後全過。
- 2026-08-05: 下游稽核完成，七個消費端零視覺差異；並更正 issue 對 user 泡泡背景的風險評估。
- 2026-08-05: lint / format:check / typecheck / test（core 177 + react 114）/ build:core / build:react 全綠（Status: `in-progress → done`）。
