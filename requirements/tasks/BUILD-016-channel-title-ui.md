# BUILD-016 Channel Title UI + custom renderer

## Meta

- Task ID: `BUILD-016`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/17`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-017-channel-title-顯示-ui-與客製-renderer.md` (+ `use-cases/UC-028`). **UI authority = pinned prototype** `asgard-chat-kit-prototype @ 5480a67` (`docs/superpowers/specs/2026-07-13-channel-title-design.md` + `src/ChannelTitle.tsx`). Depends on F-016.
- Complexity: `M`

---

## Brief

Render the channel title (F-016's `channelTitle$` current title) as a header row at the **top of the chat thread**, per the pinned prototype `ChannelTitle`. Today the SDK header only has the static `title` prop (bot name, fallback `'Bot'`) — there is no dynamic channel-title display. This is the display half of F-016 (which is the data layer).

**Prototype-authoritative UI:** a header row (56px, `surface` bg + `border-b` seam) with a muted Lucide `MessageSquare` icon + a single-line truncated title; unnamed (`null`) → muted placeholder (default `新對話`, overridable via `untitledLabel`) — never a stale value; a 200ms ease-out fade-in when the title string changes (honor `prefers-reduced-motion`); purely neutral, no accent. **Semantically separate from the static `title` (bot name)** — do not confuse placement (the bot-name `ChatbotHeader` stays; this is a new thread-top row below it).

**Customization / hide** (aligned with the SDK's `renderHeader` slot + `AsgardTemplateContext` `renderDefaultContent` escape-hatch convention): `renderTitle({ title, renderDefault })` fully replaces the default row (own icon / actions / breadcrumbs); returning `null`, or the `hidden` shortcut, removes the row entirely. Consumers may also ignore this component and subscribe `channelTitle$` to render the title outside the Chatbot (F-016 contract).

**Scope this cycle (F-017):** the `ChannelTitle` component (default renderer + `renderTitle` + `hidden` + `untitledLabel`) wired to F-016's `channelTitle` at the thread top. **Not this cycle:** editing the title (no backend API; read-only); the metadata seed timing (F-015).

**Already exists:** F-016's `channelTitle` on the service context + `channelTitle$` store; `ChatbotProps extends AsgardTemplateContextValue` (new template slots become Chatbot props); the `renderToolCallGroup` / `renderMessageContent` custom-render slot pattern in `AsgardTemplateContext`; inline lucide-0.487.0 icons (F-004/F-007 practice). `MessageSquare` (0.487.0): `M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z`.

---

## Relevant Rules

| §    | Rule (summary)                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — typed props (`title: string \| null`, `renderTitle` signature)                                 |
| §4.1 | Component props fully typed                                                                               |
| §4.2 | Theming via CSS variables / tokens — surface bg / border / muted / foreground; no ad-hoc hex accent       |
| §4.4 | `MessageSquare` inlined byte-identical to prototype lucide-react 0.487.0                                  |
| §4.3 | New component follows the existing `components/chatbot/*` structure + barrel export                       |
| §6   | Reuse F-016's `channelTitle` (no second title source); align custom-render with the existing slot pattern |

---

## Acceptance Criteria

- `R1` (Display) the chat thread top shows the current channel title (bound to F-016's `channelTitle`), rendered per the pinned prototype `ChannelTitle` (56px row, `MessageSquare` muted icon, single-line truncate). → T2, T3
- `R2` (Named / unnamed) a title → foreground single-line truncate + full name on hover (`title=` attr); unnamed (`null` / empty) → muted placeholder (default `新對話`, overridable via `untitledLabel`) — no stale value. → T2
- `R3` (Fade-in) a title change (from a `title.update`) fades in (200ms ease-out, key-swap); `prefers-reduced-motion` → no animation. → T2
- `R4` (Custom / hide) `renderTitle({ title, renderDefault })` replaces the default row; returning `null` (or the `hidden` shortcut) hides it entirely; `renderDefault()` lets a custom renderer fall back to the default. → T2, T3
- `R5` (Separation) the row is placed at the thread top, distinct from the static bot-name `ChatbotHeader`; both coexist without conflict. → T3
- `R6` (Smoke) build green; a scoped `/channel-title-ui` demo cycling the states (unnamed placeholder → seeded title → live update fade-in → custom `renderTitle` → hidden); browser-verify; screenshot to `.github/screenshots/f-017/`. → T4, T5

---

## Implementation Tasks

- [x] T1 (R4): react `AsgardTemplateContext` — added `renderTitle` / `untitledLabel` / `channelTitleHidden` to `AsgardTemplateContextValue` (→ Chatbot props via `extends`) + `ChannelTitleRendererProps` type + provider passthrough + defaults.
- [x] T2 (R1, R2, R3, R4): react new `packages/react/src/components/chatbot/channel-title/` — reads `channelTitle` from `useAsgardContext()` + `renderTitle`/`untitledLabel`/`channelTitleHidden` from `useAsgardTemplateContext()`; default row per the prototype (inline `MessageSquare` 0.487.0 byte-identical, 56px surface bg + border-b, truncate 15px/500, muted placeholder `新對話` overridable via `untitledLabel`, `title=` hover, key-swap 200ms ease-out fade-in via `@keyframes channel_title_in` + reduced-motion off); `channelTitleHidden` → null; `renderTitle` replaces default (returning null → null). Semantic-token colors, no hex accent.
- [x] T3 (R1, R5): react `chatbot.tsx` — `<ChannelTitle />` rendered at the top of the authenticated `renderContent` branch, before `<ChatbotBody />`, inside `AsgardTemplateContextProvider`; new template props passed through; the F-016 `channelTitle` seed prop plumbed to `AsgardServiceContextProvider`. Bot-name `ChatbotHeader` unchanged. Verified: the title row sits below the bot-name header (`orderOk: true`).
- [x] T4 (R6): scoped `/channel-title-ui` route — a `<Chatbot>` (preview) driven by `channelTitle` / `renderTitle` / `channelTitleHidden` with a 5-state selector (未命名 / 命名 / 換新 / 客製 / 隱藏).
- [x] T5 (R6): browser-verified all states — named (foreground white, 56px, MessageSquare path byte-match, hover attr), untitled (muted `新對話`, no hover attr), 換新 (title changes with `animationName: channel_title_in` 0.2s ease-out), custom (default row replaced by `#` + 分享), hidden (no row, bot-name header intact). Screenshot `.github/screenshots/f-017/channel-title-ui.png`.
- [x] T6: `npm run lint:packages` ✅ + `npm run format:check` ✅ + `npm run build:core && npm run build:react` ✅.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6 (all via the `/channel-title-ui` demo — React-only display, no core change → no Vitest)
Files:

- `packages/react/src/context/asgard-template-context.tsx` (react) — `renderTitle` / `untitledLabel` / `channelTitleHidden` slots + `ChannelTitleRendererProps`
- `packages/react/src/components/chatbot/channel-title/channel-title.tsx` (react) — new component
- `packages/react/src/components/chatbot/channel-title/channel-title.module.scss` + `index.ts` (react)
- `packages/react/src/components/chatbot/chatbot.tsx` (react) — render `<ChannelTitle />` at the thread top + pass the new props + plumb the `channelTitle` seed
- `apps/react-demo/src/app/routes/channel-title-ui/*` (demo) — scoped route
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` (demo) — registration

---

## Execution Log / Change Log

- 2026-07-15: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/17 (F-017 + UC-028; UI authority = pinned prototype @ `5480a67`) (Status: `draft`).
- 2026-07-15: Implemented T1–T6. React-only: new `<ChannelTitle>` (thread-top row per the pinned prototype — inline MessageSquare 0.487.0, surface/border-b, truncate, muted placeholder, 200ms ease-out fade-in + reduced-motion); `renderTitle`/`untitledLabel`/`channelTitleHidden` slots on `AsgardTemplateContext` (→ Chatbot props); placed at the top of `renderContent` below the bot-name header; plumbed the F-016 `channelTitle` seed to the Chatbot. Browser-verified all 5 states (named/untitled/updated-fade-in/custom/hidden) + separation from the bot-name header. lint + format + build green (no core change → no Vitest) (Status: `done`).
