# REVIEW-057 Stop the File Explorer controller identity loop

## Meta

- Task ID: `REVIEW-057`
- Status: `done`
- BUILD Task: `BUILD-057`
- Reviewed commit: `working tree (uncommitted)` — reviewed before commit at the user's instruction
- Reviewed branch: `fix/427-432-file-explorer-consumer-gaps`

> Checklist source: `.claude/skills/feature-workflow/REVIEW_RULE.md` §1.1 (the SDK-specific table). The
> `_review_template.md` copy carries a Next.js checklist (TanStack Query / Zustand / RHF+Zod / Tailwind)
> that does not apply to this repo; REVIEW_RULE is the authority per the review skill.

---

## §1 Static Code Review

Scope — `BUILD-057 ## Coverage` files:

- `packages/react/src/components/file-explorer/file-explorer-context.tsx`
- `packages/react/src/hooks/use-file-explorer-controller.ts`
- `packages/react/src/components/file-explorer/request-file-loop.spec.tsx`

### §1.1 Checklist

| 檢查項目                                             | 對應規則  | Result                                                              |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------- |
| 有無 `any` / `as any`                                | §1.1      | ✅ none                                                             |
| `@ts-ignore` / `eslint-disable` 規避型別或 lint      | §1.2      | ✅ none in scope                                                    |
| library code 殘留 `console.log`                      | §1.3 §7   | ✅ none in scope                                                    |
| hardcode API key / endpoint / namespace              | §1.4      | ✅ none                                                             |
| RxJS 訂閱 / EventSource / timer 有 teardown          | §1.5      | ✅ n/a — no subscription added; change is dependency-array only     |
| react 只從 core 公開進入點 import                    | §1.6      | ✅ no `core/src` import                                             |
| core 有無 import react / react-dom / DOM             | §1.6 §2.1 | ✅ core untouched; grep over `packages/core/src` empty              |
| 公開 API 變更經 `@deprecated` 過渡                   | §1.7      | ✅ no public signature changed — `FileExplorerController` unchanged |
| 新增公開型別 / 函式從 package 進入點導出             | §2.2      | ✅ n/a — no new public API                                          |
| message template 前置依賴齊備                        | §2.3      | ✅ n/a                                                              |
| 使用 `botProviderEndpoint`                           | §2.4      | ✅ n/a                                                              |
| 導出函式標明 explicit return type                    | §3.1      | ✅ `useFileExplorerController(): FileExplorerController` preserved  |
| 共用型別集中、無跨檔重複 interface                   | §3.2      | ✅ none added                                                       |
| React props 完整型別化                               | §4.1      | ✅                                                                  |
| 元件 hardcode 色值                                   | §4.2      | ✅ none (grep hits were `#427` issue refs in comments — see below)  |
| react / react-dom 維持 peerDependencies              | §4.4      | ✅ unchanged                                                        |
| core 與 react 版本號一致                             | §5        | ✅ both `0.3.64`, untouched                                         |
| 重複邏輯 (≥2) / 型別 / JSX (≥3) 已抽出               | §6        | ✅ no duplication introduced                                        |
| `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME | §7        | ✅ none — the spec deliberately avoids `setTimeout`                 |

### §1.2 Mechanical Grep

Scanned the Coverage directories (`components/file-explorer`, `hooks`):

```
--- any / as any ---            (empty)
--- ts-ignore / eslint-disable --- packages/react/src/hooks/use-channel.ts:424
--- console.log ---               packages/react/src/hooks/use-channel.ts:425
--- core 反向相依 react ---       (empty)
--- react 深挖 core/src ---       asgard-theme-context.tsx:94  (a comment mentioning the path, not an import)
--- <style> / CJK in JSX ---      (empty)
--- setTimeout / TODO / FIXME --- (empty)
```

**Not violations.** The two `use-channel.ts` hits are pre-existing and outside `Coverage.Files` — the grep
scans whole directories per REVIEW_RULE §1.2, which is wider than this task's changed files. The
"hardcoded color" pattern `#[0-9a-fA-F]{3,6}` also matches `#427` in the new comments; all three hits are
issue references, not color literals.

