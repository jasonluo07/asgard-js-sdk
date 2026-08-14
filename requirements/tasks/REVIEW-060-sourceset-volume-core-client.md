# REVIEW-060 Review: a standalone SourceSet volume client in core

## Meta

- Task ID: `REVIEW-060`
- Status: `ready`
- BUILD Task: `BUILD-060`
- Reviewed commit: `<git commit SHA>`
- Reviewed branch: `feat/f024-sourceset-volume-core-client`

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
| Size magic numbers repeated ≥3× extracted to `src/constants/layout.ts`                                        | FRONTEND_RULE_COMMON §5.2      | ✅ / ❌ |
| Dates use dayjs + `src/constants/formats.ts` constants                                                        | FRONTEND_RULE_COMMON §5.2      | ✅ / ❌ |
| All user-facing text via `useTranslations()` / `t()`; synced to `messages/zh-TW.json` + `messages/en-US.json` | FRONTEND_RULE_COMMON §5.3      | ✅ / ❌ |
| Repeated Tailwind class groups (≥3×), JSX fragments (≥3×), logic (≥2×) extracted                              | FRONTEND_RULE_COMMON §6        | ✅ / ❌ |
| No `setTimeout` mock delays                                                                                   | FRONTEND_RULE_COMMON §7        | ✅ / ❌ |
| No `console.log` (except error boundary logging)                                                              | FRONTEND_RULE_COMMON §7        | ✅ / ❌ |
| No untracked TODO / FIXME                                                                                     | FRONTEND_RULE_COMMON §7        | ✅ / ❌ |

### §1.1b Task-specific checks

The generic checklist above is written for a React feature and covers none of what actually constrains
this task. These five do, and each traces to an explicit R#.

| Check item                                                                                            | R#  | Result  |
| ----------------------------------------------------------------------------------------------------- | --- | ------- |
| `git diff --exit-code packages/core/src/lib/client.ts packages/core/src/types/sandbox-fs.ts` is empty | R9  | ✅ / ❌ |
| The new client imports neither of those two files                                                     | R9  | ✅ / ❌ |
| No `AsgardServiceClient` inheritance, instance sharing, or coupling                                   | R9  | ✅ / ❌ |
| Path guard applied on every method that takes a path, before `fetch`                                  | R2  | ✅ / ❌ |
| The `listAll` cap is a named constant with the reason in a comment, and is caller-overridable         | R7  | ✅ / ❌ |

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

# R9 — the two files that must stay untouched
git diff --exit-code packages/core/src/lib/client.ts packages/core/src/types/sandbox-fs.ts
grep -rn "lib/client\|types/sandbox-fs" packages/core/src/lib/source-set-client.ts packages/core/src/types/source-set-fs.ts
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

---

## §3 Functional Validation

Core-only cycle: no demo route exists yet (it lands with BUILD-061 / TASK-004), so §3 is validated by
Vitest against a mocked `fetch` plus the built `dist` entry — not by the browser.

### R# Result Matrix

| R#  | Description                                                                                             | Result                | Note                               |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------- |
| R1  | Construction; `X-API-KEY` only when `apiKey` set; `customHeaders` everywhere                            | Pass / Fail / Blocked | `<actual vs expected if not Pass>` |
| R2  | Volume-relative path guard; `''` accepted by `list`                                                     | Pass / Fail / Blocked |                                    |
| R3  | `list` returns `{ entries, paging }`; envelope tolerated; basename kept                                 | Pass / Fail / Blocked |                                    |
| R4  | `stat` on a missing path → `exists: false`, no throw                                                    | Pass / Fail / Blocked |                                    |
| R5  | `read` header sourcing + both fallbacks; offset-to-EOF not truncated                                    | Pass / Fail / Blocked |                                    |
| R6  | Mutations issue the documented request; `pageSize` clamped to 1000                                      | Pass / Fail / Blocked |                                    |
| R7  | `listAll` pages to `total`; cap reported as data; a failed page throws                                  | Pass / Fail / Blocked |                                    |
| R8  | Non-2xx → `HttpError`; 409 identifiable via `.status`                                                   | Pass / Fail / Blocked |                                    |
| R9  | Zero diff on `client.ts` / `sandbox-fs.ts`; no import of either                                         | Pass / Fail / Blocked |                                    |
| R10 | (Smoke check) lint / format / typecheck / build / test green; exports in `dist` after `--skip-nx-cache` | Pass / Fail / Blocked |                                    |

### §3.1 Acceptance

- [ ] All R# in BUILD task `## Coverage` executed
- [ ] Each R# marked Pass / Fail / Blocked with explanation
- [ ] Error-path cases confirmed (400 invalid path, 404, 409 conflict, mid-`listAll` failure)
- [ ] `dist` export check run after `--skip-nx-cache` (a cached build gave a false pass on BUILD-052)

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

- 2026-08-14: REVIEW task created, paired with BUILD-060 (Status: `draft`).
