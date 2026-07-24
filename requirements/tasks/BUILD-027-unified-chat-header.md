# BUILD-027 Unified Chat Heading Bar (ChatHeader)

## Meta

- Task ID: `BUILD-027`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/30`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-022-統一-chat-heading-bar-chatheader.md`
  - Use cases: `UC-040` (版面) · `UC-041` (actions API) · `UC-042` (內建 File Explorer toggle) · `UC-043` (客製三層 + deprecated)
  - Bug closed: `BUG-002` (雙重 title bar)
  - UI authority (pinned prototype @ `7ad38e0`): `references/asgard-chat-kit-prototype/src/ChatHeader.tsx` + `src/ChannelTitle.tsx` + `src/demo/DemoApp.tsx`
- Complexity: `L`

---

## Brief

Collapse the SDK chat view's two independent top bars — the legacy bot-name `ChatbotHeader` (A: `title` + reset / close / `customActions`, replaceable via `renderHeader`) and the F-016/F-017 `ChannelTitle` row (B: channel title, unconditionally rendered) — into **one** `ChatHeader` that carries three kinds of info in a single row: bot identity, channel title, and a first-class right-side `actions[]` API. This closes **BUG-002** (the double title bar, because B currently renders on top of A and is not affected by `renderHeader`). The channel title stays F-016 first-class (metadata seed + `asgard.channel.title.update` live update + 200ms fade). The built-in File Explorer toggle (F-021) becomes one of the `actions`, no longer a separate folder-toggle row. Customization stays a continuous three-layer ladder (`actions` → `renderTitle` → `renderHeader` → `hidden`), and `ChannelTitle` is kept as a `@deprecated` thin wrapper for backward compatibility. Port the prototype's Tailwind design to this repo's SCSS-module + CSS-variable/theme-token + i18n conventions (as F-017 / F-018 did) — not a line-by-line copy. **react-only**; no core changes; no version bump / publish (release is a separate flow); downstream repo upgrades are phase 2 (out of scope).

**Already exists:**

- `packages/react/src/components/chatbot/chatbot-header/chatbot-header.tsx` — current (A) bot-name header (reset / close / customActions / ProfileIcon).
- `packages/react/src/components/chatbot/channel-title/channel-title.tsx` — current (B) `ChannelTitle` (F-017; reads `channelTitle` + `renderTitle` / `channelTitleHidden` / `untitledLabel`).
- `packages/react/src/components/chatbot/chatbot.tsx` — hosts both bars; owns `title` / `avatar` / `customActions` / `onReset` / `onClose` / `renderHeader` / `renderTitle` / `channelTitleHidden` / `untitledLabel` / `fileExplorer` props + `useFileExplorerController`.
- `packages/react/src/components/chatbot/file-explorer/chatbot-file-explorer.tsx` — `FileExplorerToggle`, `ChatbotFileExplorerAside`; `useFileExplorerController`.
- `packages/react/src/context/asgard-service-context.tsx` — `channelTitle`, `avatar`, `title`, `isResetting`, `resetChannel`, `closeChannel`.
- `packages/react/src/context/asgard-template-context.tsx` — `renderTitle`, `untitledLabel`, `channelTitleHidden`.
- `packages/react/src/i18n.ts` — `t()` catalog (add `header.*` keys for action a11y labels).
- `apps/react-demo/src/app/routes/` + `app.tsx` — demo route registry pattern (e.g. `channel-title-ui`).

---

## Design decisions (backward-compat mapping)

Proposed mapping from today's props to the unified `ChatHeader` (to be confirmed at the plan pause):

