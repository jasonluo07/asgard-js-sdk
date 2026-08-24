# REVIEW-067 Review: replayed user attachment metadata

## Meta

- Task ID: `REVIEW-067`
- Status: `done`
- BUILD Task: `BUILD-067`
- Reviewed commit: working tree on top of `981405e69a9c78bbf955641c64196b8495e22687` (uncommitted at review time)
- Reviewed branch: `fix/448-rejoin-attachment-metadata`

---

## §1 Static Code Review

Scope: the files listed in `BUILD-067 ## Coverage`.

### §1.1 Checklist

| Check item                                                                   | Rule                           | Result |
| ---------------------------------------------------------------------------- | ------------------------------ | ------ |
| `any` / `as any`                                                             | FRONTEND_RULE_COMMON §1.1      | ✅     |
| `@ts-ignore` / `@ts-nocheck` / `eslint-disable` to bypass errors             | FRONTEND_RULE_COMMON §1.2      | ✅     |
| `console.log` left in library code                                           | FRONTEND_RULE_COMMON §1.3 §7   | ✅     |
| Hardcoded API key / endpoint / namespace                                     | FRONTEND_RULE_COMMON §1.4      | ✅     |
| RxJS subscription / EventSource / timer teardown                             | FRONTEND_RULE_COMMON §1.5      | ✅ n/a |
| `@asgard-js/react` imports core via the public entry only                    | FRONTEND_RULE_COMMON §1.6      | ✅     |
| `@asgard-js/core` free of `react` / `react-dom` / DOM                        | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅     |
| Public API change goes through `@deprecated`, not removal                    | FRONTEND_RULE_COMMON §1.7      | ✅     |
| New public types exported from the package entry with explicit `export type` | FRONTEND_RULE_COMMON §2.2      | ✅     |
| Template type + enum precede the react component                             | FRONTEND_RULE_COMMON §2.3      | ✅ n/a |
| Uses `botProviderEndpoint`, not the deprecated `endpoint`                    | FRONTEND_RULE_COMMON §2.4      | ✅     |
| Exported functions declare explicit return types                             | FRONTEND_RULE_COMMON §3.1      | ✅     |
| Shared types centralized in core `src/types/`; no duplicate interfaces       | FRONTEND_RULE_COMMON §3.2      | ✅     |
| React component props fully typed                                            | FRONTEND_RULE_COMMON §4.1      | ✅     |
| No hardcoded colors in components (theme / CSS variables)                    | FRONTEND_RULE_COMMON §4.2      | ✅     |
| `react` / `react-dom` stay peerDependencies                                  | FRONTEND_RULE_COMMON §4.4      | ✅     |
| core and react share one version number                                      | FRONTEND_RULE_COMMON §5        | ✅     |
| Repeated logic (≥2×) / types / JSX (≥3×) extracted                           | FRONTEND_RULE_COMMON §6        | ✅     |
| `setTimeout` mock delays, dead commented code, untracked TODO / FIXME        | FRONTEND_RULE_COMMON §7        | ✅     |

Notes on the three that needed a judgment rather than a glance:

- **§1.7 / §3.2 — `BlobFileType` is now shared with `BlobData`.** `BlobData.fileType` previously carried
  an inline union listing `UNKNOWN` but not the `BINARY` the backend actually returns. Both now point at
  one alias holding both values. Widening a union on a _response_ object is additive for every consumer
  that reads it; nothing was removed, renamed, or re-typed, so no `@deprecated` transition is owed. The
  alternative — a second, divergent list next to the first — is the §3.2 violation this avoids.
- **§2.2 — `UserAttachmentChip` / `resolveReplayAttachmentChips` are deliberately _not_ exported.** §2.2's
  second half ("內部實作細節不對外導出") governs here: they are the template's internals, and the thing a
  consumer needs in order to build its own row is the data, which is public (`MessageBlob` via core's
  `export type * from './types'`). `templates/user-image-template/index.ts` is unchanged.
