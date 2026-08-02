# REVIEW-036 Review: Materialize a replayed tool-call from its complete frame

## Meta

- Task ID: `REVIEW-036`
- Status: `done`
- BUILD Task: `BUILD-036`
- Reviewed branch: `fix/48-tool-call-complete-replay`

---

## §1 Static Review

| Check                                               | Result                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| No `any`; explicit types at module boundaries       | ✅ The new branch is typed `ConversationToolCallMessage`; no assertion, no `any`     |
| Core stays framework-agnostic (no react/DOM import) | ✅ Pure reducer change                                                               |
| No public API / type change                         | ✅ No new export, no signature change — consumers upgrade without touching code      |
| Existing behaviour preserved                        | ✅ The `if` branch is byte-for-byte unchanged; only an `else` was added              |
| Field parity with `onToolCallStart`                 | ✅ Every field `onToolCallStart` sets is set here too, plus the complete-only fields |
| Tests colocated and meaningful                      | ✅ 5 cases, incl. one that pins the live path against regression                     |
| Prettier / ESLint                                   | ✅ `npx prettier --check` and `npx eslint` clean on both touched files               |
| Type check                                          | ✅ `npx tsc --build packages/core packages/react` exits 0                            |
| Test suite                                          | ✅ `npm run test:packages` — core 164, react 58, all green                           |

**Environment caveat:** `npm run lint:packages` and `npm run typecheck:packages` both abort with Nx Cloud `401 (workspace not connected)`, unrelated to this change. Equivalent checks were run directly (`tsc --build`, `eslint`, `prettier`) and are recorded above.

### Design review

- **The data was already there.** The fix does not guess or synthesize: `ToolCallCompleteEventData extends ToolCallBaseEventData`, so `toolCall.*` and the correlation ids ride on the complete frame. The only unavailable field is the start timestamp, which falls back to "now" exactly as `onToolCallStart` does.
- **Consistent with the reducer's own replay-safety stance.** Neighbouring handlers (`isTerminalBot`, `isTerminalThinking`) already exist specifically so replayed/out-of-order frames behave; this handler was the gap in that policy.
- **Correlation ids deliberately carried.** Dropping `parentToolUseId` would have made the block reappear but silently detached replayed subagent tool-calls from their `Agent` (F-012). R4 pins it.
- **Live path guarded by test, not by inspection.** R5 asserts both `isComplete` and `messages.size === 1`, so a future refactor cannot turn the update path into a duplicate-insert.

---

## §3 Functional Validation

Verified end-to-end in a real product against the real dev backend (rather than only in unit tests), because the failing condition — a rejoin stream that replays terminal frames only — is a backend behaviour that no mock in this repo reproduces.

| R#  | Description                                  | Result  | Evidence                                                                                                                                                                       |
| --- | -------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Lone complete → materialized, correct fields | ✅ Pass | Unit test + live: re-entering the conversation shows `1 個步驟 · 處理 1 個檔案`; expanded it reads `讀取 bug010-verify.txt` (toolName `Read` + `parameter.file_path` survived) |
| R2  | `isError` preserved                          | ✅ Pass | Unit test                                                                                                                                                                      |
| R3  | Sidecar preserved                            | ✅ Pass | Unit test                                                                                                                                                                      |
| R4  | Correlation ids preserved                    | ✅ Pass | Unit test                                                                                                                                                                      |
| R5  | Live path unchanged                          | ✅ Pass | Unit test (single message, completed) + live: sending a fresh tool-using turn still renders one block                                                                          |

Before/after on the same conversation id, same backend data: tool-call block absent → present.

---

## Findings

### Critical / Important

None.

### Minor

- **Replayed tool-calls carry a "now" timestamp**, not the original one, so ordering by `time` across a rejoin is not faithful. Rendering is keyed by `${processId}-${callSeq}` and follows stream order, so nothing visible changes today; if a future feature sorts by `time`, the backend would need to include the original timestamp on the complete frame.
- **Mimir's blank-transcript symptom is out of scope** — see the BUILD scope note. Do not close asgard-sdk-pm#48 on this change alone; re-verify Mimir first.
