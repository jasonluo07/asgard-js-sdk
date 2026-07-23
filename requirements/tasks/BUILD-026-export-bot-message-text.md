# BUILD-026 Export the bot text content renderer (`BotMessageText`)

## Meta

- Task ID: `BUILD-026`
- Status: `done`
- Issue: — (internal; surfaced from Sindri REVIEW-025 Minor 1 — the SDK message row renders an avatar + timestamp that the chat-kit design does not have, and Sindri has no prop to remove them)
- Source spec: — (driven by the 2026-07-23 Sindri ↔ chat-kit comparison; see the session handoff)
- Complexity: `S`

---

## Brief

`@asgard-js/react` draws the bot avatar **and** the timestamp inside each template component (not centrally),
so a consumer that aligns to the chat-kit design cannot remove them. `avatar.tsx` falls back to a default
bot icon when no `avatar` prop is passed (dropping the prop just swaps a custom image for a grey robot), and
`Time` only disappears when `time` is not passed. A toggle prop (e.g. `hideAvatar`) was **explicitly ruled
out** by the user; the agreed direction is "let the consumer customize the message."

The container building blocks are already public: `TemplateBox` / `TemplateBoxContent` are exported and can
be composed by a consumer via the `renderMessageContent` seam **without** an `<Avatar>` and **without**
passing `time`. The one missing piece is the bot text **content** itself — the themed
`.text .text--bot` wrapper around `<StreamdownClient>` (markdown + streaming), currently inlined in
`text-template.tsx` and not exported. Without it a consumer must install `streamdown` and re-implement the
content styling, which then drifts from the SDK.

This task extracts that bot text content into a small **`BotMessageText`** component, has `TextTemplate`
consume it (output unchanged → no regression for `asgard-embed-frontend` / `react-demo`), and exports it
from the package entry so a consumer can self-assemble a chrome-less bot row.

**Already exists:** `packages/react/src/components/templates/text-template/text-template.tsx` (bot content at
lines 119–121), `text-template/streamdown-client.tsx` (`StreamdownClient`), `templates/template-box`
(`TemplateBox` / `TemplateBoxContent`, already exported), `context/asgard-theme-context` (theme), the
`renderMessageContent` seam in `chatbot-body/conversation-message-renderer.tsx`.

**Explicitly out of scope:** removing avatar/time from the SDK by default (would regress
`asgard-embed-frontend`, which passes `avatar` on purpose — `BotProvider.tsx:400`); any Sindri-side change
(a separate repo — it will add a bot-text branch in `conversation-message-content.tsx` and bump the SDK);
non-TEXT message types (image / carousel / attachment still self-draw their avatar, table / chart still
carry `time` — out of scope, per the agreed minimal scope); npm publish / version bump / tag.

---

## Relevant Rules

| §    | Rule (summary)                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — `BotMessageText` props and the theme style are precisely typed                            |
| §1.7 | No breaking change — pure addition + an internal refactor with identical rendered output             |
| §2.2 | The new component is exported from the package entry with an explicit `export type` for its props    |
| §3.1 | `BotMessageText` declares an explicit return type                                                    |
| §4.1 | Props fully typed (no `any`)                                                                         |
| §4.2 | No hardcoded colors — bot color / background come from theme context, as the current bot branch does |
| §6   | Extract the bot content once; remove the now-dead `'bot'` branch left in `TextTemplate`'s style memo |

---

## Acceptance Criteria

EARS form. Each criterion maps to one or more Implementation Tasks.

- `R1` When `@asgard-js/react` is imported, `BotMessageText` is exported from the package entry with an
  explicit props type, and it renders the bot text content — the `.text .text--bot` wrapper around
  `<StreamdownClient>` — with **no** `<Avatar>`, **no** `<Time>`, and **no** `<TemplateBox>` around it.
  → T2, T3
- `R2` When a bot TEXT message renders through the default `<Chatbot>` path, its rendered output is
  unchanged from before the refactor — same wrapper classes (`.text` + `.text--bot`), same theme-derived
  color / background, same `StreamdownClient` markdown / streaming. `TextTemplate` now delegates the bot
  content to `BotMessageText`; the `user`, empty-message, and `tool-call` branches (and their
  `TemplateBox` / `Avatar` / `Time` usage) are untouched. → T1
