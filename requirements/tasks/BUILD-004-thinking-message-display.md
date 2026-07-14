# BUILD-004 Thinking Message Display

## Meta

- Task ID: `BUILD-004`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/1`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-001-thinking-message-顯示.md` (+ `use-cases/UC-001`, `UC-002`)
- Complexity: `L`

---

## Brief

Render asgard-core's new extended-thinking SSE events `asgard.message.thinking.{start,delta,complete}` (same shape as a normal assistant message — reasoning text in `text`, `start → delta×N → complete`) as an **independent, collapsible thinking block**, visually separate from tool-calls and the final answer. Following the spec's directive, mirror the existing tool-call pattern: new `EventType` members → payload types → a new `ConversationMessage` variant assembled in `conversation.ts` → a dedicated collapsible react component wired into the message renderer. Two states: **streaming** (auto-expanded, "Thinking…", bottom-anchored auto-scrolling plain-text window) and **completed** (collapsed to a fixed "Thought for a moment" summary — no elapsed time — expandable to full markdown reasoning with a leading preview + show more/less).

**Key decision (2026-07-12):** the completed summary drops elapsed-time entirely — always the fixed string "Thought for a moment", no seconds, no duration field, nothing derived from event arrival time (replay-safe). The former EXT-001 / asgard-core#112 dependency is cancelled.