### §1.3 TypeScript and Lint

```
typecheck:packages: PASS — exit 0, "Successfully ran target typecheck for 2 projects"
lint:packages:      PASS — exit 0, 4 problems (0 errors, 4 warnings)
format:check:       PASS — "All matched files use Prettier code style!"
build:              PASS — build:core ✓ 1.41s, build:react ✓ 6.26s
```

The 4 lint warnings are pre-existing and outside scope: `chat-composer.tsx` (`aria-description` on a
textbox role) and `file-view.tsx:183` (`exhaustive-deps` on `scheduleSave`). Neither is in a touched file.

> Deviation recorded: the review skill prescribes `npm run lint:check` and `npx tsc --noEmit`. This repo
> has neither — its lint scripts are `lint:core` / `lint:react` / `lint:packages`, and type checking runs
> through `tsc --build` via `typecheck:packages`. Used the repo's equivalents.

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked
- [x] No ❌ violations in scope
- [x] All §1.2 greps run and output pasted
- [x] Type check run — no errors
- [x] Lint run — no errors

---

## §3 Functional Validation

### R# Result Matrix

| R#  | Description                                         | Result | Note                                                                                                                                                   |
| --- | --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `requestFile()` settles without re-entering         | Pass   | `request-file-loop.spec.tsx` "consumes a file request without re-entering its own effect". Fail-before evidence: `render loop detected` at 50 renders. |
| R2  | Controller identity stable across unrelated renders | Pass   | "survives re-renders that changed nothing". Independently fail-before verified by stashing only the hook: `expected 3 to be 1`.                        |
| R3  | Built-in aside opens an open-file card cleanly      | Pass   | react-demo `/file-explorer` → `simulate-open-file`. Before (stashed): `Maximum update depth exceeded` ×56 at `FileExplorerProvider`. After: 0 errors.  |
| R4  | Tree-click path unchanged (no regression)           | Pass   | Full react suite 42 files / 254 tests green, incl. the pre-existing file-explorer specs.                                                               |
| R5  | Build + demo smoke at both widths                   | Pass   | Verified at wide viewport and at 500px inner width; console clean in both. FileView renders README.md content.                                         |

### §3.1 Acceptance

- [x] All R# executed (static read + browser operation + boundary check)
- [x] Each R# marked with evidence
- [x] Vitest run and passing (2/2 in the new spec; 254/254 for the react package)
- [x] Boundary conditions confirmed — the loop case _is_ the error path; the narrow-viewport variant was walked separately

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **`.spec.*` files are excluded from `typecheck:packages`** (repo-wide, not caused by this task).
   Verified by injecting a deliberate type error into a spec and observing exit 0. Type-level assertions
   written inside tests therefore prove nothing. Worth a separate ticket — `AGENTS.md` presents
   `typecheck:packages` as the command that catches type errors, and this is a real hole in that claim.
2. **The review skill references `REVIEW_RULE.md` at its own directory**, but the file lives at
   `.claude/skills/feature-workflow/REVIEW_RULE.md`. Also, `_review_template.md`'s §1.1 checklist is the
   Next.js one rather than the SDK table in REVIEW_RULE. Both are docs-only papercuts.

---

## Execution Log

- 2026-08-14: REVIEW task created, paired with BUILD-057 (Status: `draft`).
- 2026-08-14: §1 Static review — 19/19 checklist items ✅, 0 violations in scope; all greps run; typecheck / lint / format / build all green (Status: `draft → in-progress`).
- 2026-08-14: §3 Functional validation — R1–R5 all Pass, each with fail-before/pass-after or before/after browser evidence. 0 BLOCKERs; 2 Minor findings recorded, neither caused by this task (Status: `in-progress → done`).