- **§6 — the near-duplicate chip markup is intentional and recorded.** The live `documentNames` card stays
  hand-written rather than folding into the new component. Two occurrences, below the ≥3 threshold, and
  leaving the live one byte-identical is what makes R5 checkable instead of argued (comment in place at
  `user-image-template.tsx`).

### §1.2 Mechanical Grep

```bash
grep -rn ': any\b\|<any>\|as any'                      <coverage-files>   # → empty
grep -rn '@ts-ignore\|@ts-nocheck\|eslint-disable'     <coverage-files>   # → empty
grep -rn 'console\.log'                                <coverage-files>   # → empty
grep -rn "from 'react'\|react-dom"                     packages/core/src/ # → empty
grep -rn '@asgard-js/core/src\|core/src/lib'           packages/react/src/# → empty
grep -rn 'TODO\|FIXME'                                 <coverage-files>   # → empty
grep -rn 'setTimeout'                                  <coverage-files>
grep -rn '#[0-9a-fA-F]\{3,6\}\|rgba('                  <coverage-files>
```

The last two are the only non-empty ones, and neither is a violation:

- `setTimeout` → `apps/react-demo/src/mock-server/sse-mock.ts:33`, the mock server's pre-existing `sleep`
  helper. Not library code, and not a fake delay standing in for real work.
- Color literals → two groups. **Pre-existing library values** in
  `user-image-template.module.scss` (`#4767eb` at 17, `rgba(...)` at 36 / 37 / 92 / 105) — this task only
  added `width` / `height` to `.document_icon`, so they are inherited, not introduced (worth a separate
  cleanup, noted under Minor). **Demo-only values** in `attachment-rejoin.module.scss` (`#888`, `#1677ff`),
  copied from the sibling `question-template` route's locale switcher; §4.2 governs library components'
  theming, and every demo route styles its own chrome this way. Everything else the grep printed is an
  issue number in a comment (`#448`, `#422`, `#382`, `#206`), not a color.

### §1.3 TypeScript and Lint

