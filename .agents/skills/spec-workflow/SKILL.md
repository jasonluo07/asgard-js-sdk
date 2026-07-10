---
name: spec-workflow
description: Use when medium-to-large work needs requirements, design, task planning, readiness checks, and implementation governance before coding. Language-neutral.
version: 1.0.0-template
alwaysApply: false
---

# Spec Workflow

Use this skill to turn unclear work into implementable, reviewable specs before code changes.

## When To Use

- New feature, new page/flow, cross-module change, integration, architecture/design task, or migration.
- Acceptance criteria, UI/UX behavior, API contracts, permissions, or rollout expectations are unclear.
- The user asks to define, review, confirm, or refine requirements before implementation.

## When To Skip

- Small bug fix with clear scope.
- One-file documentation/config update.
- User provided exact implementation details and no behavior is ambiguous.

## Repository Convention Discovery

Before writing specs, inspect the repo source of truth:

- `AGENTS.md`, `docs/spec-driven-development.md`, `requirements/_index.md`, `requirements/README.md`.
- `requirements/requests/_index.md` and `requirements/tasks/_index.md`.
- `profiles/README.md`, `profiles/<framework_profile>/README.md` when framework-specific work is involved.
- `references/` only for background context; do not implement directly from references.

## Required Spec Content

- `Meta`: ID, status, priority, spec mode, related request/reference links.
- `1) Requirements`: background, goal, in scope, out of scope, known context, open questions/decisions, EARS acceptance criteria.
- `2) Design`: UI/UX decisions, component structure, data dependencies, API contracts, auth/permission, acceptance test matrix, test plan.
- `3) Implementation Tasks`: reviewable tasks mapped to acceptance criteria.
- `4) Execution Log / Change Log`: spec creation, decisions, status changes, implementation notes, verification results.

## Readiness Gate

Do not implement until all pass:

- Blocking questions are answered.
- Scope and non-goals are explicit.
- UI/UX behavior, form validation, error states, and loading states are defined where relevant.
- API/data/security/operational behavior is defined where relevant.
- Each `R#` acceptance criterion maps to at least one implementation task and one verification case.
- No conflicting source documents remain unresolved.
- User confirms readiness when the change affects behavior, contracts, data, deployment, or prototype fidelity.

Use status flow `draft` -> `ready` -> `in-progress` -> `done`. Do not use `in_progress`, and do not move `ready` to `in-progress` without explicit implementation instruction.

## Deviation Protocol

If implementation needs to differ from an approved spec:

1. Stop the deviating part of the work.
2. Explain the proposed deviation, reason, impact, and risk.
3. Get explicit confirmation.
4. Update the spec/tasks/verification notes.
5. Resume only after the change is accepted.

## Done Gate

- Acceptance criteria are satisfied.
- Verification commands/checks are run or explicitly documented as not runnable.
- Generated/config/deployment artifacts are updated when required.
- No unapproved spec deviations remain.
- `requirements/tasks/_index.md` and the task spec `Meta` status are synchronized when task status changes.
- `.agents/skills/clean-code` or equivalent self-review is applied to changed application code before marking the task done.
