# BUILD-005 Run Indicator Bound to Connection at the Seam

## Meta

- Task ID: `BUILD-005`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/3`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-003-run-進行中指示改綁連線並移至輸入交界.md` (+ `use-cases/UC-005`, `UC-006`)
- Complexity: `M`

---

## Brief

Move the "response in progress" indicator off the per-message lifecycle and bind it to the **whole `POST /sse` connection** (`isConnecting` — the same signal that already disables sending), and relocate it **out of the conversation thread** to the **thread↔input seam** as a single indeterminate progress line (per the pinned prototype `RunningIndicator.tsx`). Then remove the per-message typing workarounds: the thread-bottom `BotTypingPlaceholder` (and its three suppression conditions), the inline 3-dot animation, and the 500ms debounce — while **keeping the streaming message text** (`typingText`). React-only: the `isConnecting` chain (channel → use-channel → context → footer) already exists and is left untouched.

**Already exists:** `isConnecting` end-to-end (`channel.ts` `isConnecting$` true on POST open / false on stream close → `use-channel` → `asgard-service-context` → footer send-gating); `BotTypingPlaceholder` (thread-bottom, gated by `isConnecting && !hasTypingMessage && !pendingConsent && !lastMessageIsCompletedBot`); `BotTypingBox` (3-dot + `useDebounce(isTyping, 500)` + streaming text via `StreamdownClient`); the body↔footer seam in `chatbot.tsx` (`<ChatbotBody/>` … `<ChatbotFooter/>`, footer has a `border-top`). No seam run-indicator yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| §1.1 | No `any` / `as any`                                                                                                            |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass errors                                                                            |
| §1.6 | `@asgard-js/core` untouched here; react change only; no deep core import                                                       |
| §1.7 | Removing `BotTypingPlaceholder` — it is internal (not a documented public template); confirm before removing any exported name |
| §4.1 | Component props fully typed                                                                                                    |
| §4.2 | No hardcoded colors — the indeterminate line uses the theme `--primary` / border CSS variables                                 |
| §4.4 | `react` / `react-dom` stay peerDependencies                                                                                    |
| §6   | Do not fork a second run-state signal — bind the existing `isConnecting`; no new `<style>` injection (use a scss module)       |
| §7   | Remove dead code fully (placeholder file, 3-dot classes, debounce use); honor `prefers-reduced-motion`                         |

---

## Acceptance Criteria

- `R1` The run indicator binds **`isConnecting`** (the whole POST /sse connection), not per-message `message.*`; within one run it does **not** flicker and does **not** disappear in inter-message gaps. → T1, T2
- `R2` The indicator renders at the **thread↔input seam** as an indeterminate progress line (per the prototype), not inline in the conversation thread. → T1, T2
- `R3` While the run is in progress the input stays disabled (unchanged behavior — same `isConnecting` signal; no regression to the footer gating). → T2
- `R4` Between `message.complete` and `run.done` the connection lingers briefly → the indicator **stays lit** until the connection actually closes (connection-bound semantics, not message-bound). → T2
- `R5` Honor `prefers-reduced-motion`: no flowing animation; a static in-progress state instead. → T1
- `R6` Streaming message text still renders in real time (`typingText`); the removed pieces are the 3-dot animation + the thread placeholder, **not** the streaming text. → T3, T4
- `R7` (Smoke) build green; a scoped react-demo route whose mock streams a multi-message run (with an inter-message gap and/or a tool-call) shows the seam indicator persisting without flicker/gap, the input disabled during the run, and a static line under `prefers-reduced-motion`; screenshot to `.github/screenshots/f-003/`. → T5

---

## Implementation Tasks

- [x] T1 (R2, R5): new `RunningIndicator` react component + `running-indicator.module.scss` — always-present seam line (matching the footer border) that becomes a `--primary` indeterminate progress line when `running`; `@media (prefers-reduced-motion: reduce)` → static (no flow); no inline `<style>`. Typed `{ running: boolean }` prop. Export from the components entry.
- [x] T2 (R1, R3, R4): wire `<RunningIndicator running={isConnecting} />` at the footer's top edge (the body↔footer seam) inside `ChatbotFooter` (which already has `isConnecting`); removed the footer's static `border-top` so the indicator's seam is the single separator; footer input/send-gating unchanged.
- [x] T3 (R6): strip `BotTypingBox` — removed `useDebounce(isTyping, 500)` and the 3-dot `typing-indicator` span; keeps the streaming-text bubble (`typingText` via `StreamdownClient`), gated on `isTyping && typingText`. Renderer's `if (message.isTyping)` branch renders that (no dots).
- [x] T4 (R6): deleted `BotTypingPlaceholder` (file + use/import in `chatbot-body.tsx` + `text-template/index.ts` export); removed the dead `.typing-indicator` / `.dot` / `@keyframes blink` from `text-template.module.scss`. The public `botTypingPlaceholder` prop is kept but `@deprecated` (no-op — no breaking change per §1.7).
- [x] T5 (R7): scoped `/run-indicator` route + `run-indicator-demo` mock streaming a multi-message run (two messages + a 1.6s gap + a complete→done tail); browser-verified R1–R6; screenshots to `.github/screenshots/f-003/`.
- [x] T6: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6, R7 (UC-005 run 進行中的呈現、UC-006 移除舊 per-message typing)
Files:

- `packages/react/src/components/chatbot/running-indicator/{running-indicator.tsx,running-indicator.module.scss,index.ts}` — new seam RunningIndicator
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx` — render `<RunningIndicator running={isConnecting} />` at the footer top (the seam)
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.module.scss` — remove the static `border-top` (the indicator seam replaces it)
- `packages/react/src/components/chatbot/chatbot.tsx` — `@deprecated` on the `botTypingPlaceholder` prop
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` — remove the `BotTypingPlaceholder` usage/import + its destructured prop
- `packages/react/src/components/templates/text-template/bot-typing-box.tsx` — remove the 3-dot animation + `useDebounce`; streaming-text-only
- `packages/react/src/components/templates/text-template/bot-typing-placeholder.tsx` — deleted
- `packages/react/src/components/templates/text-template/index.ts` — drop the `bot-typing-placeholder` export
- `packages/react/src/components/templates/text-template/text-template.module.scss` — remove `.typing-indicator` / `.dot` / `@keyframes blink`
- `apps/react-demo/src/mock-server/sse-mock.ts` — scoped `run-indicator-demo` handler (`handleRunIndicatorMock`)
- `apps/react-demo/src/app/routes/run-indicator/{run-indicator.tsx,run-indicator.module.scss,index.ts}` — scoped demo route
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — register `/run-indicator`

---

## Execution Log / Change Log

- 2026-07-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/3 (F-003 + UC-005/UC-006) (Status: `draft`).
- 2026-07-14: Implemented T1–T6 (react-only; no core change). build:core+react green, lint:packages green, own-file format clean. Browser-verified `/run-indicator`: across one connection carrying two messages + a 1.6s gap + a complete→done tail, the seam indicator stayed lit continuously — data sampling showed a single LIT→off transition (at run.done), never flickering per message nor disappearing in the gap; the static seam was always present; send stayed disabled during the run (`chatbot_submit_button__disabled`); under emulated `prefers-reduced-motion: reduce` the segment computed to `animation-name: none`, full-width, `opacity: 0.5` (static, no flow); streaming text still rendered with no 3-dot animation; 0 console errors. Screenshots: `.github/screenshots/f-003/run-indicator-{lit,reduced-motion}.png`. The public `botTypingPlaceholder` prop kept as `@deprecated` (no-op) — no breaking change. (Status: `in-progress → done`).
