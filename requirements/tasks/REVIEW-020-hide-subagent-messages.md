# REVIEW-020 Hide Subagent Message / Thinking Frames from the Main Conversation

## Meta

- Task ID: `REVIEW-020`
- Status: `done`
- BUILD Task: `BUILD-020`
- Reviewed commit: `<filled at PR>`
- Reviewed branch: `fix/26-hide-subagent-messages`

---

## §1 Static Code Review

Scan against `FRONTEND_RULE_COMMON.md`. Core-only logic change (+ demo mock); no React component, no styling, no new UI text.

### §1.1 Checklist

| Check item                                                                                  | Rule                         | Result                                              |
| ------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| No `any` / `as any` in changed files (`as unknown` cast confined to existing test fixtures) | FRONTEND_RULE_COMMON §4.1    | ✅                                                  |
| No `eslint-disable` / `@ts-ignore`                                                          | FRONTEND_RULE_COMMON §4.2    | ✅                                                  |
| New optional field additive; no breaking public-API change                                  | FRONTEND_RULE_COMMON §1.7    | ✅                                                  |
| Shared type reused (`Message`); guard identical across handlers                             | FRONTEND_RULE_COMMON §3.2 §6 | ✅                                                  |
| `@asgard-js/core` does not import react / DOM                                               | FRONTEND_RULE_COMMON §1.6    | ✅ (core-only)                                      |
| No hardcoded color / `<style>` / magic numbers                                              | §1.1–§1.4                    | ✅ (n/a)                                            |
| No `console.log`                                                                            | FRONTEND_RULE_COMMON §7      | ✅                                                  |
| No `setTimeout` mock delays in library code                                                 | FRONTEND_RULE_COMMON §7      | ✅ (demo mock `sleep` is intentional stream pacing) |
| No untracked TODO / FIXME                                                                   | FRONTEND_RULE_COMMON §7      | ✅                                                  |

### §1.2 Mechanical Grep

```bash
grep -rn 'as any\|@ts-ignore\|eslint-disable\|console\.log' \
  packages/core/src/types/sse-response.ts \
  packages/core/src/lib/conversation.ts \
  apps/react-demo/src/mock-server/sse-mock.ts
```

Grep results:

```
(empty)
```

### §1.3 TypeScript and Lint

```bash
npm run build:core && npm run build:react   # tsc via Vite build
npm run lint:packages
```

Results:

```
build: PASS — core + react built, no type errors
lint:  PASS — Successfully ran target lint for 2 projects (Nx Cloud 401 is a cloud-cache warning, not a lint failure)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅
- [x] No ❌ violations
- [x] §1.2 grep run — empty output
- [x] Build (tsc) run — no TypeScript errors
- [x] `npm run lint:packages` run — no ESLint errors

---

## §3 Functional Validation

Validated on `apps/react-demo` `/all-features` (`npm run serve:react-demo`, http://localhost:4200).

### R# Result Matrix

| R#  | Description                                                                 | Result | Note                                                                                             |
| --- | --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| R1  | `Message.parentToolUseId?: string` added                                    | Pass   | Build green; reducer reads it type-safely.                                                       |
| R2  | Subagent message frames (non-empty `parentToolUseId`) not materialized      | Pass   | Vitest: complete dropped, start/delta never lazy-created. Browser: coordination text absent.     |
| R3  | Subagent thinking frames not materialized                                   | Pass   | Vitest: thinking-complete dropped. Browser: subagent reasoning absent.                           |
| R4  | Main-agent frames still materialize, coexisting with hidden subagent frames | Pass   | Vitest coexistence case; browser shows main answer + interstitial + subagent panel summary.      |
| R5  | Browser smoke — clean main conversation, no leaked system-prompt tail       | Pass   | DOM check: 3 leaked strings absent, main answer + subagent summary present; screenshot attached. |

### §3.1 Acceptance

- [x] All R# executed (static read + Vitest + browser operation)
- [x] Each R# marked Pass
- [x] Boundary: empty vs non-empty `parentToolUseId` both covered (main kept, subagent hidden)

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- Accumulating subagent message/thinking into a subagent sub-conversation is backlog (out of scope, per issue #26 and `docs/mappings/asgard-js-sdk-feature-mapping.md`).

---

## Execution Log

- 2026-07-21: REVIEW task created, paired with BUILD-020 (Status: `draft`).
- 2026-07-21: §1 static + §3 functional complete — 9 ✅ / 0 ❌; all R# Pass; core Vitest 84/84; browser leak-gone verified (Status: `done`).
