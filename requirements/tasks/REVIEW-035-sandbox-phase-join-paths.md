# REVIEW-035 Wire sandboxPhase into the init and restore join paths

## Meta

- Task ID: `REVIEW-035`
- Status: `done`
- BUILD Task: `BUILD-035`
- Reviewed commit: `c54683b7b9b47db073d1c688b246e124a2d8c669` (working tree — changes not yet committed)
- Reviewed branch: `fix/42-sandbox-phase-join-paths`

---

## §1 Static Code Review

Scan BUILD task `## Coverage` files against `FRONTEND_RULE_COMMON.md`. No server needed.

### §1.1 Checklist

This is a TS SDK library repo, not the Next.js app the generic checklist below was templated from — items about `page.tsx`, TanStack Query, RHF/Zod, Zustand, Tailwind, and `messages/*.json` i18n don't apply to this stack and are marked N/A. Evaluated against the actual `FRONTEND_RULE_COMMON.md` for this repo (§1–§7, TS SDK-specific).

| Check item                                                                                                       | Rule      | Result                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any`                                                                                              | §1.1      | ✅                                                                                                                                                                                                  |
| No `@ts-ignore` / `eslint-disable` to bypass type/lint errors                                                    | §1.2      | ✅ (one pre-existing `eslint-disable-next-line no-console` at `use-channel.ts:410`, not touched by this diff, gated behind `client?.debugMode`)                                                     |
| No `console.log` residue in library code                                                                         | §1.3 / §7 | ✅ (same pre-existing debug-gated line as above; no new `console.log` added)                                                                                                                        |
| No hardcoded API key / endpoint / namespace                                                                      | §1.4      | ✅                                                                                                                                                                                                  |
| Every RxJS subscription / EventSource / timer has teardown                                                       | §1.5      | ✅ (no new subscriptions/timers added; `makeStatesObserver` is a plain callback, no lifecycle to manage)                                                                                            |
| No cross-package deep import / reverse dependency (react → core public entry only; core never imports react/DOM) | §1.6      | ✅ (`use-channel.spec.ts` imports only from `@asgard-js/core`'s public entry, matching `use-channel.ts` itself)                                                                                     |
| No breaking public-API change without `@deprecated`                                                              | §1.7      | ✅ (no public API touched — `makeStatesObserver` is an internal, unexported hook-local helper)                                                                                                      |
| New public types/functions exported from package entry with explicit `export type`                               | §2.2      | N/A (no new public API surface)                                                                                                                                                                     |
| Template type + enum precede react component                                                                     | §2.3      | N/A (no new message template)                                                                                                                                                                       |
| Uses `botProviderEndpoint`, not deprecated `endpoint`                                                            | §2.4      | N/A (not touched)                                                                                                                                                                                   |
| Exported functions declare explicit return types                                                                 | §3.1      | ✅ (`makeStatesObserver` and its returned observer both explicitly typed)                                                                                                                           |
| Shared types centralized in `core/src/types/`; no duplicate interfaces                                           | §3.2      | ✅                                                                                                                                                                                                  |
| React component props fully typed (no `any`)                                                                     | §4.1      | N/A (no component changed — only a hook)                                                                                                                                                            |
| No hardcoded color values                                                                                        | §4.2      | ✅                                                                                                                                                                                                  |
| `react`/`react-dom` stay peerDependencies                                                                        | §4.4      | ✅ (`@testing-library/react` added as a **devDependency**, not a runtime dep — does not affect the published bundle)                                                                                |
| `@asgard-js/core` and `@asgard-js/react` keep the same version number                                            | §5        | ✅ (neither `package.json` version was touched)                                                                                                                                                     |
| Repeated logic (≥2×) / duplicate types / repeated JSX (≥3×) extracted after implementation                       | §6        | ✅ (this _is_ the extraction — three duplicate inline observers → one `makeStatesObserver` factory)                                                                                                 |
| No `setTimeout` mock delay in **library** code                                                                   | §7        | ✅ (the one grep hit, `sse-mock.ts:33`'s `sleep()` helper, is pre-existing demo-app-only tooling predating this diff, not part of any published package; no new `setTimeout` call sites were added) |
| No dead commented code / untracked TODO-FIXME                                                                    | §7        | ✅                                                                                                                                                                                                  |

### §1.2 Mechanical Grep

Run the commands below against directories listed in BUILD task `## Coverage`. Empty output = ✅, any output = ❌.

