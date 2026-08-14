# BUILD-055 Fold the canvas stream events into conversation state

## Meta

- Task ID: `BUILD-055`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/66`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-030-畫布卡片-sandboxed-iframe-渲染與串流.md` (AC1–AC7)
- Complexity: `L`

---

## Brief

Cycle 1 of F-030, **core only**. The agent can now draw a "canvas" — a self-contained HTML/SVG
fragment — and the backend streams it as it is written (a measured 2.3KB drawing arrives as **349
deltas**). This task adds the three canvas events, the template type, the `ConversationCanvasMessage`
variant, and the reducer that folds them, so the data layer is correct and fully unit-testable before
any rendering exists. Mirrors how F-016 (data) preceded F-017 (UI) and F-019 preceded F-021.

Three rules carry the weight, each blocking a specific failure:

- **delta accumulates, `complete` replaces.** `complete` carries the backend's authoritative fragment.
  History replays only `complete` (deltas are ephemeral), so appending here renders correctly while
  streaming and comes back **empty after a reload** — the worst kind of bug to find late.
- **`complete` without a template means the backend could not draw it** (empty fragment, or over the
  256KB cap); that frame exists only to close the block, so the whole card is **deleted**. Leaving half
  the markup would present an unfinished document as a finished one.
- **terminal guard**, as for bot / thinking messages (F-011): once drawn, a late start / delta must not
  swap the authoritative fragment back to the prefix that happened to be in flight.

**Already exists:** `packages/core/src/constants/enum.ts` (`EventType`, `MessageTemplateType`),
`packages/core/src/types/sse-response.ts` (Fact shapes + template union),
`packages/core/src/types/channel.ts` (`ConversationMessage` union),
`packages/core/src/lib/conversation.ts` (`onThinkingStart/Delta/Complete` — the closest existing
three-handler shape to copy, including its terminal guard and the BUG-001 `parentToolUseId` drop),
`references/asgard-chat-kit-prototype/src/canvasReducer.ts` (**reference implementation**, 84 lines,
already browser-verified — the three rules above are its file header).

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

---

## Acceptance Criteria

- `R1` (AC1) When the SSE layer sees `asgard.message.canvas.{start,delta,complete}`, the system shall
  recognize them via three new `EventType` members with matching `Fact` fields, and shall expose
  `MessageTemplateType.CANVAS` + `CanvasMessageTemplate` (`{ title, canvas: { html } }`) joined to the
  `Message.template` union. → T1
- `R2` (AC2) When a canvas message exists, the system shall represent it as
  `ConversationCanvasMessage` (`type: 'canvas'` with `html` / `title` / `isDrawing`) inside the
  `ConversationMessage` union, produced by three new `Conversation.onMessage` cases. → T2
- `R3` (AC3) When deltas arrive, the system shall concatenate them onto the accumulated html; when a
  delta arrives with **no preceding start** (joining mid-stream), it shall open the block rather than
  discard the markup. → T2, T3
- `R4` (AC4) When `complete` carries a template, the system shall **replace** the accumulated html with
  the authoritative fragment, never append — so a transcript containing only `complete` renders the
  identical document. → T2, T3
- `R5` (AC5) When `complete` carries **no** template (or no `canvas.html`), the system shall delete that
  canvas from the conversation entirely, leaving no half-drawn card, empty card, or drawing indicator;
  a no-template `complete` for an unknown id shall be a no-op, never creating an empty card. → T2, T3
- `R6` (AC6) While a canvas is finished (`isDrawing === false`), the system shall ignore late start /
  delta frames rather than reverting the authoritative fragment. → T2, T3
