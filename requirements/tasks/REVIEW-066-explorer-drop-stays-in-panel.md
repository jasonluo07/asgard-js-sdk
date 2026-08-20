# REVIEW-066 Review: keep a File Explorer file drop inside the panel

## Meta

- Task ID: `REVIEW-066`
- Status: `done`
- BUILD Task: `BUILD-066`
- Reviewed commit: `f201cb86`
- Reviewed branch: `fix/446-explorer-drop-stays-in-panel`

---

## §1 Static Code Review

Scope = the files in `BUILD-066 ## Coverage`. `lint` / `format` / `typecheck` / `build` run project-wide.

### §1.1 Checklist

| Check item                                                              | Rule                           | Result                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `any` / `as any`                                                        | FRONTEND_RULE_COMMON §1.1      | ✅ — none. The two `as unknown as DataTransfer` in `drop-propagation.spec.tsx` build fake drag payloads, matching the existing `fakeDataTransfer` helper in `pick-upload.spec.ts`; test scaffolding, not production typing. The one pre-existing cast kept in `onDragLeave` is `relatedTarget as Node \| null`, unchanged by this task |
| `@ts-ignore` / `@ts-nocheck` / `eslint-disable` used to bypass errors   | FRONTEND_RULE_COMMON §1.2      | ✅ — none added anywhere in the diff                                                                                                                                                                                                                                                                                                   |
| `console.log` left in library code                                      | FRONTEND_RULE_COMMON §1.3 §7   | ✅ — grep empty across all four Coverage files                                                                                                                                                                                                                                                                                         |
| Hardcoded API key / endpoint / namespace                                | FRONTEND_RULE_COMMON §1.4      | ✅ — nothing in this diff names an endpoint; the demo keeps using the existing `MOCK_ENDPOINT` constant through `config.botProviderEndpoint`                                                                                                                                                                                           |
| RxJS subscription / EventSource / timer teardown                        | FRONTEND_RULE_COMMON §1.5      | ✅ n/a — no subscription, `EventSource` or timer is created. The change is four synchronous DOM event handlers                                                                                                                                                                                                                         |
| `@asgard-js/react` imports core via its public entry only               | FRONTEND_RULE_COMMON §1.6      | ✅ — no new import; grep for `core/src` is empty                                                                                                                                                                                                                                                                                       |
| `@asgard-js/core` free of `react` / `react-dom` / DOM                   | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅ — `packages/core` is not touched by this task at all                                                                                                                                                                                                                                                                                |
| Public API change goes through `@deprecated`                            | FRONTEND_RULE_COMMON §1.7      | ✅ — see Minor 1. `DropZoneProps` gains a member, which is additive for every consumer that can reach it (it is only ever read off `FileExplorerContextValue` and spread onto an element; the provider is the sole producer). `FileExplorerBody` no longer carries the handlers — a behavior change, not a signature change            |
| New public types / functions / components exported from the entry       | FRONTEND_RULE_COMMON §2.2      | ✅ n/a — no new public type, function or component. Export surface is byte-identical                                                                                                                                                                                                                                                   |
| Message-template prerequisites (type + enum before component)           | FRONTEND_RULE_COMMON §2.3      | ✅ n/a — no message template added                                                                                                                                                                                                                                                                                                     |
| Uses `botProviderEndpoint`, not `endpoint`                              | FRONTEND_RULE_COMMON §2.4      | ✅ — the demo's built-in-aside chatbot already used `botProviderEndpoint`; unchanged                                                                                                                                                                                                                                                   |
| Exported functions declare explicit return types                        | FRONTEND_RULE_COMMON §3.1      | ✅ — `serves(): boolean`, `claim(): void`, all four handlers `: void`, and every helper and component in the new spec is annotated (the ESLint rule is on and reports nothing)                                                                                                                                                         |
| Shared types centralized; no duplicate interfaces                       | FRONTEND_RULE_COMMON §3.2      | ✅ — `DropZoneProps` stays the single declaration; no type is copied                                                                                                                                                                                                                                                                   |
| React component props fully typed                                       | FRONTEND_RULE_COMMON §4.1      | ✅ — `FileExplorerRoot` / `FileExplorerBody` props unchanged and typed; the spec's `Shell` / `Harness` props are explicit interfaces                                                                                                                                                                                                   |
| Hardcoded color values in components                                    | FRONTEND_RULE_COMMON §4.2      | ✅ — no color literal in any `.ts` / `.tsx` under `packages/`. The three grep hits there are the text `#446` (a GitHub issue number) inside comments. The `#666` hits are demo copy in `apps/react-demo`, matching the twelve pre-existing paragraphs in the same file; the rule's grep scopes to `packages/react/src`                 |
| `react` / `react-dom` stay peerDependencies                             | FRONTEND_RULE_COMMON §4.4      | ✅ — `packages/react/package.json` untouched, both still peers only                                                                                                                                                                                                                                                                    |
| core / react version parity                                             | FRONTEND_RULE_COMMON §5        | ✅ — both `0.3.69`, peer pin `0.3.69`; untouched by this task                                                                                                                                                                                                                                                                          |
| Repeated logic (≥2×) / JSX (≥3×) extracted                              | FRONTEND_RULE_COMMON §6        | ✅ — improved by this task. The guard pair that opened three of the four handlers is now one `serves()`, the `preventDefault` + `stopPropagation` pair is one `claim()`, and `FileExplorerBody`'s second copy of the "can this panel upload, and is the tree on screen" condition is gone (it now keys on `dropping` alone)            |
| `setTimeout` mock delays / commented dead code / untracked TODO / FIXME | FRONTEND_RULE_COMMON §7        | ✅ — greps for `setTimeout`, `TODO` and `FIXME` are all empty across the Coverage files; no commented-out code left behind                                                                                                                                                                                                             |

