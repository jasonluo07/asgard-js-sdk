# REVIEW-023 sandbox File Explorer Side Panel — Cycle 1

## Meta

- Task ID: `REVIEW-023`
- Status: `draft`
- BUILD Task: `BUILD-023`
- Reviewed commit: `<filled at review>`
- Reviewed branch: `feat/29-file-explorer-panel`

---

## §1 Static Code Review

Scan BUILD-023 `## Coverage` files against `FRONTEND_RULE_COMMON.md`. Filled at review time.

### §1.1 Checklist

| Check item                                                                      | Rule | Result |
| ------------------------------------------------------------------------------- | ---- | ------ |
| No `any` / `as any`                                                             | §4.1 | ⏳     |
| No `eslint-disable` / `@ts-ignore` bypassing types                              | §4.2 | ⏳     |
| `@asgard-js/core` does not import react / DOM (fs client in core; UI in react)  | §1.6 | ⏳     |
| Every subscription / SSE / timer torn down (FileView, controller)               | §1.5 | ⏳     |
| Additive only; no breaking public-API change                                    | §1.7 | ⏳     |
| CodeMirror / react-markdown bundled without duplicating React (peerDeps intact) | §4.4 | ⏳     |
| open-file intent reuses F-020 `resolveSandboxUri` (no second parser)            | §6   | ⏳     |
| Theming via CSS variables; no hardcoded colors                                  | §4.2 | ⏳     |
| Explicit return types on new exports                                            | §3.1 | ⏳     |
| No `console.log` (except guarded) / no untracked TODO-FIXME                     | §7   | ⏳     |

### §1.2 Mechanical Grep

```bash
grep -rn 'as any\|@ts-ignore\|eslint-disable\|console\.log' <coverage-dirs>
```

Grep results:

```
<paste at review>
```

### §1.3 TypeScript and Lint

```bash
npm run build:core && npm run build:react
npm run lint:packages
```

Results:

```
build: <at review>
lint:  <at review>
```

### §1.4 Static Review Acceptance

- [ ] All §1.1 items checked ✅/❌
- [ ] §1.2 grep run and output pasted
- [ ] Build + lint clean

---

## §3 Functional Validation

Validate each R# against the react-demo `/file-explorer` route + core Vitest.

### R# Result Matrix

| R#  | Description                                                       | Result | Note |
| --- | ----------------------------------------------------------------- | ------ | ---- |
| R1  | Core fs client methods (list / read / write) typed + decode       | ⏳     |      |
| R2  | Dropdown from `launchedSandboxes$`; select locks active           | ⏳     |      |
| R3  | Tree roots at `workingDirectory` (+ `basePath`); browse           | ⏳     |      |
| R4  | FileView preview ↔ edit/save (CodeMirror); manual refresh         | ⏳     |      |
| R5  | Header toggle → right aside inside chat shell (not fixed)         | ⏳     |      |
| R6  | `fileExplorer` builtin/off; shared `useFileExplorerController`    | ⏳     |      |
| R7  | open-file intent notify-not-force (arrival + nonce; gated reveal) | ⏳     |      |
| R8  | Editing/dirty state exposed for mid-edit guard                    | ⏳     |      |
| R9  | Lifecycle: dropdown reflects `launchedSandboxes$` add/drop        | ⏳     |      |
| R10 | Build + Vitest + `/file-explorer` browser smoke (screenshot)      | ⏳     |      |

### §3.1 Acceptance

- [ ] All R# executed and marked Pass / Fail / Blocked
- [ ] Boundary: no live sandbox (dropdown empty — Cycle-1 shows disabled/empty, full Nudge is Cycle 2); truncated list / file read; save failure surfaces without losing edits

---

## Findings

### Critical (must fix before done)

None yet.

### Important (should fix in this cycle)

None yet.

### Minor (nice to have)

- Mutations (copy/move/mkdir/delete/upload), context-menu mutation actions, `fs/watch` auto-reload, and the empty-state Nudge are deferred to Cycle 2 (backend `fs/mkdir|item|all|copy|move` + `fs/watch` + `action=NUDGE` not yet available).

---

## Execution Log

- 2026-07-22: REVIEW task created, paired with BUILD-023 (Status: `draft`).