1. **Main text = bot, subtitle = channel title.** Chatbot's existing `title` prop (and `annotations.embedConfig.title`) → `ChatHeader.botName` (main line). Service-context `channelTitle` (F-016) → `ChatHeader.title` (subtitle). Preserves today's visual: bot name prominent, channel title beneath. When bot name is blank, channel title becomes the single main line (UC-040).
2. **Default actions preserve today's buttons.** With no consumer override, the header still renders `customActions` + reset (busy while `isResetting`, bound to `resetChannel`) + close (bound to `closeChannel`, honoring `maintainConnectionWhenClosed`); when `fileExplorer='builtin'`, the File Explorer toggle is prepended as an `active`-bound action. New first-class entry point: Chatbot gains `headerActions?: ChatHeaderAction[]` appended after the built-ins.
3. **`renderHeader`** (chatbot-level, `() => ReactNode`) → L3 full-bar takeover; signature widened to optionally receive `{ botName, title, actions, renderDefault }` (old no-arg callers unaffected). Returning `null` hides the bar.
4. **`renderTitle`** (template context) → L2 title-area takeover; signature widened from `{ title, renderDefault }` to `{ botName, title, renderDefault }` (old callers ignore `botName`).
5. **`channelTitleHidden`** → hides the **channel-title text only** (the subtitle when `botName` present; the whole title line when not), keeping the bar + bot name + actions. `hidden` (new) is the whole-bar shortcut.
6. **`ChannelTitle`** stays exported as a `@deprecated` wrapper delegating to `ChatHeader` (title only; old `renderTitle` maps to `renderHeader`).

---

## Relevant Rules

| §    | Rule (summary)                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                                  |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                             |
| §1.3 | No `console.log` left in library code                                                                                        |
| §1.5 | Every timer / subscription has teardown (title fade uses CSS animation, no JS timer preferred)                               |
| §1.6 | `@asgard-js/core` never imports react/DOM; react imports core via public entry only                                          |
| §1.7 | No breaking public-API change without `@deprecated` transition (ChannelTitle → deprecated wrapper; no prop removal)          |
| §2.2 | New public types / components (`ChatHeader`, `ChatHeaderAction`) exported from the package entry with explicit `export type` |
| §3.1 | Exported functions / components declare explicit return types                                                                |
| §3.2 | Shared types centralized; no duplicate interfaces                                                                            |
| §4.1 | React component props fully typed (no `any`)                                                                                 |
| §4.2 | No hardcoded color values — theme via CSS variables / theme tokens (SCSS module, `--asg-color-*`)                            |
| §4.4 | `react` / `react-dom` stay peerDependencies                                                                                  |
| §5   | core and react keep the same version number (no bump in this task)                                                           |
| §6   | Extract repeated logic (≥2×) / duplicate types / repeated JSX (≥3×)                                                          |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                             |
| a11y | Every icon-only action button has an `aria-label` (i18n); `active` → `aria-pressed`; honor `prefers-reduced-motion`          |

---

## Acceptance Criteria

