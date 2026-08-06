# BUILD-049 Stop two theme defaults from self-referencing and erasing the palette

## Meta

- Task ID: `BUILD-049`
- Status: `done`
- Issue: 無 GitHub issue —— 由 BUILD-047 的 PR 截圖看出（react-demo 的機器人文字幾乎不可讀）後追查到的既有缺陷。
- Source spec: 無 PM spec 檔；缺陷描述與判準在本檔 Brief。
- Complexity: `S`

---

## Brief

`defaultAsgardThemeContextValue.chatbot` 的兩個 default 寫成指向自己的 CSS 變數：

```ts
backgroundColor: 'var(--asg-color-bg)',
borderColor: 'var(--asg-color-border)',
```

這兩個 token 由 SCSS palette 在 `.chatbot_root` 上宣告好了（`styles/palette/_palette.scss`：`--asg-color-bg: #141414`、`--asg-color-border: #434343`）。但 theme context 的 `themeVars` 會把 `chatbot.backgroundColor` **寫回同一顆元素**（`themeVars['--asg-color-bg'] = effectiveBg`）。於是當消費端沒有設定這兩個欄位時，同一顆元素上出現 `--asg-color-bg: var(--asg-color-bg)` —— 自我指涉，在 CSS 規範下是 invalid at computed-value time，該 property 變成 guaranteed-invalid，**palette 原本的好值就此被抹掉**。

實測證據：

- Mimir（線上跑的版本）：`--asg-color-border` 的 raw inline value 就是字串 `var(--asg-color-border)`。
- react-demo（完全沒傳顏色的消費端）：`--asg-color-bg` computed 為空字串，`.chatbot_container` 的 `background-color` 是 `rgba(0, 0, 0, 0)`，而 `.text { color: white }` 讓機器人文字白字打在 demo 頁面的淺色底上，幾乎不可讀。

連帶效應：`--asg-color-surface` 由 `lighter(bg)` 推導，對非 hex 輸入會組出 `color-mix(in srgb, var(--asg-color-bg) 92%, #fff)`，所以一個壞掉的 default 連 surface 層一起污染。

**範圍界定**：這個物件裡其他的 `var(--asg-*)` default（`botMessage.color` 用 `--asg-color-text-primary`、`botMessage.backgroundColor` 用 `--asg-color-secondary`、placeholder 用 `--asg-color-text-placeholder`、`borderRadius` 用 `--asg-radius-md`）**都不是自我指涉**——它們指向的是別的 token，palette 也都有定義，解析正常。只有上面兩個是 cycle。

**Already exists:** `styles/palette/_palette.scss` 已宣告完整的語意色階；多數 SCSS 消費點已寫 `var(--asg-color-border, #434343)` 這類 fallback（fallback 在 guaranteed-invalid 時會生效，所以那些表面先前並未壞掉）。

---

## Relevant Rules

| §    | Rule (summary)                                                    |
| ---- | ----------------------------------------------------------------- |
| §1.7 | No breaking public-API change without `@deprecated` transition    |
| §4.2 | No hardcoded color values in components — theme via CSS variables |
| §7   | No dead commented code, no untracked TODO / FIXME                 |

---

## Acceptance Criteria

- `R1` 當消費端未設定 `chatbot.backgroundColor` 時，`--asg-color-bg` 應解析為 palette 的 `#141414`，`.chatbot_container` 的背景不得為透明。→ T1, T3
- `R2` 當消費端未設定 `chatbot.borderColor` 時，`--asg-color-border` 應解析為 palette 的 `#434343`，不得為自我指涉字串。→ T1, T3
- `R3` 當消費端（或 bot provider annotations）有設定這兩個欄位時，其值仍應勝出，畫面不得改變。→ T3
- `R4` (Smoke check) `lint:packages`、`format:check`、`typecheck:packages`、`build:core && build:react`、`test:packages` 全過。→ T2

---

## Implementation Tasks

- [x] T1: `asgard-theme-context.tsx` —— 移除 `chatbot.backgroundColor` 與 `chatbot.borderColor` 這兩個 default，並在原處寫下成因（同元素自我指涉、palette 被抹掉、surface 連帶污染、其餘 default 為何不受影響）。
- [x] T2: `lint:packages` + `format:check` + `typecheck:packages` + `build:core && build:react` + `test:packages`。
- [x] T3: 三個消費端實測 —— react-demo（什麼都沒設）、Mimir（annotations 有設 bg、沒設 border）、Sindri。

---

## Coverage

Use Cases: R1, R2, R3, R4

Files:

- `packages/react/src/context/asgard-theme-context.tsx` (react) — 移除兩個 default + 成因註解

**刻意不改**：沒有為 SCSS 補任何 fallback。初版曾在 25 處加上 `var(--asg-color-bg, #141414)` 這類 fallback，後來查明 palette 本來就宣告了同樣的值，那些 fallback 只是重複、且會在日後 palette 調整時把問題蓋掉，已全數撤回。

---

## 實測（T3）

| 消費端         | 情境                         | Before                                                    | After                                                              |
| -------------- | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| **react-demo** | 完全不傳顏色                 | `--asg-color-bg` 空字串、背景 `rgba(0,0,0,0)`、白字不可讀 | `#141414`、背景 `rgb(20,20,20)`、白字清楚                          |
| **Mimir**      | annotations 有 bg、無 border | bg `#1f1f1f`；border raw = `var(--asg-color-border)`      | bg `#1f1f1f`（**不變**）；border `#434343`                         |
| **Sindri**     | 未設這兩個欄位               | —                                                         | bg `#141414`、border `#434343`；畫面無可見變化（app 本身即深色底） |

R3 由 Mimir 佐證：annotations 供給的 `#1f1f1f` 在改動後仍勝出，`containerBg` 前後皆為 `rgb(31, 31, 31)`。

多數 SCSS 消費點本來就寫了 fallback，在 guaranteed-invalid 時 fallback 會生效，所以那些表面先前並未壞掉——真正受害的是**沒有 fallback 的 `.chatbot_container` 背景**，也就是 demo 那個症狀。

截圖：`.github/screenshots/theme-token-demo-after.png`。

---

## Execution Log / Change Log

- 2026-08-06: 建立（Status: `draft → in-progress`）。起點是 BUILD-047 PR 截圖裡「demo 的機器人文字看不見」。
- 2026-08-06: 初版判斷為「語意 token 沒有 default」，據此在 25 處 SCSS 補 fallback；隨後查到 `styles/palette/_palette.scss` 本來就宣告了全套語意色，**該判斷不成立**，fallback 全數撤回，改為只移除兩個自我指涉的 default。
- 2026-08-06: react-demo / Mimir / Sindri 實測完成；lint / format:check / typecheck / test（core 177 + react 114）/ build 全綠。
- 2026-08-06: PR #398 合併進 `main`（merge commit `e8b76649`），隨 0.3.50 出貨（Status: `in-progress → done`）。
