# BUILD-051 Surface the next-turn prompt suggestion in the composer placeholder

## Meta

- Task ID: `BUILD-051`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/62`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-028-下一句建議-placeholder-與-tab-採用.md`
- Complexity: `M`

---

## Brief

The backend now emits `asgard.prompt_suggestion` after each reply: at most one prediction of what the
user is likely to say next (asgard-core#182, asgard-sdk-go#21 — both merged and on dev). The SDK
ignores it today, so the capability is invisible.

Wire it through both packages. `@asgard-js/core` folds the event into a run-level store —
`promptSuggestion$` / `getPromptSuggestion()` / `clearPromptSuggestion()`, merged into `ChannelStates`
— following the F-016 `channelTitle` path exactly, because the two are the same kind of state
(run-level, ephemeral, never part of the conversation). `@asgard-js/react` exposes it through the
service context and renders it as the composer's placeholder (grey text) suffixed with `⇥ Tab`;
pressing <kbd>Tab</kbd> fills the textarea and does **not** send.

Three properties of the event drive the design: it is **live-only** (a rejoin never replays it, so
"no suggestion" is the normal case and must never show a loading state), the composer must **only**
intercept Tab when there is genuinely a suggestion to adopt (otherwise keyboard users lose their only
way out of the textarea), and adopting is not sending.

**Already exists:** the whole `channelTitle` chain to copy — `Channel.channelTitleSubject` /
`channelTitle$` / `getChannelTitle()` (`packages/core/src/lib/channel.ts:50,65,116,141`), its slot in
the `combineLatest` states observer (`:287`–`:308`), `ChannelStates.channelTitle`
(`packages/core/src/types/channel.ts:94`), `useChannelTitle`
(`packages/react/src/hooks/use-derived-state.ts:52`), the single `makeStatesObserver` setter block
(`packages/react/src/hooks/use-channel.ts:155`–`160`) and the context field
(`packages/react/src/context/asgard-service-context.tsx:53,414,454`). In the composer, the existing
`onKeyDown` Enter branch already carries the `isComposing` guard the Tab branch needs, and the
placeholder already resolves through `inputPlaceholder || 'Enter message'`. i18n is the in-repo
catalog `packages/react/src/i18n.ts` (`en-US` / `ja-JP` / `zh-TW`).
Design authority: `references/asgard-chat-kit-prototype/src/ChatInput.tsx` + `src/i18n.ts` (pinned @
`f3a6e79`).

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

Task-specific additions:

| §     | Rule (summary)                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §1.6+ | Derived / run-level state is exposed as a **store** (snapshot + subscribe), never a fire-and-forget callback — a late subscriber gets the current value      |
| §5.3+ | User-facing strings go through `t(locale, key)` in `packages/react/src/i18n.ts`; all three locales stay in sync. `Tab` is a keycap legend — never translated |
| §7+   | The suggestion string itself is backend content in the conversation's language — never translated, never trimmed of meaning by the frontend                  |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.
Each criterion is mapped to one or more Implementation Tasks (→ T#).

- `R1` When `asgard.prompt_suggestion` arrives, while the textarea is empty, the system shall show the
  suggestion as the textarea's placeholder followed by the `⇥ Tab` hint. → T1, T2, T3, T4, T5, T6, T7
- `R2` When the user presses <kbd>Tab</kbd>, while a suggestion is being offered, the system shall put
  the suggestion text into the textarea, keep focus in the textarea, leave it editable, and **not**
  send it. → T6
- `R3` When no suggestion is held, the system shall render the consumer's `inputPlaceholder`
  unchanged (or the existing `Enter message` default) with no key hint appended. → T6
- `R4` When the textarea already contains text, the system shall not offer the suggestion, and
  <kbd>Tab</kbd> shall keep its native focus-move behavior without overwriting what was typed. → T6
- `R5` When the user presses <kbd>Shift</kbd>+<kbd>Tab</kbd>, the system shall never intercept it. → T6
- `R6` When <kbd>Tab</kbd> is pressed during IME composition, the system shall hand the key back to the
  input method and not adopt the suggestion. → T6
- `R7` When a suggestion is being offered, the system shall expose the full explanation ("Press Tab to
  use this suggestion") on both `title` and `aria-description`; when none is offered, neither
  attribute shall be set. → T6, T7
- `R8` When the suggestion is adopted, when a message is sent, or when a new run starts
  (`asgard.run.init`), the system shall clear the suggestion so the placeholder returns to the
  consumer's own. → T2, T6, T8
- `R9` When the user reloads or rejoins the channel, the system shall hold no suggestion and shall
  show no loading state, no error, and no delay to input availability. → T2, T8
- `R10` When two suggestions arrive within one run, the system shall offer the last one. → T2, T8
- `R11` When a consumer subscribes to the suggestion store after the event has already been folded,
  the system shall deliver the current value immediately (snapshot + subscribe, not a one-shot
  event). → T2, T3, T4, T8
- `R12` When the `locale` is `en-US` or `zh-TW` (and `ja-JP`, which the catalog also carries), the
  system shall render the hint and the explanation in that locale, switching immediately on change. → T7, T9
- `R13` When a consumer built against the previous version renders the chatbot, the system shall behave
  exactly as before — the change is purely additive, with no altered signature or removed export. → T1, T5, T11
- `R14` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, the Vitest
  suites, and exercises `/prompt-suggestion` in the react-demo (`npm run serve:react-demo`,
  http://localhost:4200) in a real browser, the system shall walk R1–R12 with no build errors. → T10, T11, T12

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R13): `packages/core/src/constants/enum.ts` — add
      `PROMPT_SUGGESTION = 'asgard.prompt_suggestion'` next to `CHANNEL_TITLE_UPDATE`, with a comment
      noting it is live-only (never replayed on rejoin).
- [x] T2 (R1, R8, R9, R10, R11): `packages/core/src/types/sse-response.ts` — add
      `PromptSuggestionEventData { suggestion: string }` and the `promptSuggestion` entry in `Fact`.
      `packages/core/src/lib/channel.ts` — add `promptSuggestionSubject`
      (`BehaviorSubject<string | null>`, initial `null`, **not** seeded from config: there is no
      metadata source), `promptSuggestion$` with `distinctUntilChanged()`, `getPromptSuggestion()`,
      `clearPromptSuggestion()`; in `buildRunHandlers.onSseMessage` fold `PROMPT_SUGGESTION` into the
      subject and clear it on `EventType.INIT`; clear it at the top of `sendMessage()` so both the
      composer path and programmatic sends expire the stale prediction.
- [x] T3 (R1, R11): `packages/core/src/types/channel.ts` — add `promptSuggestion: string | null` to
      `ChannelStates`; join `promptSuggestion$` into the `combineLatest` + `map` in
      `Channel.subscribe()` (the destructured argument order must be updated in lockstep).
- [x] T4 (R1, R11): `packages/react/src/hooks/use-derived-state.ts` — add `usePromptSuggestion`,
      mirroring `useChannelTitle`; export from the hooks barrel and the package entry, re-exporting
      `PromptSuggestionEventData` as an explicit `export type`.
- [x] T5 (R1, R13): `packages/react/src/hooks/use-channel.ts` — add the `promptSuggestion` state, its
      line in `makeStatesObserver`, and a `clearPromptSuggestion` callback wrapping the channel method;
      `packages/react/src/context/asgard-service-context.tsx` — carry both through the context type,
      the default value, `contextValue` and its dependency array.
- [x] T6 (R1–R6, R8): `packages/react/src/components/chatbot/chatbot-footer/chat-composer.tsx` —
      derive `suggesting` (suggestion present, textarea empty, not preview mode, not awaiting consent);
      compose the placeholder; add the Tab branch to `onKeyDown` after the Enter branch (bail on
      `isComposing`, bail on `shiftKey`, bail when not `suggesting`; otherwise `preventDefault()`, set
      the value, re-measure the textarea height and clear the suggestion — never move focus, never
      submit); set `title` / `aria-description` only while `suggesting`.
- [x] T7 (R1, R7, R12): `packages/react/src/i18n.ts` — add `composer.suggestionHint` (`⇥ Tab`, identical
      in all three locales) and `composer.suggestionTitle` (en-US / zh-TW / ja-JP, wording from the
      prototype catalog). Keyed under `composer.*`, not the prototype's `input.*`: every other string
      this component owns already lives there (`composer.send`, `composer.awaitingConsent`), and this
      catalog has no `input.*` namespace at all.
- [x] T8 (R8, R9, R10, R11): `packages/core/src/lib/channel.spec.ts` — cover fold, last-wins within a
      run, clear on `run.init` / `sendMessage` / `clearPromptSuggestion()`, a rejoin that carries no
      such event, and a late subscriber receiving the current value.
- [x] T9 (R2–R7, R12): add `chat-composer-suggestion.spec.tsx` — placeholder composition, Tab adopt
      (value set, no send), Tab with text present (not intercepted), `Shift+Tab`, Tab during
      composition, `title` / `aria-description` presence and absence, and locale switching.
- [x] T10 (R14): `apps/react-demo` — extend `src/mock-server/sse-mock.ts` (`emptyFact()` gains the new
      key; a `prompt-suggestion-demo` channel streams `run.init → message.* → prompt_suggestion →
run.done`, with a silent variant and a two-suggestion variant keyed off the sent text) and add the
      `src/app/routes/prompt-suggestion/` route (chatbot + an out-of-frame `usePromptSuggestion` panel
      with a render badge), registered in the route list and nav.
- [x] T11: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run build:core && npm run build:react`.
- [x] T12 (R14): Smoke check — `npm run test:packages`, then `npm run serve:react-demo` and walk
      R1–R12 on `/prompt-suggestion` with real `Tab` / `Shift+Tab` key presses;
      screenshots to `.github/screenshots/`.

---

## Coverage

Use Cases: R1 · R2 · R3 · R4 · R5 · R6 · R7 · R8 · R9 · R10 · R11 · R12 · R13 · R14 — all verified.
R1–R7 / R10 / R12 in the browser on `/prompt-suggestion` and again by Vitest; R8–R11 by the core
suite; R13 by `typecheck:packages` + the untouched existing suites; R14 by build + suites + demo walk.

Files (package noted where it is not `@asgard-js/core`):

_Changed — core_

- `src/constants/enum.ts` — `EventType.PROMPT_SUGGESTION`
- `src/types/sse-response.ts` — `PromptSuggestionEventData` + its `Fact` entry
- `src/types/channel.ts` — `ChannelStates.promptSuggestion`
- `src/lib/channel.ts` — subject / `promptSuggestion$` / `getPromptSuggestion()` /
  `clearPromptSuggestion()`, the `combineLatest` slot, the SSE fold, the `run.init` clear and the
  `sendMessage()` clear
- `src/lib/channel.spec.ts` — +9 cases (fold, last-wins, three clear paths, replay, late subscriber,
  `ChannelStates`)

_Changed — `@asgard-js/react`_

- `src/hooks/use-derived-state.ts` — `usePromptSuggestion`
- `src/hooks/use-channel.ts` — state + observer line + `clearPromptSuggestion`, both return branches
- `src/context/asgard-service-context.tsx` — context type, default, value, deps
- `src/components/chatbot/chatbot-footer/chat-composer.tsx` — `suggesting`, placeholder composition,
  the Tab branch, `title` / `aria-description`, and the textarea-sizing layout effect (see below)
- `src/components/chatbot/chatbot-footer/chat-composer.module.scss` — one-line, clipped `::placeholder`
- `src/i18n.ts` — `composer.suggestionHint` / `composer.suggestionTitle` × 3 locales
- `src/components/chatbot/chatbot-footer/chat-composer-suggestion.spec.tsx` (new) — 17 cases

_Changed — `apps/react-demo`_

- `src/mock-server/sse-mock.ts` — `emptyFact()` key + `handlePromptSuggestionMock` (four scripts:
  normal / silent / twice / long) + dispatch
- `src/app/routes/prompt-suggestion/` (new route: chatbot, script legend, locale switch, out-of-frame
  store panel with a render badge)
- `src/app/app.tsx`, `src/app/components/layout/layout.tsx` — route + nav registration

_Evidence_

- `.github/screenshots/f-028-01-suggestion-placeholder.png` … `f-028-06-long-adopted-grows.png`

---

## Verification Notes

Chromium on `/prompt-suggestion`, real key presses (`page.keyboard.press`). This batch ran **headless**
(`playwright-mcp --headless`); every judgement below is a DOM assertion, which headless and headed agree on.
The headed evidence is the consumer-app pass recorded further down.

| Check                                      | Result                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| R1 placeholder                             | `那前一週的數字是多少？ ⇥ Tab`, `title` = `Press Tab to use this suggestion`                      |
| R2 Tab adopt                               | value filled, `activeElement` still the textarea, **0** user bubbles, store → `null`              |
| R3 no suggestion (page load / silent turn) | placeholder `輸入你的問題`, `title` / `aria-description` absent, textarea enabled                 |
| R4 Tab with text present                   | not intercepted (focus moved to Send), text untouched                                             |
| R5 `Shift+Tab`                             | not intercepted (focus moved back to Close), suggestion still on offer                            |
| R6 Tab during composition                  | not intercepted, nothing adopted, suggestion still on offer                                       |
| R7 / R12 locale switch to `zh-TW`          | `title` + `aria-description` → `按 Tab 採用這句建議`; hint stays `⇥ Tab`; suggestion untranslated |
| R10 two in one run                         | only the second is offered (`把行動 App 的回購拆成新客與舊客`)                                    |
| Over-long suggestion                       | clipped to one line; `scrollWidth === clientWidth`, page `scrollWidth === clientWidth`            |

**Bug found and fixed during the smoke check.** Adopting sized the textarea inside the keydown handler,
which reads the DOM before React commits the new value: a multi-line suggestion left the box at
`clientHeight` 36px against `scrollHeight` 108px with `overflow: hidden` — the adopted text was
invisible and unscrollable. Sizing moved to a `useLayoutEffect` on `value`, so every path that pushes a
value in (Tab adopt, `ChatbotRef.setInputValue`) is measured after commit; the now-redundant in-handler
calls were dropped. Pinned by `R2: sizes the box to the adopted text…`, which was confirmed to fail
against the old ordering (`expected '36px' to be '222px'`) before passing against the fix. Typing
(36 → 84 → 204px) and shrink-back on submit (→ 36px) re-checked in the browser for regression.

---

## Execution Log / Change Log

- 2026-08-12: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/62 (Status: `draft`).
- 2026-08-12: Plan confirmed by user; implementation started on `feat/62-prompt-suggestion-placeholder` (Status: `draft → ready → in-progress`).
- 2026-08-12: All R# verified. lint (0 errors) / format:check / typecheck:packages / build:core + build:react green; test:packages 382 passed (core 196 incl. +9, react 186 incl. +17). Browser smoke (headless) on `/prompt-suggestion` walked R1–R12 with real key presses and surfaced one defect (textarea sized before commit → adopted multi-line text invisible), fixed and pinned by a regression test. Two deviations from the spec as written, both recorded above: i18n keys use the repo's `composer.*` namespace rather than the prototype's `input.*`, and the mock's opening run is silent so a fresh load demonstrates R9 (Status: `in-progress → done`).