- `R1` (UC-040, BUG-002) When the chat view renders, the system shall show exactly **one** heading bar: with a bot name present, the bot name is the main line and the channel title is a muted, single-line, truncated subtitle; with no bot name, the channel title is the single main line; when the channel title is unnamed the system shall show the `untitledLabel` placeholder (never a stale value). The former separate `ChannelTitle` row + folder-toggle row no longer render. → T2, T4
- `R2` (UC-040, F-016) When an `asgard.channel.title.update` changes the channel title, the corresponding text shall swap with a ~200ms fade-in that is disabled under `prefers-reduced-motion`, still sourced from the F-016 `channelTitle` store. → T2
- `R3` (UC-041) When `actions[]` are provided, the system shall render icon buttons in array order, each supporting `active` (highlight + `aria-pressed`), `busy` (spinner + disabled), `disabled` (dimmed, non-interactive), and `render()` (fully custom cell that keeps its slot). Each standard button exposes an `aria-label` / tooltip from `label`. → T2, T3
- `R4` (UC-041 backward-compat) When no consumer override is given, the default header shall still render `customActions` + reset (busy while `isResetting`, calls `onReset` + `resetChannel`) + close (calls `onClose` + `closeChannel`, honoring `maintainConnectionWhenClosed`), preserving current behavior. → T4
- `R5` (UC-042, F-021) When `fileExplorer='builtin'`, the File Explorer toggle shall appear as a built-in `active`-bound action on the bar (no `renderHeader`/`renderTitle` escape hatch needed), toggling the aside; `fileExplorer='off'` renders no built-in toggle. → T4
- `R6` (UC-043) The three customization layers shall be continuously available: `headerActions` (L1) / `renderTitle` L2 title-area only with signature `{ botName, title, renderDefault }` / `renderHeader` L3 whole-bar takeover returning `null` to hide / `hidden` (and `channelTitleHidden` for the channel-title text only) shortcuts. → T2, T5
- `R7` (UC-043 compat) The package entry shall export `ChatHeader` + `ChatHeaderAction`; `ChannelTitle` shall remain exported as a `@deprecated` thin wrapper delegating to `ChatHeader` (title only; old `renderTitle` → `renderHeader`), so existing consumers do not break. → T3, T6
- `R8` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, `npm run lint:packages`, `npm run format:check`, and exercises a new `/chat-header` react-demo route (http://localhost:4200), the system shall demonstrate all of R1–R6 (bot+subtitle, no-bot single line, actions active/busy/render, File Explorer toggle, renderTitle/renderHeader/hidden, narrow-width truncation) with no build errors; capture a screenshot to `.github/screenshots/`. → T7, T8

---

## Implementation Tasks

- [x] T1 (R3, R7): Define `ChatHeaderAction` + `ChatHeaderProps` types (react; `id` / `icon` / `label` / `onClick` / `active` / `busy` / `disabled` / `render`). Add `header.reset` / `header.close` i18n keys (en/ja/zh) in `packages/react/src/i18n.ts`.
- [x] T2 (R1, R2, R3, R6): Implement `packages/react/src/components/chatbot/chat-header/chat-header.tsx` + `.module.scss` — leading avatar (img / initial / MessageSquare fallback), title area (bot main + channel subtitle, or single line), fade-in via CSS keyframe keyed on title (reduced-motion aware), `actions` row (`ActionButton` incl. spinner / active / disabled / `render`), `renderTitle` / `renderHeader` / `hidden` escape hatches. Theme tokens only, no hardcoded colors, no `<style>` injection (SCSS `@keyframes`).
- [x] T3 (R7): Export `ChatHeader` + `ChatHeaderAction` from `components/chatbot/chat-header/index.ts` → `components/index.ts` → package entry (`export type` for the type).
- [x] T4 (R1, R4, R5): Rewire `chatbot.tsx` — replace the top-level `ChatbotHeader` with `ChatHeader` fed `botName` (from `title`/annotations), `title` (from `channelTitle`), `avatar`, and default `actions` (customActions + reset(busy)/close + builtin File Explorer toggle when `fileExplorer='builtin'`, then `headerActions`); remove the in-thread `ChannelTitle` row + `title_row` folder-toggle; keep the File Explorer aside in `main_row`. Add `headerActions?: ChatHeaderAction[]` prop. Apply to both authenticated and non-authenticated branches.
- [x] T5 (R6): Widen template-context `renderTitle` signature to `{ botName, title, renderDefault }`; wire `channelTitleHidden` to suppress the channel-title text; wire chatbot-level `renderHeader` to the L3 takeover (arg-widened, backward compatible).
- [x] T6 (R7): Convert `channel-title.tsx` `ChannelTitle` into a `@deprecated` wrapper delegating to `ChatHeader` (title only), preserving its current exported shape; keep the export path intact.
- [x] T7 (R8): Add `apps/react-demo/src/app/routes/chat-header/` route (model on `channel-title-ui`) covering all R# states incl. narrow-width; register it in `app.tsx` + the layout nav.
- [x] T8 (R8): Run `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react`; serve react-demo, walk `/chat-header` through R1–R6; screenshot to `.github/screenshots/`.

---

## Coverage

Use Cases:

- `R1` → UC-040 (bot main + channel subtitle / single line / untitled placeholder) + BUG-002 (single bar)
- `R2` → UC-040 + F-016 (title.update 200ms fade, reduced-motion aware)
- `R3` → UC-041 (actions active / busy / disabled / render + a11y label)
- `R4` → UC-041 backward-compat (default reset(busy) + close + customActions preserved)
- `R5` → UC-042 + F-021 (built-in File Explorer toggle as an action)
- `R6` → UC-043 (headerActions L1 / renderTitle L2 / renderHeader L3 / hidden + channelTitleHidden)
- `R7` → UC-043 compat (ChannelTitle → @deprecated wrapper; ChatHeader + ChatHeaderAction exported)
- `R8` → build + `/chat-header` react-demo browser smoke (all R# + narrow-width truncation)

Files:

- `packages/react/src/components/chatbot/chat-header/chat-header.tsx` (new — pure unified header + `ChatHeaderAction`/`ChatHeaderProps`/renderer arg types)
- `packages/react/src/components/chatbot/chat-header/chat-header.module.scss` (new — ported design, theme tokens, SCSS `@keyframes` fade + spinner)
- `packages/react/src/components/chatbot/chat-header/chat-header-host.tsx` (new — internal context→props bridge, builds default actions)
- `packages/react/src/components/chatbot/chat-header/icons.tsx` (new — inline MessageSquare / Refresh / X / Loader glyphs)
- `packages/react/src/components/chatbot/chat-header/index.ts` (new — public barrel: ChatHeader + types)
- `packages/react/src/components/chatbot/chatbot.tsx` (rewired to `ChatHeaderHost`; removed in-thread ChannelTitle row + folder-toggle; added `headerActions` prop)
- `packages/react/src/components/chatbot/chatbot.module.scss` (removed unused `title_row` / `title_toggle`)
- `packages/react/src/components/chatbot/channel-title/channel-title.tsx` (now a `@deprecated` wrapper delegating to `ChatHeader`)
- `packages/react/src/components/chatbot/channel-title/channel-title.module.scss` (deleted — made unused)
- `packages/react/src/components/chatbot/chatbot-header/` (deleted — dead after the unify; was never exported)
- `packages/react/src/components/index.ts` (export `chat-header`)
- `packages/react/src/context/asgard-template-context.tsx` (widen `ChannelTitleRendererProps` with `botName`)
- `packages/react/src/i18n.ts` (add `header.reset` / `header.close` / `header.fileExplorer`, en/ja/zh)
- `apps/react-demo/src/app/routes/chat-header/` (new demo route + scss + index)
- `apps/react-demo/src/app/app.tsx` + `components/layout/layout.tsx` (register `/chat-header`)

---

## Behavior notes (intended changes under F-022)

- The chat view now renders **one** heading bar (BUG-002 closed). The former standalone `ChatbotHeader` (never a public export) is removed; the F-017 `ChannelTitle` row is folded into the bar as the subtitle / single line.
- `title` prop now feeds the bar's **bot main line** (was the sole bot-name header); `channelTitle` is the subtitle. The legacy `'Bot'` literal fallback is dropped — a blank bot name lets the channel title become the main line (UC-040).
- Template-context `renderTitle` now takes over the **title text area only** (signature widened with `botName`); the deprecated `ChannelTitle` wrapper maps the old whole-row `renderTitle` to `renderHeader` (UC-043).

---

## Execution Log / Change Log

- 2026-07-24: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/30 (Status: `draft`).
- 2026-07-24: Plan confirmed (3 backward-compat mappings accepted); branch `feat/30-unified-chat-header` (Status: `draft → ready → in-progress`).
- 2026-07-24: Implemented ChatHeader + host + deprecated ChannelTitle wrapper + demo route. `npm run build:core && npm run build:react` ✅, `npm run lint:packages` ✅ (0 errors), `npm run format:check` ✅ (changed files), `npm run test:react` ✅ (25/25). Browser smoke on `/chat-header` (R1–R6 + narrow truncate) + regression on `/custom-header` + `/channel-title-ui` — single bar everywhere, 0 console errors; screenshots in `.github/screenshots/f022-*`. (Status: `in-progress → done`).
