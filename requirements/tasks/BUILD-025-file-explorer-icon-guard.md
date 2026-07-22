# BUILD-025 Guard the File Explorer glyphs against drift

## Meta

- Task ID: `BUILD-025`
- Status: `done`
- Issue: — (internal tech debt, surfaced during the F-021 Cycle 2 review; no PM issue)
- Source spec: — (driven by the REVIEW-024 icon audit)
- Complexity: `S`

---

## Brief

`@asgard-js/react` carries no `lucide-react` dependency and hand-inlines every glyph. Nothing in the
toolchain looks at path data — build, lint and Vitest never did — so a hand-copy mistake ships silently.
That produced **five defects** in the F-021 Cycle 2 File Explorer alone, all fixed in REVIEW-024: a wrong
variant (`trash` for `trash-2`), a mirrored `clipboard-paste`, an alias mix-up (`Code2` resolves to
`code-xml`, not `code`), and two glyphs simply missing (`folder-open`, `folder-tree`).

**Scope decision.** An earlier draft of this task proposed taking a real `lucide-react` dependency and
deleting the inlined copies. That was **dropped** for two reasons:

1. **It would make fidelity worse, not better.** The 24 File Explorer glyphs already match the chat-kit
   prototype exactly — verified 0/24 mismatch against the pinned `lucide-react@0.487.0` source, comparing
   full geometry (including `line` / `circle` / `rect`, not just `d`) and resolving alias re-exports. A
   dependency cannot be pinned to 0.487.0 in practice: `streamdown` requires `^0.542.0`, and with the
   package externalized the consumer's resolution wins. In 0.542.0 `clipboard-paste` is genuinely redrawn
   (`v1.344` / `m17 18 4-4-4-4`), so migrating would **un-align** a glyph that currently matches.
2. **The remaining defects are out of scope.** Four glyphs in `tool-call-group.tsx` match no lucide glyph
   in either version (a hand-written `chevron-right`, a **stale `copy`** at `9,9,13×13` where lucide uses
   `8,8,14×14`, and `maximize-2` / `x` merged into single paths). The user scoped this task to the new
   feature's icons and explicitly left the pre-existing components alone.

So the task narrows to what actually helps: **freeze the verified-correct File Explorer glyphs behind a
test**, so the drift that already happened cannot recur silently.

---

## Relevant Rules

| §    | Rule (summary)                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — the spec's helpers are fully typed                                                   |
| §1.7 | Test-only; no public API, props, type or runtime behavior change                                |
| §3.2 | The expectation is frozen in the spec, not read from `references/` (a submodule, may be absent) |

---

## Acceptance Criteria

- `R1` A Vitest spec renders every glyph exported from `file-explorer/icons.tsx` and asserts its geometry
  (element order + all geometry attributes) equals the matching `lucide-react@0.487.0` glyph — the version
  the chat-kit prototype pins. → T1
- `R2` The expectation is **frozen in the spec file**, not read from `references/asgard-chat-kit-prototype`
  (a git submodule that needs an explicit `--init` and is absent in a fresh clone). Provenance and the
  reason for the 0.487.0 pin are documented in the file header. → T1
- `R3` Adding a glyph without adding its expectation fails the suite (a coverage assertion compares the
  exported names against the expectation keys). → T1
- `R4` The suite is runnable from the repo root and demonstrably catches injected drift. → T2, T3

---

## Implementation Tasks

- [x] T1 (R1, R2, R3): `packages/react/src/components/chatbot/file-explorer/icons.spec.tsx` — render via
      `react-dom/server`, serialize `tag{attr=value,…}` in document order, compare against the frozen
      `EXPECTED` table; plus the coverage assertion.
- [x] T2 (R4): root scripts `test:core` / `test:react` / `test:packages` (mirrors the `lint:*` naming);
      document them in `AGENTS.md`.
- [x] T3 (R4): negative check — remove `trash-2`'s two blade lines (the exact defect that shipped) and
      confirm the suite fails, then restore.

---

## Coverage

Use Cases: R1, R2, R3, R4

Files:

- `packages/react/src/components/chatbot/file-explorer/icons.spec.tsx` (new) — the guard.
- `package.json` — `test:core`, `test:react`, `test:packages` scripts.
- `AGENTS.md` — document the test commands.

---

## Notes / Open Questions

- **Known limit.** This freezes a state that was _independently verified_ correct against the prototype, so
  it locks in a good baseline — but it cannot by itself catch "the wrong lucide variant was chosen in the
  first place", since the expectation would be written from the same mistaken reading. That original
  verification is the audit recorded in REVIEW-024, not this test.
- **Not covered.** `tool-call-group.tsx` (15 glyphs, 4 of them wrong today), `subagent-list.tsx`,
  `task-list.tsx`, `channel-title.tsx` — deliberately out of scope. The stale `copy` glyph in
  `tool-call-group.tsx` remains a real, shipped defect and is recorded here so it is not lost.

---

## Execution Log / Change Log

- 2026-07-22: task created as "replace inlined glyphs with a `lucide-react` dependency" (Status: `ready`).
- 2026-07-22: **scope revised and completed** (Status: `ready → done`). The dependency migration was dropped
  after establishing that `streamdown` pins `^0.542.0`, that the pin cannot be overridden once the package is
  externalized, and that 0.542.0's redrawn `clipboard-paste` would break a glyph that currently matches the
  prototype exactly. Narrowed to the guard test. Verified: 25/25 pass (24 glyphs + coverage); removing
  `trash-2`'s blade lines fails `TrashIcon` as intended; `npm run test:packages` green (core 126/126,
  react 25/25); build + lint green.
