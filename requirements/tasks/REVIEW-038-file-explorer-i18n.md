# REVIEW-038 Review: Localize the File Explorer and replace its native prompts

## Meta

- Task ID: `REVIEW-038`
- Status: `done`
- BUILD Task: `BUILD-038`
- Reviewed commit: `613d554`, re-reviewed after fixes
- Reviewed branch: `fix/49-file-explorer-i18n`

---

## §1 Static Code Review

Scope for greps: `packages/react/src/components/chatbot/file-explorer/`, `packages/react/src/i18n.ts`
(per `BUILD-038 ## Coverage`). `tsc` / `eslint` run project-wide.

> Note on the procedure: `.claude/skills/review/REVIEW_RULE.md` referenced by the skill does not exist
> in this repo (the skill directory holds only `SKILL.md`), and there is no `lint:check` script. The
> checklist and grep list below are taken from `_review_template.md`; lint was run as read-only
> `npx eslint .` rather than `npm run lint`, which auto-fixes.

### §1.1 Checklist

Rows marked **N/A** target a Next.js application; this repo is a TypeScript SDK library (no routes,
TanStack Query, Zustand, RHF, Tailwind or dayjs). They are recorded rather than silently skipped.

| Check item                                        | Result                                                         |
| ------------------------------------------------- | -------------------------------------------------------------- |
| SVG path strings inlined into components          | ✅ icons live in `icons.tsx`; no new inline SVG                |
| Inline style magic numbers                        | ✅ only `paddingLeft` computed from tree depth (pre-existing)  |
| Hardcoded color values (hex / rgba / oklch)       | ✅ none in `.ts` / `.tsx` — see §1.2a                          |
| `<style>` tag injected into JSX                   | ✅ none                                                        |
| Module-level mutable ID counters                  | ✅ none                                                        |
| Login backdoor outside dev guard                  | ✅ none                                                        |
| Sensitive data in URL query strings               | ✅ none                                                        |
| `page.tsx` thin / feature component layout        | N/A — library, no routes                                       |
| Types exist before first use                      | ✅ `FileExplorerDialogApi` declared and exported with the hook |
| API calls routed through a domain module          | N/A — fs access arrives via injected callbacks                 |
| Server state via TanStack Query                   | N/A                                                            |
| Forms use RHF + Zod                               | N/A — single controlled input in the dialog                    |
| Zustand store does not hold server data           | N/A                                                            |
| No `as any`; no `eslint-disable` / `@ts-ignore`   | ✅ none — see §1.2c / §1.2d                                    |
| Shared types centralized; no duplicate interfaces | ✅ dialog types declared once, in the dialog module            |
| Size magic numbers (≥3×) extracted                | ✅ none introduced                                             |
| Dates via dayjs + format constants                | N/A — no dates                                                 |
| All user-facing text via `t()`                    | ✅ **the point of this task** — zero CJK remains (§1.2e)       |
| Repeated logic (≥2×) / JSX (≥3×) extracted        | ✅ `pasteLabel` hoisted so context menu + toolbar share one    |
| No `setTimeout` mock delays                       | ✅ the 2 hits are a real debounce autosave, cleared on unmount |
| No `console.log`                                  | ✅ none                                                        |
| No untracked TODO / FIXME                         | ✅ none                                                        |

### §1.2 Mechanical Grep

`grep` exit 1 = no match = clean.

```
a. hardcoded colors (.ts/.tsx)      exit=1  (clean)
b. <style> injection                exit=1  (clean)
c. as any                           exit=1  (clean)
d. eslint-disable / @ts-ignore      exit=1  (clean)
e. CJK in JSX text                  exit=1  (clean)
f. console.log                      exit=1  (clean)
g. setTimeout                       exit=0  → 2 hits, both pre-existing:
     file-view.tsx:114  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
     file-view.tsx:118  saveTimer.current = setTimeout(() => { … }, 400);
     Verdict: NOT a violation. This is the debounced autosave, not a mock delay, and it is
     cleared both before rescheduling (line 116) and on unmount (line 125) — §1.5 satisfied.
h. TODO / FIXME                     exit=1  (clean)
```

> Method note: the first run of these greps passed a shell variable holding two paths unquoted. zsh
> does not word-split unquoted variables, so `grep` received one bogus path, failed with
> "No such file or directory", and the `|| echo "(empty ✅)"` fallback printed a **false pass for every
> check**. The results above are from the corrected run with both paths expanded explicitly.

### §1.3 TypeScript and Lint

```
tsc --build packages/core packages/react : PASS (exit 0)
eslint (read-only, project-wide)         : 0 errors, 1 warning
  packages/react/src/components/chatbot/file-explorer/file-view.tsx
    174:6  warning  React Hook useMemo has a missing dependency: 'scheduleSave'  react-hooks/exhaustive-deps
```