- `R3` `BotMessageText` reads bot color / background from theme context (no hardcoded values), consistent
  with the current `TextTemplate` bot branch. → T2
- `R4` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and opens the
  react-demo `/templates` route (`npm run serve:react-demo`, http://localhost:4200), bot text, streaming
  (typing), an empty message with references / quick replies, and table / chart messages render with no
  build errors and no visual regression. → T4

---

## Implementation Tasks

Run in order; each maps to the R# it satisfies.

- [x] T2 (R1, R3): Add `packages/react/src/components/templates/text-template/bot-message-text.tsx` —
      props `{ children: string }` (exported `BotMessageTextProps`), explicit `ReactNode` return; read theme
      via `useAsgardThemeContext`, apply `{ color: theme?.botMessage?.color, backgroundColor:
    theme?.botMessage?.backgroundColor }`; render `<div className={clsx(classes.text,
    classes['text--bot'])} style={…}><StreamdownClient>{children}</StreamdownClient></div>` reusing the
      existing `text-template.module.scss`.
- [x] T1 (R2): In `text-template.tsx`, replace the bot branch's inner content
      (`<StreamdownClient>` inside the themed div) with `<BotMessageText>{messageText}</BotMessageText>`;
      keep the `tool-call` else path (plain `messageText`) and every other branch as-is; remove the now-dead
      `'bot'` case from the `styles` memo (and the now-unused `StreamdownClient` import).
- [x] T3 (R1): Export `BotMessageText` (+ `BotMessageTextProps`) from
      `templates/text-template/index.ts` (flows through `templates → components → package root`).
- [x] TN-1: `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react`.
- [x] T4 (R4): Smoke check on react-demo `/templates` — Text template renders identically (dark
      `.text--bot` bubble, avatar, timestamp, quick replies), 0 console errors.

---

## Coverage

Use Cases: R1, R2, R3, R4

Files:

- `packages/react/src/components/templates/text-template/bot-message-text.tsx` (new) — the exported
  `BotMessageText` content component.
- `packages/react/src/components/templates/text-template/text-template.tsx` — bot branch delegates to
  `BotMessageText`; removed the dead `'bot'` style case and the unused `StreamdownClient` import.
- `packages/react/src/components/templates/text-template/index.ts` — export the new component.
- `requirements/tasks/_index.md` — register BUILD-026.

---

## Notes / Open Questions

- **Why not remove avatar/time from the SDK (the other obvious option).** `asgard-embed-frontend` passes
  `avatar` intentionally (URL param / backend config → `<Chatbot avatar={config.avatar}>`,
  `BotProvider.tsx:400`); a traditional customer-service iframe where the avatar + timestamp are deliberate.
  Removing them globally would regress it. With a toggle prop ruled out, exporting the content renderer is
  the path that leaves every existing consumer untouched.
- **Minimal by choice.** This solves the TEXT bot message only. If Sindri later needs to strip chrome from
  other bot message types, each would need its own self-assembly (or a follow-up task). Recorded so the
  limit is explicit, not forgotten.

---

## Execution Log / Change Log

- 2026-07-23: BUILD task created (Status: `draft`). Scope and approach agreed in the brainstorming session:
  export the bot text content as `BotMessageText`; SDK-only, no publish; Sindri-side change tracked
  separately.
- 2026-07-23: Implemented and verified (Status: `draft → in-progress → done`). Extracted `BotMessageText`,
  delegated `TextTemplate`'s bot branch to it, removed the dead `'bot'` style case + unused
  `StreamdownClient` import, exported from the package entry. `build:core && build:react` green; `lint:react`
  0 errors (1 pre-existing unrelated warning in `file-view.tsx`); `format:check` clean; `test:react` 25/25.
  react-demo `/templates` Text template renders identically with 0 console errors. **Not done here:**
  Sindri-side self-assembly + SDK version bump / publish (separate, user-driven).
