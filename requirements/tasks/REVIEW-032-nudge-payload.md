# REVIEW-032 Carry payload on the NUDGE outbound

## Meta

- Task ID: `REVIEW-032`
- Status: `ready`
- BUILD Task: `BUILD-032`
- Reviewed commit: `<git commit SHA>`
- Reviewed branch: `<branch-name>`

---

## §1 Static Code Review

Scan BUILD task `## Coverage` files against `FRONTEND_RULE_COMMON.md`. No server needed.

### §1.1 Checklist

| Check item                                                                       | Rule                           | Result |
| -------------------------------------------------------------------------------- | ------------------------------ | ------ |
| No `any` / `as any`; no `eslint-disable` / `@ts-ignore` to bypass type errors    | FRONTEND_RULE_COMMON §1.1 §1.2 | —      |
| No `console.log` left in library code                                            | FRONTEND_RULE_COMMON §1.3      | —      |
| No hardcoded API key / endpoint / namespace                                      | FRONTEND_RULE_COMMON §1.4      | —      |
| RxJS subscription / EventSource / timer teardown present                         | FRONTEND_RULE_COMMON §1.5      | —      |
| `@asgard-js/core` imports no react / react-dom / DOM; react imports core's entry | FRONTEND_RULE_COMMON §1.6      | —      |
| No breaking public-API change without `@deprecated` transition                   | FRONTEND_RULE_COMMON §1.7      | —      |
| New public types / functions exported from the package entry                     | FRONTEND_RULE_COMMON §2.2      | —      |
| `botProviderEndpoint` used, not the deprecated `endpoint`                        | FRONTEND_RULE_COMMON §2.4      | —      |
| Exported functions / methods declare explicit return types                       | FRONTEND_RULE_COMMON §3.1      | —      |
| Shared types centralized in `core/src/types/`; no duplicate interfaces           | FRONTEND_RULE_COMMON §3.2      | —      |
| React component props fully typed                                                | FRONTEND_RULE_COMMON §4.1      | —      |
| No hardcoded color values                                                        | FRONTEND_RULE_COMMON §4.2      | —      |
| `react` / `react-dom` stay peerDependencies                                      | FRONTEND_RULE_COMMON §4.4      | —      |
| `@asgard-js/core` and `@asgard-js/react` keep the same version number            | FRONTEND_RULE_COMMON §5        | —      |
| Repeated logic (≥2×) / duplicate types extracted                                 | FRONTEND_RULE_COMMON §6        | —      |
| No `setTimeout` mock delays, no dead commented code, no untracked TODO / FIXME   | FRONTEND_RULE_COMMON §7        | —      |

### §1.2 Mechanical Grep

```
<paste output here>
```

### §1.3 TypeScript and Lint

```bash
npm run typecheck:packages
npm run lint:packages
npm run format:check
```

Results:

```
typecheck: PASS / FAIL
lint:      PASS / FAIL
format:    PASS / FAIL
```

### §1.4 Static Review Acceptance

- [ ] All §1.1 items checked and marked ✅/❌
- [ ] All ❌ violations listed with file path and line number
- [ ] All §1.2 grep commands run and output pasted
- [ ] `npm run typecheck:packages` run — no TypeScript errors
- [ ] `npm run lint:packages` run — no ESLint errors

---

## §3 Functional Validation

### R# Result Matrix

| R#  | Description                                                           | Result                | Note |
| --- | --------------------------------------------------------------------- | --------------------- | ---- |
| R1  | `Channel.nudge` sends an object payload on the wire                   | Pass / Fail / Blocked |      |
| R2  | `Channel.nudge` resolves a function payload via `resolvePayload()`    | Pass / Fail / Blocked |      |
| R3  | `Channel.nudge()` with no payload keeps the pre-change body / silence | Pass / Fail / Blocked |      |
| R4  | `useChannel().nudge(payload)` forwards down to `Channel.nudge`        | Pass / Fail / Blocked |      |
| R5  | `serviceContext.nudge()` runs through `onBeforeSendMessage`           | Pass / Fail / Blocked |      |
| R6  | Existing zero-arg / options-only call sites keep working (§1.7)       | Pass / Fail / Blocked |      |
| R7  | (Smoke) build + tests green; Sindri request body carries payload      | Pass / Fail / Blocked |      |

### §3.1 Acceptance

- [ ] All R# in BUILD task `## Coverage` executed
- [ ] Each R# marked Pass / Fail / Blocked with explanation
- [ ] Boundary conditions confirmed (no payload / function payload / no `onBeforeSendMessage`)

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

- 2026-07-29: REVIEW task created, paired with BUILD-032 (Status: `draft`).
