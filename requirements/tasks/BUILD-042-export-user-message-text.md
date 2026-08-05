# BUILD-042 Export the user text content renderer (`UserMessageText`)

## Meta

- Task ID: `BUILD-042`
- Status: `done`
- Issue: https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/53
- Source spec: — (no tracking spec exists for this issue; `tracking/asgard-js-sdk/{bugs,features,use-cases,tasks}/` @ current submodule pin has nothing for it. The issue body is the spec: it carries the root cause, DOM/measurement evidence, and a preferred fix (方案 1).)
- Complexity: `S`

---

## Brief

`renderMessageContent` replaces the **whole message body**, so a consumer that customizes a user message
(e.g. rendering a leading `@mention` as a chip) loses the entire user shell: the `TemplateBox type="user"`
right-alignment, the `.text--user` bubble (background / padding / radius / 75% cap), and `Time`. The bot side
already solved this in BUILD-026 by exporting `BotMessageText` — the chrome-free themed content wrapper — but
the user side has no counterpart, so its bubble is only reachable as an internal composition inside
`TextTemplate`. Measured downstream: Sindri's user messages with a mention render full-width, transparent,
left-aligned — visually indistinguishable from a bot message.

This task extracts the user text content into **`UserMessageText`** (symmetric to `BotMessageText`, but with
`children: ReactNode` — the entire point of customizing a user message is to pass JSX), has `TextTemplate`
consume it (rendered output unchanged → no regression), and exports it from the package entry. It also
corrects the `MessageContainer` doc comment, which claims a "bot message layout" while the implementation has
always branched on `message.type` and returns a `TemplateBox type="user"` for user messages — the wrong
comment is why a consumer has no reason to wrap user content with it.

**Already exists:** `text-template/bot-message-text.tsx` (`BotMessageText`, the pattern to mirror),
`text-template/text-template.tsx:42-55` (the user branch to refactor), `text-template.module.scss`
(`.text` + `.text--user`), `context/asgard-theme-context` (`theme.userMessage.{color,backgroundColor}`),
`templates/template-box` (`TemplateBox`, already exported), the `renderMessageContent` seam in
`chatbot-body/conversation-message-renderer.tsx`, and the `composed-bot-text` react-demo route (BUILD-026's
offline smoke-check harness, extended here for a user row).

**Explicitly out of scope:** the alternative 方案 2 as a _behavior_ change
(`MessageContainer` already returns a user shell — only its comment was wrong), non-TEXT user message types
(`UserImageTemplate` still self-draws), any Sindri-side change (separate repo), and npm publish / version
bump / tag.

---

## Relevant Rules

| §    | Rule (summary)                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — `UserMessageText` props and the theme style are precisely typed                              |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                        |
| §1.7 | No breaking public-API change — pure addition + an internal refactor with identical rendered output     |
| §2.2 | The new component is exported from the package entry with an explicit `export type` for its props       |
| §3.1 | `UserMessageText` declares an explicit return type                                                      |
| §4.1 | Props fully typed (no `any`)                                                                            |
| §4.2 | No hardcoded colors — user color / background come from theme context, as the current user branch does  |
| §6   | Extract the user content once; remove the now-dead `'user'` case left in `TextTemplate`'s `styles` memo |
| §7   | No dead commented code; no stale doc comment left describing behavior the code does not have            |

---

## Acceptance Criteria

EARS form. Each criterion maps to one or more Implementation Tasks.

- `R1` When `@asgard-js/react` is imported, `UserMessageText` is exported from the package entry with an
  explicit props type whose `children` is `ReactNode`, and it renders the user text content — the
  `.text .text--user` bubble carrying the theme-derived `color` / `backgroundColor` — with **no**
  `<TemplateBox>`, **no** `<Time>`, and no outer margin. → T1, T3
- `R2` When a user TEXT message renders through the default `<Chatbot>` path, its rendered output is
  unchanged from before the refactor — same `TemplateBox type="user" direction="horizontal"` wrapper with
  the same `asgard-text-template--user` class, same `.text` + `.text--user` bubble, same theme-derived
  color / background, and `Time` still rendered by `TextTemplate`. → T2