**Already exists:** the assistant-message assembly + robustness rules from F-011 (`conversation.ts` `onMessageStart/Delta/Complete`, `isTerminalBot` guard, delta lazy-init) to mirror for the thinking variant; the tool-call react pattern (`packages/react/src/components/templates/tool-call-group/` — inlined lucide SVG icons, CSS-module collapsible, `clsx`); `StreamdownClient` for markdown; `conversation-message-renderer.tsx` as the render integration point. No thinking `EventType`, no thinking payload / variant, no thinking component yet.

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`.

| §    | Rule (summary)                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — precise types                                                                                              |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass errors                                                                              |
| §1.5 | Every `useEffect` (rAF / `fonts.ready` measure) has teardown                                                                     |
| §1.6 | `@asgard-js/core` never imports react/DOM; react imports core via its public entry only                                          |
| §1.7 | Additive only — new enum members / payload / variant / component; no breaking change                                             |
| §2.2 | Export new public types + component from the package entry                                                                       |
| §2.3 | `EventType` + payload type exist before the reducer branch and the react component                                               |
| §3.1 | Explicit return types                                                                                                            |
| §3.2 | Reuse `MessageEventData` for the thinking payload (same shape); centralize the variant in `core/src/types`                       |
| §4.1 | React component props fully typed                                                                                                |
| §4.2 | No hardcoded colors — theme via CSS variables (`--asg-color-*`)                                                                  |
| §6   | Mirror F-011 assembly + the tool-call component pattern; don't fork a second assembly path or a second icon set unnecessarily    |
| §7   | No `setTimeout` mock delays in library code; streaming plain-text (no half-open markdown reflow); honor `prefers-reduced-motion` |

---

## Acceptance Criteria

- `R1` When `asgard.message.thinking.{start,delta,complete}` arrive, the reducer assembles a dedicated `ConversationMessage` variant (`type: 'thinking'`, keyed by `messageId`, accumulating `text`, with a streaming flag) — separate from bot / tool-call — reusing F-011 robustness (complete self-sufficient, delta lazy-init before start, terminal guard against late start/delta after complete). → T1, T2
- `R2` While streaming (delta received, not yet complete), the thinking block is **auto-expanded** with a "Thinking…" header, and reasoning renders in a **bottom-anchored auto-scrolling plain-text window**: each delta appends at the end, the window scrolls to the latest, an overflow shows a top gradient mask, and already-shown text never shifts horizontally; scrolling is instant under `prefers-reduced-motion`. → T3, T4
- `R3` When `complete` arrives, the block collapses to a **fixed single-line summary "Thought for a moment"** (no elapsed time / seconds / duration field), expandable on click to the full reasoning (markdown); thinking blocks in history default to collapsed. → T2, T3, T4
- `R4` On the completed-state expansion, reasoning exceeding the preview limit is truncated with a leading preview + a "顯示更多 / 顯示較少" toggle; the streaming state is **not** truncated. → T3
- `R5` A consumer that does not render thinking (or an unknown event) safely ignores these events with no effect on normal message / tool-call rendering (existing `default: return this` + renderer fallthrough). → T1, T4
- `R6` Replay (`GET /sse` rejoin) and reconnection render consistently with live — no value derived from event arrival time (fixed summary + accumulated text). → T2, T5
- `R7` (Smoke) build green; core Vitest for thinking assembly (start→delta×N→complete, complete-only, delta-before-start, late-frame guard, batch replay); a scoped react-demo route shows the streaming (auto-scroll window) and completed ("Thought for a moment" + show more) states; screenshot to `.github/screenshots/f-001/`. → T5, T6

---

## Implementation Tasks

- [x] T1 (R1, R5): `enum.ts` — add `MESSAGE_THINKING_START` / `_DELTA` / `_COMPLETE` (`asgard.message.thinking.{start,delta,complete}`); `sse-response.ts` — `Fact` keys reusing `MessageEventData`; `channel.ts` — `ConversationThinkingMessage` variant (`type: 'thinking'`, `messageId`, `text`, `isThinking`, `time`, `traceId`) + add to the `ConversationMessage` union.
- [x] T2 (R1, R3, R6): `conversation.ts` — `onMessage` thinking branches → `onThinkingStart/Delta/Complete`, mirroring F-011 (complete self-sufficient, delta lazy-init, terminal guard); replay-safe (no arrival-time value).
- [x] T3 (R2, R3, R4): react `ThinkingBlock` component + `thinking-block.module.scss` (inlined Brain / Chevron SVG icons, theme via CSS variables; streaming = bottom-anchored auto-scroll window with rAF + `fonts.ready` re-measure + top mask + `prefers-reduced-motion`; completed = collapsed "Thought for a moment" + `StreamdownClient` markdown + preview / show more-less). Export from the templates entry.
- [x] T4 (R2, R3, R5): wire into `conversation-message-renderer.tsx` — a `type === 'thinking'` case rendering `<ThinkingBlock>`; other renderers unaffected.
- [x] T5 (R1, R6, R7): core Vitest — thinking assembly (start→delta×N→complete, complete-only, delta-before-start lazy-init, late start/delta after complete ignored, batch replay consistency).
- [x] T6 (R7): scoped react-demo route + mock replaying a thinking sequence (streaming, then completed two-state); browser-verify both states; screenshot to `.github/screenshots/f-001/`.
- [x] T7: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6, R7 (UC-001 串流中呈現、UC-002 完成後呈現與展開)
Files:

- `packages/core/src/constants/enum.ts` — `MESSAGE_THINKING_START` / `_DELTA` / `_COMPLETE`
- `packages/core/src/types/sse-response.ts` — `Fact.messageThinkingStart/Delta/Complete` (reuse `MessageEventData`)
- `packages/core/src/types/channel.ts` — `ConversationThinkingMessage` variant + `ConversationMessage` union
- `packages/core/src/lib/conversation.ts` — `onMessage` thinking branches + `onThinkingStart/Delta/Complete` + `isTerminalThinking` guard
- `packages/core/src/lib/conversation.spec.ts` — F-001 thinking tests (stream→settle, complete-only, delta-before-start, terminal guard, coexist with answer)
- `packages/react/src/components/templates/thinking-block/{thinking-block.tsx,thinking-block.module.scss,index.ts}` — collapsible ThinkingBlock (streaming auto-scroll window + completed "Thought for a moment" + preview/show-more)
- `packages/react/src/components/templates/index.ts` — export `thinking-block`
- `packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx` — `type === 'thinking'` → `<ThinkingBlock>`
- `apps/react-demo/src/mock-server/sse-mock.ts` — scoped `thinking-demo` handler (`handleThinkingMock` + `thinkingFrame`): streams thinking.start→delta×N→complete then the answer
- `apps/react-demo/src/app/routes/thinking/{thinking.tsx,thinking.module.scss,index.ts}` — scoped demo route
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — register the `/thinking` route + nav link

---

## Execution Log / Change Log

- 2026-07-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/1 (F-001 + UC-001/UC-002) (Status: `draft`).
- 2026-07-14: Implemented T1–T7. Core Vitest 14/14 green (5 F-011 + 4 F-014 + 5 F-001). build:core+react green, lint:packages green, own-file format clean. Browser-verified `/thinking`: streaming state (auto-expanded "Thinking…", bottom-anchored auto-scroll window — data sampling confirmed `atBottom` at every tick, top mask toggles exactly at overflow, monotonic text append maxLen 274) and completed state ("Thought for a moment", expand → markdown reasoning, 顯示更多 → 顯示較少 toggles preview 150↔full 256 chars), answer renders as a separate message below; 0 console errors. Screenshots: `.github/screenshots/f-001/thinking-{streaming,completed}.png`. Decision honored: completed summary is the fixed "Thought for a moment" (no elapsed time / duration field — EXT-001 cancelled). (Status: `in-progress → done`).