```bash
# §1.3 hardcoded color values
grep -rn --include="*.tsx" --include="*.ts" '#[0-9a-fA-F]\{3,6\}\|rgba(\|oklch(' <coverage-dirs>

# §1.4 <style> tag injection
grep -rn --include="*.tsx" '<style>' <coverage-dirs>

# §1.7 sensitive data in URL query strings
grep -rn --include="*.tsx" --include="*.ts" 'router\.push.*email=\|router\.push.*token=\|router\.push.*password=\|searchParams.*token' <coverage-dirs>

# §4.1 as any
grep -rn --include="*.tsx" --include="*.ts" 'as any' <coverage-dirs>

# §4.2 eslint-disable / ts-ignore
grep -rn --include="*.tsx" --include="*.ts" 'eslint-disable\|@ts-ignore' <coverage-dirs>

# §5.3 hardcoded Chinese or common UI strings in JSX
grep -rn --include="*.tsx" '>[^\{<]*[一-鿿][^\{<]*<' <coverage-dirs>

# §7 console.log
grep -rn --include="*.tsx" --include="*.ts" 'console\.log' <coverage-dirs>

# §7 setTimeout mock
grep -rn --include="*.tsx" --include="*.ts" 'setTimeout' <coverage-dirs>
```

Scoped to `packages/react/src/hooks/use-channel.ts`, `packages/react/src/hooks/use-channel.spec.ts`, `apps/react-demo/src/mock-server/sse-mock.ts`.

Grep results:

```
=== hardcoded color values ===
(empty)

=== <style> tag injection ===
(empty)

=== sensitive data in URL query strings ===
(empty)

=== as any ===
(empty)

=== eslint-disable / ts-ignore ===
packages/react/src/hooks/use-channel.ts:410:        // eslint-disable-next-line no-console
  ↳ pre-existing (not in this diff — `git diff` shows no changes to this line); gated behind `client?.debugMode`

=== console.log ===
packages/react/src/hooks/use-channel.ts:411:        console.log(
  ↳ same pre-existing debug-gated line as above

=== setTimeout ===
apps/react-demo/src/mock-server/sse-mock.ts:33:  return new Promise(resolve => setTimeout(resolve, ms));
  ↳ pre-existing `sleep()` helper used by dozens of pre-existing demo scenarios in this file; not touched
    or added to by this diff (confirmed via `git diff apps/react-demo/src/mock-server/sse-mock.ts` — the
    diff only adds an `if` branch calling the already-existing `handleSandboxHudMock`, and parameterizes
    that function's `customChannelId`; zero new `setTimeout` call sites)
```

Both hits pre-date this diff and are outside `## Coverage`'s changed-lines scope — not BLOCKERs for BUILD-035.

### §1.3 TypeScript and Lint

```bash
npx tsc --noEmit
npm run lint:check （唯讀審查用 lint:check；REVIEW_RULE §1.4 對應的 npm run lint 為含 auto-fix 的變體）
```

Note: root `npx tsc --noEmit` is a no-op in this repo (root `tsconfig.json` has `files: []` + project references, so plain `tsc` without `--build` checks nothing) — ran it per the letter of the procedure (exit 0), but the actually meaningful gate is this repo's own `npm run typecheck:packages` (`tsc --build` per package; the command AGENTS.md documents as the one that fails on real type errors, since `vite build` alone exits 0 even with type errors). `npm run lint:check` doesn't exist in this repo either (no such script); ran ESLint directly per package instead (equivalent read-only check, no `--fix`).

Results:

```
npx tsc --noEmit (root):        PASS (exit 0, but checks 0 files — see note above)
npm run typecheck:packages:     PASS — both @asgard-js/core and @asgard-js/react, 0 errors
npx eslint . (packages/react):  PASS — 0 errors, 1 pre-existing warning (file-view.tsx:171, unrelated to this diff)
npx eslint . (packages/core):   PASS — 0 errors, 0 warnings
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅ / N/A (no ❌)
- [x] All ❌ violations listed with file path and line number (none found)
- [x] All §1.2 grep commands run and output pasted
- [x] `npx tsc --noEmit` run — no TypeScript errors (supplemented with `typecheck:packages`, the repo's real gate)
- [x] Lint run — no ESLint errors (`lint:check` doesn't exist in this repo; ran `eslint .` directly per package)

§1 result: **0 BLOCKERs.**

---

## §3 Functional Validation

Validate each R# from BUILD task against the running app (`npm run serve:react-demo`, http://localhost:4200, `/join-init`).

No e2e spec exists for `/join-init` or `use-channel.ts`; validated via the Vitest suite (real React reconciliation via `@testing-library/react`'s `renderHook`, not a mock of the hook itself) plus a manual browser pass.

### R# Result Matrix

| R#  | Description                                                      | Result   | Note                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `initChannel` path tracks sandboxPhase (no longer stuck idle)    | **Pass** | `use-channel.spec.ts` R1: fails on pre-fix code (`expected 'idle' to be 'ready'`), passes post-fix. Verified by stashing the fix and re-running.                                                                                                                                                               |
| R2  | `restoreChannel` path tracks sandboxPhase (no longer stuck idle) | **Pass** | Same test file R2: same fail-before/pass-after result.                                                                                                                                                                                                                                                         |
| R3  | Three paths share one `statesObserver` factory                   | **Pass** | Code inspection: `resetChannel`, `initChannel`, `restoreChannel` all call the single `makeStatesObserver()` (`use-channel.ts:153-163`); no per-path duplicate remains. `resetChannel`'s pre-existing-correct behavior confirmed unchanged (R3 test was already passing pre-fix, still passes post-fix).        |
| R4  | `renderHook` tests cover all 3 paths (idle → launching → ready)  | **Pass** | Independent re-review found and fixed a coverage gap in the first version (it asserted only the terminal `ready` value). The scripted transport now pauses after `sandbox.launch`; all three tests explicitly assert `idle → launching → ready`. `npm run test:react`: 3/3 new tests green, 51/51 total green. |
| R5  | (Browser smoke test) HUD appears on ①③ join-init scenarios       | **Pass** | See detail below.                                                                                                                                                                                                                                                                                              |

**R5 detail:** Independently re-ran the browser check in a headed Chrome session through the DevTools Protocol (no Playwright MCP was available). For Join-Init ① restore, ③ init/no-auto-reset, and the `/sandbox-hud` reset-created channel, each trigger and DOM poll ran atomically in one browser execution. All three mounted `.asgard-sandbox-hud` at ~1.13s with the launching label, changed to ready at ~2.72s, and removed the HUD by ~4.19s. Screenshot: `.github/screenshots/bug-006-init-hud-headed.png`. This also reconfirms the earlier correction: the first false-negative was caused by splitting the trigger and poll across tool round-trips and missing the whole display window, not by a product regression.

### §3.1 Acceptance

- [x] All R# in BUILD task `## Coverage` executed (R1–R4: Vitest read + assertion; R5: browser operation + wire-level inspection)
- [x] Each R# marked Pass / Fail / Blocked with explanation
- [x] No e2e spec exists for the changed routes — not applicable
- [x] Boundary conditions confirmed: pre-fix regression check (R1/R2 fail without the fix, R3 still passes — proves the tests target the actual bug and don't false-positive on unrelated code)

All five R# Pass. §3 result: **0 BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None outstanding.

Resolved during the 2026-07-31 independent re-review: the original hook tests sent launch and ready synchronously and asserted only the final `ready` state, so they did not prove R4's intermediate `launching` transition. The scripted client now pauses between the two events and all three paths explicitly assert `idle → launching → ready`.

### Minor (nice to have)

None.

---

## Execution Log

- 2026-07-30: REVIEW task created, paired with BUILD-035 (Status: `draft`).
- 2026-07-30: BUILD-035 reached `done`; REVIEW-035 advanced to `ready` for the review skill to run §1/§3 (Status: `draft → ready`).
- 2026-07-30: §1 Static review — 0 ❌ (2 grep hits, both pre-existing/out-of-diff-scope); `typecheck:packages` + `eslint` both clean (Status: `ready → in-progress`).
- 2026-07-30: §3 Functional validation — R1–R5 all Pass (R1–R4 via Vitest fail-before/pass-after for all 3 creation paths; R5 via an atomic Playwright trigger+poll on Join-Init ①③, correcting an earlier two-call verification method that had produced a false "pre-existing HUD regression" reading). 0 BLOCKERs (Status: `in-progress → done`).
- 2026-07-31: Independent re-review found 1 test-coverage BLOCKER (R4 did not assert `launching`), returned it to BUILD, and verified the correction. Final gates: lint 0 errors (1 unrelated pre-existing warning), format PASS, typecheck PASS, core/react builds PASS, core 159/159 and react 51/51 tests PASS. Headed Chrome atomically verified restore/init/reset HUD timing (~1.13s launching, ~2.72s ready, removed by ~4.19s). 0 BLOCKERs remain (Status remains `done`).