- `R3` When a consumer returns `<TemplateBox type="user" direction="horizontal"><UserMessageText>…JSX…</UserMessageText><Time time={…} /></TemplateBox>`
  from `renderMessageContent`, the row shall be visually indistinguishable from the default user row apart
  from the intentionally customized content — right-aligned, bubble background, `8px 12px` padding, `8px`
  radius with a flat top-right corner, `75%` max-width, and the same timestamp — and arbitrary JSX children
  shall render inside the bubble. → T1, T5, T7
- `R4` When a consumer reads the `MessageContainer` prop docs (`MessageContentRendererProps` in the
  published `.d.ts`), the comment shall state that the returned shell matches `message.type` (bot shell for
  bot, right-aligned user shell for user, children passed through otherwise), instead of claiming a bot-only
  layout. → T4
- `R5` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and opens the
  react-demo `/composed-bot-text` route (`npm run serve:react-demo`, http://localhost:4200), both the
  default and the self-composed user rows shall render as right-aligned themed bubbles with matching
  geometry, the bot rows shall be unchanged, with no build errors and no console errors. → T6
- `R6` When `@asgard-js/react` is imported, `Time` is exported from the package entry together with an
  exported `TimeProps`, so a consumer composing its own row can render the same timestamp the default rows
  show (same `formatTime` output, same `asgard-time` class, same `template.time.style` color) instead of
  re-implementing it. Passing no `time` still renders nothing. → T7

---

## Implementation Tasks

Run in order; each maps to the R# it satisfies.

- [x] T1 (R1, R3): Add `packages/react/src/components/templates/text-template/user-message-text.tsx` —
      exported `UserMessageTextProps { children: ReactNode; className?: string }`, explicit `ReactNode`
      return; read theme via `useAsgardThemeContext`, apply
      `{ color: theme?.userMessage?.color, backgroundColor: theme?.userMessage?.backgroundColor }`; render
      `<div className={clsx(classes.text, classes['text--user'], className)} style={style}>{children}</div>`
      reusing the existing `text-template.module.scss`. Doc comment mirrors `BotMessageText`'s and states
      that `Time` is the consumer's responsibility.
- [x] T2 (R2): In `text-template.tsx`, replace the user branch's inner themed `div` with
      `<UserMessageText>{message.text}</UserMessageText>`; keep the surrounding `TemplateBox` and `Time`
      exactly as-is; remove the now-dead `'user'` case from the `styles` memo (it then serves only the
      `tool-call` path) and any import left unused by the change.
- [x] T3 (R1): Export `UserMessageText` (+ `UserMessageTextProps`) from
      `templates/text-template/index.ts` (flows through `templates → components → package root`).
- [x] T4 (R4): Correct the `MessageContainer` doc comment on `MessageContentRendererProps`
      (`packages/react/src/context/asgard-template-context.tsx`) and the matching inline comment in
      `chatbot-body/conversation-message-renderer.tsx` to describe the actual `message.type`-dependent shell.
- [x] T5 (R3): Extend the react-demo `composed-bot-text` route with a user TEXT message in `initMessages`
      and a composed-user branch in the renderer that returns
      `TemplateBox type="user"` + `UserMessageText` with a JSX child (a chip-like span plus text), so the
      composed vs. default comparison covers the user row too.
- [x] T7 (R3, R6): Export `Time` — mark `TimeProps` as `export interface` in
      `templates/time/time.tsx`, add a doc comment stating why it is public, and add `export * from './time'`
      to `templates/index.ts`. Render `<Time time={message.time} />` inside the demo's composed user row so
      the demo proves timestamp parity, not just bubble parity.
- [x] TN-1: `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run build:core && npm run build:react` + `npm run test:packages`.
- [x] T6 (R5): Smoke check on react-demo `/composed-bot-text` — toggle Composed / Default, measure both user
      rows' bounding box, background, padding, radius and max-width, confirm they match; confirm bot rows
      unchanged and 0 console errors. Screenshot to `.github/screenshots/`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6

Files:

- `packages/react/src/components/templates/text-template/user-message-text.tsx` (new) — the exported
  `UserMessageText` content component (`children: ReactNode`).
- `packages/react/src/components/templates/text-template/user-message-text.spec.tsx` (new) — regression test:
  the default user row contains the composed bubble verbatim; JSX children render; no `Time`.
- `packages/react/src/components/templates/text-template/text-template.tsx` — user branch delegates to
  `UserMessageText`; the `styles` memo lost its dead `'user'` case (it now serves only `tool-call`).
- `packages/react/src/components/templates/text-template/index.ts` — export the new component.
- `packages/react/src/components/templates/time/time.tsx` — `TimeProps` becomes an exported interface; doc
  comment explains why `Time` is public.
- `packages/react/src/components/templates/index.ts` — export `./time` (it was the one template barrel entry
  missing, which is why `Time` sat in `dist` but was unreachable from the package entry).
- `packages/react/src/context/asgard-template-context.tsx` — corrected `MessageContainer` doc comment.
- `packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx` — corrected the
  matching inline comment (no behavior change).
- `apps/react-demo/src/app/routes/composed-bot-text/composed-bot-text.tsx` +
  `composed-bot-text.module.scss` — a user row (default vs. composed-with-mention-chip) added to the harness.
- `requirements/tasks/_index.md` — register BUILD-042 / REVIEW-042.

---

## Notes / Open Questions

- **Why 方案 1 and not 方案 2.** The issue offers exporting `UserMessageText` (方案 1) or making
  `MessageContainer` type-aware (方案 2). Reading the code, `MessageContainer` **already** returns
  `<TemplateBox type="user" direction="horizontal">` for user messages
  (`conversation-message-renderer.tsx:44-50`) — 方案 2's behavior exists; only its doc comment lies. But that
  shell alone gives right-alignment, not the bubble (background / padding / radius / 75% cap), which lives in
  `.text--user`. So 方案 1 is required either way, and 方案 2 collapses into the doc-comment fix (T4) done
  alongside it.
- **`Time` is not inside `UserMessageText`, but it IS exported (issue open question 3).** The bubble
  component stays chrome-free and symmetric with `BotMessageText` — the consumer composes the row and decides
  whether a timestamp appears. The first draft of this task also kept `Time` unexported, on the assumption
  that a composed row never wants one. The Sindri run disproved it: with the bubble fixed, the composed
  mention row was the only row in the thread without a timestamp, and Sindri had no way to add one short of
  re-implementing `formatTime` + the `template.time.style` color — the exact re-implementation this task
  exists to prevent. So `Time` + `TimeProps` are exported too (R6). `renderDefaultContent()` remains the
  shortcut for consumers that want the whole default row.
- **`max-width: 75%` stays on `.text--user`.** The bot side hoisted `max-width` out to
  `.text--bot-default` so a composed bot row fills the reading width. The user side is the opposite case: the
  75% cap is part of the chat-bubble look and the issue's measurements list `max-width: none` as part of the
  defect. It stays, and `className` remains the escape hatch.

---

## Execution Log / Change Log

- 2026-08-05: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/53
  (Status: `draft`).
- 2026-08-05: Plan confirmed by the user; implementation started (Status: `draft → ready → in-progress`).
- 2026-08-05: All R# verified (Status: `in-progress → done`). `lint:packages` 0 errors (1 pre-existing
  unrelated warning in `file-view.tsx`); `format:check` clean; `typecheck:packages` green;
  `build:core && build:react` green; `test:packages` 89/89 react (+3 new) — `UserMessageText` and
  `UserMessageTextProps` present in the emitted `dist/.../user-message-text.d.ts`, the corrected
  `MessageContainer` comment present in `dist/context/asgard-template-context.d.ts` (R1, R4).
  Demo `/composed-bot-text` measured at 1280×900, Composed vs. Default user bubble:
  `left 539/538`, `width 257/257`, `background rgb(71,103,235)`, `padding 8px 12px`,
  `border-radius 8px 0 8px 8px`, `max-width 75%`, `color rgb(255,255,255)` — identical apart from a uniform
  1px shift on both rows (the Default column is taller because it keeps the timestamp, so the scrollbar
  appears). Bot rows unchanged in both modes; 0 console errors. Screenshots:
  `.github/screenshots/issue-53-user-row-{composed,default}.png`. **Not done here:** version bump / npm
  publish / tag, and the Sindri-side adoption (separate repo).