```
tsc --noEmit:      PASS (exit 0)
npm run typecheck: PASS — core + react + react-demo (the gate that actually fails on a type error)
npm run lint:packages: PASS — 0 errors, 5 warnings, all five in files this task never touched
  (chat-composer.tsx, file-explorer/file-view.tsx, per-source-view-state.spec.tsx,
   source-set-explorer/file-view.tsx, canvas-runtime-behavior.spec.ts)
npm run format:check:  PASS — all matched files use Prettier code style
npm run build:core && npm run build:react: PASS
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅/❌ — 19 items, **0 violations**
- [x] No ❌ violations to list
- [x] All §1.2 grep commands run; the two non-empty outputs analyzed above
- [x] `npx tsc --noEmit` — no TypeScript errors
- [x] `npm run lint:packages` — no ESLint errors

---

## §3 Functional Validation

Harness: Vitest for the reducer and the template (`npm run test:packages` — 353 react / 252 core,
**+13 from this task**), plus the react-demo `/attachment-rejoin` route at
`npm run serve:react-demo -- -- --port 5100` for the rendered result, and `/composer` for the live send.
No e2e suite exists in this repo.

### R# Result Matrix

| R#  | Description                                                                               | Result | Note                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `blobs` carried verbatim to `ConversationUserMessage`, `undefined` when the key is absent | Pass   | `conversation.spec.ts` — 2 cases. Absent key stays `undefined` (not `[]`), which is what lets the renderer tell an un-backfilled row apart.                                                        |
| R2  | One chip per blob, labelled with `fileName`, stand-in when it is `null`                   | Pass   | Unit + browser: `file:quarterly.txt` and `image:圖片` for the pure-attachment turn, in both shells.                                                                                                |
| R3  | `IMAGE` → image glyph, no bytes fetched; any other value → file glyph, no throw           | Pass   | `container.querySelector('img')` is null in the unit test and `0` `<img>` in the live DOM. `VIDEO` / `BINARY` / an invented `'HOLOGRAM'` all render as file chips.                                 |
| R4  | `blobIds` with no `blobs` → one neutral chip per id, bubble exists                        | Pass   | Unit + browser (`unknown:附件`). This is the backend's one hard requirement, and the reason the third replayed turn is visible at all.                                                             |
| R5  | Live send path renders exactly as before, no replay chip beside it                        | Pass   | 2 unit cases green **before and after** the change (the regression guards), plus a real pick on `/composer`: 1 image preview + the `quarterly.txt` card + the text bubble, and **0** replay chips. |
| R6  | Empty-`text` turn still renders a visible bubble                                          | Pass   | Browser before/after is the evidence: pre-fix, turns 1 and 3 rendered as empty bubbles with the agent's reply sitting under nothing; post-fix both carry chips.                                    |
| R7  | Stand-in labels come from the catalog, all three locales                                  | Pass   | Unit for zh-TW / ja-JP; browser locale switch gave `圖片`/`附件`, `画像`/`添付ファイル`, `Image`/`Attachment`.                                                                                     |
| R8  | Smoke: builds, typecheck, tests, demo walk at both widths                                 | Pass   | See §1.3. Demo walked at the full-bleed wide shell and the 375×640 default side by side; identical chip sets in both.                                                                              |

### §3.1 Acceptance

- [x] All R# executed (static read + browser operation + boundary conditions)
- [x] Each R# marked Pass
- [x] No e2e spec exists for these paths (none in the repo)
- [x] Boundary conditions confirmed: `blobs` absent, `blobs: []` with ids present (falls to the neutral
      chip), `fileName: null`, `fileName: ''` / whitespace (see Findings), an unknown `fileType`, empty
      `text`, and the live path with previews only vs documents only

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

1. **A blank `fileName` rendered a chip with no label.** _(fixed during this cycle — BUILD side)_
   The backend keeps `''` distinct from `null` so the renderer can decide what to do; the first
   implementation honored that literally and only substituted for `null`. A chip whose label is `''` is a
   glyph with nothing beside it, which reads as a broken chip rather than as a nameless file. Blank now
   earns the stand-in as well (`fileName?.trim()`), pinned by a new case covering `''` and `'   '`.
   `packages/react/src/components/templates/user-image-template/user-attachment-chip.tsx`

### Minor (nice to have)

1. **Pre-existing hardcoded colors in `user-image-template.module.scss`** (`#4767eb` at 17, `rgba(...)` at
   36 / 37 / 92 / 105). Inherited, not introduced here — the user bubble's blue should come from the theme
   like the rest of the layer. Out of scope for #448; worth its own ticket.
2. **Image thumbnails are still absent by design.** Phase 1 has no URL to fetch bytes from, so a replayed
   image is a chip. Depends on the backend's Phase 2 (`GetBlobLink` wrapped in REST) tracked on
   `asgard-ai-platform/asgard-sindri-pm#206`. Not a defect in this cycle.

---

## Execution Log

- 2026-08-24: REVIEW task created, paired with BUILD-067 (Status: `draft`).
- 2026-08-24: §1 Static review — 19 items, 0 violations; greps clean apart from two analyzed
  non-violations; `tsc` / `typecheck` / `lint:packages` / `format:check` / builds all green
  (Status: `draft → in-progress`).
- 2026-08-24: §3 boundary pass found the blank-`fileName` gap (Important #1). Routed back to the BUILD
  task, fixed there, `replay-attachments.spec.tsx` grew a case for `''` / `'   '`, and §1 + §3 were
  re-run green afterwards.
- 2026-08-24: §3 complete — R1–R8 all Pass; 605 tests green (core 252 / react 353) (Status:
  `in-progress → done`).