**19 ✅ / 0 ❌.**

### §1.2 Mechanical Grep

Scoped to the four Coverage files; the two §1.6 greps run over whole packages as the rule specifies.

```
### any / as any                 (no output)
### ts-ignore / eslint-disable   (no output)
### console.log                  (no output)
### setTimeout                   (no output)
### TODO / FIXME                 (no output)
### core imports react           (no output)
### react deep-imports core      (no output)
### hardcoded colors
  drop-propagation.spec.tsx:12,132,197   → the text "#446" in comments / describe titles
  file-explorer-context.tsx:48,565       → the text "#446" in comments
  file-explorer-context.tsx:226          → the text "#427", pre-existing comment
  apps/react-demo/.../file-explorer.tsx  → 12 pre-existing + 2 new `color: '#666'` demo paragraphs,
                                            outside the rule's `packages/react/src` scope
```

### §1.3 TypeScript and Lint

```bash
npm run typecheck        # core + react + react-demo (tsc --build); the repo's real type gate
npm run lint:packages    # ESLint, core + react
npm run format:check     # Prettier
npm run build:core && npm run build:react
```

Results:

```
typecheck:      PASS — "Successfully ran target typecheck for 3 projects"
lint:packages:  PASS — 5 problems (0 errors, 5 warnings); all five are pre-existing warnings in files
                outside this diff. `npx eslint` over the four Coverage files reports nothing at all
format:check:   PASS for every tracked file. The single [warn] is `CLAUDE.local.md`, an untracked and
                gitignored private notes file that fails identically on `main`
build:          PASS — both packages built; the "[vite:dts] Outside emitted" lines are the usual
                pre-existing dts noise, not errors
test:packages:  PASS — core 250/250, react 342/342 (+6 from this task)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅/❌
- [x] No ❌ violations to list
- [x] All §1.2 grep commands run and output pasted
- [x] Type gate run — no TypeScript errors
- [x] `lint` run — no ESLint errors

---

## §3 Functional Validation

Harness: the new Vitest suite plus the react-demo `/file-explorer` route
(`npm run serve:react-demo -- -- --port 5100`). There is no e2e suite in this repo.

External file drops cannot be produced by CDP synthetic mouse events, so they are driven by dispatching
a real `DragEvent` carrying a populated `DataTransfer` at the target element. Native bubbling and React's
delegation then run untouched — and since propagation is precisely what this task changes, the synthesized
event exercises the real path rather than standing in for it.

### R# Result Matrix

| R#  | Description                                                                       | Result | Note                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | A served drop uploads only; nothing reaches the composer                          | Pass   | Dropped 2 `.txt` on the tree area: `Upload finished 2 / 2`, both files in the tree, zero composer chips. Unit: "uploads the batch without also attaching it to the composer" (asserts the destination dir too)                                     |
| R2  | Enter / over / leave stay inside the panel; no shell overlay beside the highlight | Pass   | Hovering the panel shows only `Drop to upload to /home/user/project`; the shell's `_overlay_` element is not mounted at all. Unit: "keeps the shell overlay dark while its own highlight is up"                                                    |
| R3  | Crossing out to the chat column still attaches; the shell counter tells the truth | Pass   | Four-step walk on the live chatbot: thread → overlay on, panel off; onto panel → overlay off, panel on; back to thread → overlay on, panel off; drop → overlay off, one chip, nothing uploaded. Unit: "leaves the shell counter telling the truth" |
| R4  | An unservable drag passes through untouched                                       | Pass   | With a file view open the panel declines: the shell overlay lights, the panel highlight does not, and the drop becomes a composer chip with no upload. Units: no-upload-provider and no-files-in-the-drag cases (both passed before the fix too)   |
| R5  | A drop anywhere on the panel behaves like a drop on the tree                      | Pass   | Toolbar, header strip and the upload progress panel each uploaded, composer stayed clean. Also confirmed on the standalone panels at 989px and 343px (toolbar drop on the narrow one). Unit: "serves a drop anywhere on the panel"                 |
| R6  | (Smoke) build + suites + demo walk at both widths, no F-031 regression            | Pass   | Builds and 592 tests green; the F-031 wide/narrow pair still highlights and uploads from both the tree and the toolbar, and the batch progress panel still reports `上傳完成 1 / 1`                                                                |

### §3.1 Acceptance

- [x] Every R# executed (static read + browser operation + boundary conditions)
- [x] Each R# marked Pass
- [x] No e2e spec exists for this route; Vitest + demo used instead
- [x] Boundary conditions confirmed: no upload provider, file view open, non-file drag, drag leaving the
      window (`relatedTarget === null`), and a drop while a batch's progress panel is on screen

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **[§1.7, informational] A host that composes `FileExplorerBody` without `FileExplorerRoot` loses the
   drop zone.** Moving the spread to the root means the zone now travels with the root part. No such host
   can exist in practice: `FileExplorerRoot` is what binds `rootRef` (the positioned ancestor the context
   menu clamps within) and what mounts the confirm/prompt dialog and the upload progress panel, so an
   assembly without it is already broken in three louder ways. Recorded rather than acted on.

2. **[demo] The composer's own attachment upload 404s on this route.** Dropping into the thread renders
   the chip and then fails `POST /mock-asgard/blob:0`, because the `/file-explorer` mock implements the
   sandbox fs endpoints only. Pre-existing and outside this task's scope — the chip's presence is the
   observable R3 and R4 need — but a follow-up could stub that endpoint so the route has no red console.

---

## Execution Log

- 2026-08-20: REVIEW task created, paired with BUILD-066 (Status: `draft`).
- 2026-08-20: BUILD-066 reached `done`; REVIEW moved to `ready`, then `in-progress` for this pass.
- 2026-08-20: §1 complete — 19 ✅ / 0 ❌; typecheck / lint / format / build / test all green.
  §3 complete — R1–R6 all Pass, 0 BLOCKERs; two Minor findings recorded, neither blocking
  (Status: `in-progress → done`).
