# requirements

`requirements/` stores executable requirements and specs. This is the implementation source of truth for agents.

Read order:

1. `requirements/_index.md`
2. `requirements/requests/_index.md` or `requirements/tasks/_index.md`
3. Target `REQ-*.md` or `TASK-*.md`
4. `references/` only when more background is needed

Task specs use Single-file SDD and live under `requirements/tasks/`.

Required task sections:

- `Meta`
- `1) Requirements`
- `2) Design`
- `3) Implementation Tasks`
- `4) Execution Log / Change Log`

Status values:

- `draft`
- `ready`
- `in-progress`
- `done`

Do not use `in_progress`.
