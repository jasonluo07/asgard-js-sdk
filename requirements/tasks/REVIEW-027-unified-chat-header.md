# REVIEW-027 Unified Chat Heading Bar (ChatHeader)

## Meta

- Task ID: `REVIEW-027`
- Status: `done`
- BUILD Task: `BUILD-027`
- Reviewed commit: `working tree (uncommitted) on feat/30-unified-chat-header` (base `5f2d28f`)
- Reviewed branch: `feat/30-unified-chat-header`

---

## §1 Static Code Review

Scanned BUILD-027 `## Coverage` files against `FRONTEND_RULE_COMMON.md`.

### §1.1 Checklist

| Check item                                                                  | Rule      | Result                                                                                                               |
| --------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| SVG path strings inlined into components (no `.svg?react` deep dep)         | §1.1      | ✅                                                                                                                   |
| Hardcoded color values (hex / rgba / oklch literal) in `.ts`/`.tsx`         | §1.3      | ✅ (colors live in SCSS as `var(--asg-color-*, #fallback)`, matching channel-title / file-explorer convention)       |
| `<style>` tag injected into JSX (fade must be SCSS `@keyframes`)            | §1.4      | ✅ (SCSS `@keyframes chat_header_fade` / `chat_header_spin`)                                                         |
| No `as any`; no `eslint-disable` / `@ts-ignore`                             | §4.1 §4.2 | ✅                                                                                                                   |
| Shared types centralized; no duplicate interfaces                           | §4.3 §4.4 | ✅ (`ChatHeaderAction`/`ChatHeaderProps` in one place; template `ChannelTitleRendererProps` widened, not duplicated) |
| All user-facing text (action a11y labels) via `t()` catalog (en/ja/zh)      | §5.3      | ✅ (`header.reset` / `header.close` / `header.fileExplorer`)                                                         |
| Repeated JSX (≥3×) / logic (≥2×) extracted                                  | §6        | ✅ (`Avatar` / `ActionButton` sub-components; default actions built once in the host)                                |
| No `console.log`                                                            | §7        | ✅                                                                                                                   |
| No `setTimeout` mock delays                                                 | §7        | ✅                                                                                                                   |
| No untracked TODO / FIXME                                                   | §7        | ✅                                                                                                                   |
| `ChannelTitle` kept as `@deprecated` wrapper (no public-API removal)        | §1.7      | ✅ (delegates to `ChatHeader`; export path intact)                                                                   |
| icon-only action buttons have `aria-label`; `active` → `aria-pressed`       | a11y      | ✅                                                                                                                   |
| Package boundary: react does not import `core/src`; core untouched (no DOM) | §1.6      | ✅ (react-only change)                                                                                               |

### §1.2 Mechanical Grep

Run per coverage file (system `grep`):

```
== §1.3 hex/rgba/oklch in JS ==   (clean)
== §1.4 <style> injection ==       (clean)
== §4.1 as any ==                  (clean)
== §4.2 eslint-disable/ts-ignore == (clean)
== §7 console.log ==               (clean)
== §7 setTimeout ==                (clean)
== §7 TODO/FIXME ==                (clean)
```

### §1.3 TypeScript and Lint

```
build (type gate):  npm run build:core && npm run build:react → PASS (both built, dts emitted, no type errors)
lint:               npm run lint:packages → PASS (0 errors; 1 pre-existing warning in file-view.tsx, unrelated)
format:             npm run format:check (changed files) → PASS
test:               npm run test:react → PASS (25/25)
tsc --noEmit -p tsconfig.lib.json → 31× TS6305 only (composite project-reference build-info artifacts; NOT type errors — none reference any changed file). The repo's real type gate is the vite build above.
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked ✅
- [x] No ❌ violations
- [x] §1.2 grep commands run, output pasted (all clean)
- [x] Type gate (vite build) — no TypeScript errors
- [x] `npm run lint:packages` — 0 errors

---

## §3 Functional Validation

No e2e spec exists for the new route → validated each R# manually in the browser (`npm run serve:react-demo`, http://localhost:4200, `/chat-header`) at 1440px; narrow panel at 360px. Regression pass on `/custom-header` + `/channel-title-ui`.

### R# Result Matrix

| R#  | Description                                                        | Result | Note                                                                                                                                                                            |
| --- | ------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Single bar; bot main + channel subtitle / single line / untitled   | Pass   | `f022-chat-header-bot-subtitle` / `-nobot` (fallback chat icon + single line) / `-untitled` (「新對話」muted placeholder). One bar in every state — BUG-002 closed.             |
| R2  | title.update → ~200ms fade, reduced-motion aware                   | Pass   | CSS `@keyframes` keyed on title value (same proven pattern as F-017); reduced-motion `animation: none`.                                                                         |
| R3  | actions active / busy / disabled / render()                        | Pass   | `f022-chat-header-actions`: star (active toggle), busy spinner, blue「3」render badge.                                                                                          |
| R4  | default reset(busy) + close + customActions preserved              | Pass   | reset + close present in every mode; reset shows busy spinner while `isResetting`.                                                                                              |
| R5  | builtin File Explorer toggle as action; off → none                 | Pass   | `f022-chat-header-file-explorer`: folder-tree toggle is the leftmost action; `fileExplorer='off'` renders none.                                                                 |
| R6  | renderTitle L2 / renderHeader L3 (null hides) / channelTitleHidden | Pass   | `f022-chat-header-rendertitle-l2` (title area only, avatar+actions kept), `-renderheader-l3` (whole bar replaced), `-channeltitlehidden` (subtitle gone, bar+bot+actions kept). |
| R7  | ChannelTitle deprecated wrapper works; exports present             | Pass   | `/channel-title-ui` (drives Chatbot `renderTitle`/`channelTitleHidden`) renders the unified bar with no regression; `ChatHeader` + `ChatHeaderAction` exported from entry.      |
| R8  | build + browser smoke; narrow-width truncation                     | Pass   | build/lint/format/test green; 360px narrow panel truncates bot + subtitle without pushing actions. 0 console errors (2 pre-existing React Router future-flag warnings only).    |

### §3.1 Acceptance

- [x] All R# executed (static read + browser operation + boundary conditions)
- [x] Each R# Pass
- [x] Narrow-width (360px) truncation confirmed
- [x] Backward-compat regression confirmed (`/custom-header` renderHeader, `/channel-title-ui` renderTitle/channelTitleHidden)

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- The F-017 `/channel-title-ui` demo's descriptive copy still says the title sits「bot 名稱 header 之下」, which no longer matches the unified single bar. Functionally correct; copy is stale. Out of scope for this task (different route's descriptive text) — left untouched per the precise-change rule; note for a future demo-copy pass.

---

## Execution Log

- 2026-07-24: REVIEW task created, paired with BUILD-027 (Status: `draft`).
- 2026-07-24: §1 static review — 13/13 ✅, all mechanical greps clean, type gate (vite build) + lint:packages + test:react green (Status: `draft → in-progress`).
- 2026-07-24: §3 functional — R1–R8 all Pass (browser smoke on `/chat-header` + regression on `/custom-header` + `/channel-title-ui`); 0 BLOCKERs, 1 Minor (out-of-scope demo copy) (Status: `in-progress → done`).
