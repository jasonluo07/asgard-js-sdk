# REVIEW-062 Review: narrow the default content column to a readable measure

## Meta

- Task ID: `REVIEW-062`
- Status: `ready`
- BUILD Task: `BUILD-062`
- Reviewed commit: `<git commit SHA>`
- Reviewed branch: `<branch-name>`

---

## §1 Static Code Review

Scan BUILD task `## Coverage` files against `FRONTEND_RULE_COMMON.md`. No server needed.

### §1.1 Checklist

| Check item                                                                                                    | Rule                           | Result  |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------- |
| SVG path strings inlined into components                                                                      | FRONTEND_RULE_COMMON §1.1      | ✅ / ❌ |
| Inline style magic numbers (e.g., `minHeight: 'calc(...)'`)                                                   | FRONTEND_RULE_COMMON §1.2      | ✅ / ❌ |
| Hardcoded color values (hex / rgba / oklch literal)                                                           | FRONTEND_RULE_COMMON §1.3      | ✅ / ❌ |
| `<style>` tag injected into JSX                                                                               | FRONTEND_RULE_COMMON §1.4      | ✅ / ❌ |
| Module-level mutable ID counters                                                                              | FRONTEND_RULE_COMMON §1.5      | ✅ / ❌ |
| Login backdoor outside `NODE_ENV === 'development'` guard                                                     | FRONTEND_RULE_COMMON §1.6      | ✅ / ❌ |
| Sensitive data passed through URL query strings                                                               | FRONTEND_RULE_COMMON §1.7      | ✅ / ❌ |
| `page.tsx` is thin (params + navigation only; no main UI JSX)                                                 | FRONTEND_RULE_COMMON §2.1      | ✅ / ❌ |
| Feature components in `src/components/{feature}/`; no `screens/` dir                                          | FRONTEND_RULE_COMMON §2.1      | ✅ / ❌ |
| TypeScript type (`src/types/`) and API module (`src/api/`) exist before first use                             | FRONTEND_RULE_COMMON §2.2      | ✅ / ❌ |
| API calls routed through `src/api/` domain module; no direct axios in components                              | FRONTEND_RULE_COMMON §3.2      | ✅ / ❌ |
| Server state via TanStack Query; `isLoading` / `isError` both handled                                         | FRONTEND_RULE_COMMON §3.3 §3.4 | ✅ / ❌ |
| Forms use RHF + Zod; no bare `useState` fields; field-level error messages                                    | FRONTEND_RULE_COMMON §3.5      | ✅ / ❌ |
| Zustand store does not hold server data                                                                       | FRONTEND_RULE_COMMON §2.1      | ✅ / ❌ |
| No `as any`; no `eslint-disable` / `@ts-ignore` to bypass type errors                                         | FRONTEND_RULE_COMMON §4.1 §4.2 | ✅ / ❌ |
| Shared types centralized in `src/types/`; no duplicate interfaces across files                                | FRONTEND_RULE_COMMON §4.3 §4.4 | ✅ / ❌ |
| Size magic numbers repeated ≥3× extracted to a named constant                                                 | FRONTEND_RULE_COMMON §5.2      | ✅ / ❌ |
| Dates use dayjs + `src/constants/formats.ts` constants                                                        | FRONTEND_RULE_COMMON §5.2      | ✅ / ❌ |
| All user-facing text via `useTranslations()` / `t()`; synced to `messages/zh-TW.json` + `messages/en-US.json` | FRONTEND_RULE_COMMON §5.3      | ✅ / ❌ |
| Repeated Tailwind class groups (≥3×), JSX fragments (≥3×), logic (≥2×) extracted                              | FRONTEND_RULE_COMMON §6        | ✅ / ❌ |
| No `setTimeout` mock delays                                                                                   | FRONTEND_RULE_COMMON §7        | ✅ / ❌ |
| No `console.log` (except error boundary logging)                                                              | FRONTEND_RULE_COMMON §7        | ✅ / ❌ |
| No untracked TODO / FIXME                                                                                     | FRONTEND_RULE_COMMON §7        | ✅ / ❌ |

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

# BUILD-062 specific — no stale content-column literal survives
grep -rn '1200px' packages/react/src
```

Grep results:

```
<paste output here>
```

### §1.3 TypeScript and Lint

```bash
npm run typecheck
npm run lint:packages
```

Results:

```
typecheck: PASS / FAIL — <paste output if any errors>
lint:      PASS / FAIL — <paste output if any errors>
```

### §1.4 Static Review Acceptance

- [ ] All §1.1 items checked and marked ✅/❌
- [ ] All ❌ violations listed with file path and line number
- [ ] All §1.2 grep commands run and output pasted
- [ ] `npm run typecheck` run — no TypeScript errors
- [ ] `npm run lint:packages` run — no ESLint errors

Any ❌ violation → report BLOCKER to BUILD task; re-run §1 after fix.

---

## §3 Functional Validation

Validate each R# from BUILD task against the running react-demo (`npm run serve:react-demo`, http://localhost:4200).

### R# Result Matrix

| R#  | Description                                                             | Result                | Note                               |
| --- | ----------------------------------------------------------------------- | --------------------- | ---------------------------------- |
| R1  | Default cap is 800px on thread / docked strip / composer                | Pass / Fail / Blocked | `<actual vs expected if not Pass>` |
| R2  | Consumer `contentMaxWidth` override still wins verbatim                 | Pass / Fail / Blocked |                                    |
| R3  | Column < 800px unaffected; `$chat-gutter` unchanged at every width      | Pass / Fail / Blocked |                                    |
| R4  | SCSS and inline default agree; no `1200px` left in `packages/react/src` | Pass / Fail / Blocked |                                    |
| R5  | README default-theme block documents `'800px'`                          | Pass / Fail / Blocked |                                    |
| R6  | (Browser smoke test) wide + narrow walk, measured chars/line            | Pass / Fail / Blocked |                                    |

### §3.1 Acceptance

- [ ] All R# in BUILD task `## Coverage` executed (Step 1 static read + Step 2 browser operation + Step 3 boundary conditions)
- [ ] Each R# marked Pass / Fail / Blocked with explanation
- [ ] Loading, error, and empty-state boundary conditions confirmed

Any Fail → BLOCKER to BUILD task; describe [actual behavior] vs [expected behavior].

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

None.

---

## Execution Log

- 2026-08-15: REVIEW task created, paired with BUILD-062 (Status: `draft`).