The remaining warning is **pre-existing** and deliberately untouched: `scheduleSave` is recreated every
render, so adding it would re-run the memo constantly and change save behaviour — out of scope here.
The `locale` dependency on that same hook _was_ added, because BUILD-038 is what introduced that
reference.

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked, with N/A rows justified
- [x] No ❌ violations
- [x] All §1.2 greps run and output pasted (after correcting the shell-quoting fault)
- [x] `tsc` run — no TypeScript errors
- [x] `eslint` run read-only — no errors

---

## §3 Functional Validation

Harness: no e2e spec covers this area, so validation ran against the react-demo
(`npm run serve:react-demo`, `/file-explorer`) in a real browser, plus Vitest for the locale matrix.

### R# Result Matrix

| R#  | Description                                               | Result | Note                                                                                                                 |
| --- | --------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| R1  | locale from `useAsgardTemplateContext()`, default `en-US` | Pass   | Demo mounts the panel with no provider and renders English — the context default resolved                            |
| R2  | All strings via `t()`; zero CJK in source                 | Pass   | grep §1.2e clean; guard test reads the directory and asserts the same                                                |
| R3  | Keys resolve in all three catalogs                        | Pass   | Vitest asserts each sampled key differs from the key itself in en/ja/zh (79 keys per locale, aligned)                |
| R4  | Missing key falls back to en-US                           | Pass   | Vitest covers both a missing key and a present one                                                                   |
| R5  | create / rename via in-SDK modal, not `window.prompt`     | Pass   | Created `smoke-test-dir` through the modal; tree updated                                                             |
| R6  | delete confirms via the same modal, not `window.confirm`  | Pass   | Delete opened confirm mode: "Delete “smoke-test-dir” and everything inside it?", no input field                      |
| R7  | Tab stays responsive; styling from theme not OS           | Pass   | Page JS ran to completion while the dialog was open (a native dialog would have hung it); themed via `--asg-color-*` |
| R8  | Empty name / dismiss performs no mutation                 | Pass   | Cancel left the entry in place; OK stays disabled while the field is empty                                           |
| R9  | Build + demo smoke                                        | Pass   | `build:core` + `build:react` succeeded; both dialog modes exercised in the browser                                   |

### §3.1 Acceptance

- [x] All R# executed (static read + browser operation + boundary conditions)
- [x] Each R# marked Pass
- [ ] e2e spec — none exists for this area (not applicable)
- [x] Boundary conditions confirmed: empty name disables confirm; cancel is a no-op; a dialog still
      open at unmount resolves as dismissed rather than leaving its caller awaiting forever

**Coverage gap recorded:** ja-JP / zh-TW were **not** verified visually. The demo route mounts
`FileExplorerPanel` without a template-context provider, so it always resolves the `en-US` default;
those two locales rest on unit tests (R3/R4) only. Verifying them in a browser would need either a
locale switch on the demo route or a consumer that sets one.

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Resolved after an independent second review

The first pass of this review missed all of the following; three adversarial subagent audits found
them, each verified by breaking behaviour rather than reading the diff. All are fixed on this branch —
see BUILD-038's execution log for detail.

| Severity | Defect                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| Critical | `{dialog}` missing from the panel's empty-state branch → stranded promise + ghost confirm reappearing unprompted |
| Critical | Enter on the Cancel button confirmed the rename instead of cancelling                                            |
| High     | A second dialog request silently dropped the first `resolve`                                                     |
| High     | Four of the eleven tests could not fail (2 × catalog, CJK guard, native-dialog guard)                            |
| Medium   | `aria-modal=true` falsely claimed modality; the input had no accessible name                                     |
| Medium   | `--asg-color-primary-foreground` is never emitted → confirm button text locked to `#fff`                         |
| Medium   | No keyboard exit once focus left the dialog (no backdrop-click dismiss)                                          |
| Low      | Load-error row in the tree still rendered raw `{error}`, unlocalized                                             |
| Low      | `#2563eb` fallback inconsistent with the directory's 21 other `#4f46e5`                                          |

**Why §1/§3 passed anyway:** every check here is either a static grep or an R#-level behavioural
assertion. None of them exercised a second dialog, a keypress on a non-input target, or an unmount of
one render branch while another held state — and the R# matrix was validated against tests that, for
four of them, could not fail. Mutation testing (five injected regressions, each turning exactly one
test red) is what now backs the suite.

### Minor (nice to have)

1. `file-view.tsx:174` still warns about the missing `scheduleSave` dependency (pre-existing; fixing it
   would alter save behaviour and belongs in its own change).
2. No browser-level verification of ja-JP / zh-TW — see the coverage gap above.

---

## Execution Log

- 2026-08-03: REVIEW task created, paired with BUILD-038 (Status: `draft`).
- 2026-08-03: §1 static review — 22 checklist rows (16 ✅, 6 N/A), 8 greps (7 clean, 1 benign hit),
  tsc PASS, eslint 0 errors / 1 pre-existing warning. §3 functional — 9/9 R# Pass. Zero BLOCKERs
  (Status: `ready → in-progress → done`).