- `R7` (AC7) When a canvas event carries a non-empty `parentToolUseId` (a subagent's drawing), the
  system shall keep it out of the main conversation, consistent with BUG-001. → T2, T3
- `R8` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and
  `npm run test:packages`, the system shall pass with no build errors, and the new public types shall be
  reachable from the `@asgard-js/core` entry (verified in built `dist/`, with `--skip-nx-cache` so a
  cached build cannot produce a false pass). → T5

> UI rendering (AC8–AC19: sandboxed iframe, CSP, morph, height, skeleton, theme palette) is
> **out of scope** and lives in BUILD-056. Until that lands, a canvas message renders nothing —
> acceptable because this cycle is not released on its own.

---

## Implementation Tasks

- [ ] T1 (R1): `constants/enum.ts` — three `EventType` members + `MessageTemplateType.CANVAS`;
      `types/sse-response.ts` — `CanvasMessageTemplate` joined to the union + the three Fact fields,
      following the existing message-fact shape.
- [ ] T2 (R2–R7): `types/channel.ts` — `ConversationCanvasMessage` into the union;
      `lib/conversation.ts` — three handlers modelled on `onThinking{Start,Delta,Complete}`, carrying
      the terminal guard and the `parentToolUseId` early return. Port the three rules from the
      prototype's `canvasReducer.ts` (it is a reference implementation, not a sketch).
- [ ] T3 (R3–R7): **TDD** — write the failing Vitest cases first, then implement. Minimum set:
      accumulate deltas; delta-without-start; complete replaces (assert a complete-only sequence equals
      the fully streamed one); complete-without-template deletes; no-template complete for an unknown id
      is a no-op; late start / delta after complete are ignored; `parentToolUseId` frames dropped.
- [ ] T4 (R1, R2): export the new public types from the core entry with explicit `export type`.
- [ ] T5 (R8): `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` +
      `npm run build:core && npm run build:react` + `npm run test:packages`; confirm the new types in
      `packages/core/dist` after a `--skip-nx-cache` rebuild.

---

## Coverage

Use Cases: UC-051 / UC-052 / UC-053 (data layer only; their UI halves belong to BUILD-056). UC-054 is
entirely BUILD-056. R1–R8.

Files:

**`@asgard-js/core`**

- `packages/core/src/constants/enum.ts` — three `EventType` members + `MessageTemplateType.CANVAS`
- `packages/core/src/types/sse-response.ts` — `CanvasMessageTemplate` + union entry + three `Fact` fields
- `packages/core/src/types/channel.ts` — `ConversationCanvasMessage` + union entry
- `packages/core/src/lib/conversation.ts` — dispatch cases, `isTerminalCanvas`, and
  `onCanvasStart` / `onCanvasDelta` / `onCanvasComplete`
- `packages/core/src/lib/canvas-stream.spec.ts` (new, 12 cases)

**`@asgard-js/react`**

- `packages/react/src/components/chatbot/chatbot-body/conversation-message-renderer.tsx` — a
  `type === 'canvas'` early return. **Not UI work**: the new union member otherwise reaches
  `message.message.template` and throws at runtime; TypeScript caught it (6 errors) and this narrows it
  out the same way the existing `'subagent'` branch does. The card itself is BUILD-056.

---

## Execution Log / Change Log

- 2026-08-12: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/66 (Status: `draft`).
- 2026-08-12: Plan confirmed by user; split into BUILD-055 (core) / BUILD-056 (react) (Status: `draft → ready`).
- 2026-08-12: Implementation started (Status: `ready → in-progress`).
- 2026-08-12: Wire contract re-verified against `asgard-sdk-go@v1.7.4` source (event names, deltas in
  `message.text`, `MessageTemplateCanvas{Html}`, `CANVAS` constant) rather than taken from the spec text.
- 2026-08-12: TDD — 12 cases written red first, then implemented. Mutation-tested the two rules that
  matter: turning `complete` into an append fails 3 cases (including the complete-only-equals-streamed
  rejoin guarantee); removing the terminal guard fails 1. typecheck / lint (0 errors) / format / build
  green; core 208 (+12) / react 217. `--skip-nx-cache` rebuild confirms the new types and enum members
  in `dist` (a cached build had previously produced a false pass on BUILD-052). (Status: `in-progress → done`).
