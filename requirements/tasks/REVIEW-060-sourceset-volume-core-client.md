# REVIEW-060 Review: a standalone SourceSet volume client in core

## Meta

- Task ID: `REVIEW-060`
- Status: `done`
- BUILD Task: `BUILD-060`
- Reviewed commit: `43d90a68`
- Reviewed branch: `feat/f024-sourceset-volume-core-client`

---

## §1 Static Code Review

Scope (from BUILD-060 `## Coverage`), 7 files, all `@asgard-js/core`:

```
packages/core/src/lib/source-set-client.ts
packages/core/src/lib/source-set-path.ts
packages/core/src/types/source-set-fs.ts
packages/core/src/lib/source-set-client.spec.ts
packages/core/src/lib/source-set-path.spec.ts
packages/core/src/index.ts
packages/core/src/types/index.ts
```

### §1.1 Checklist

Most of the generic list targets a React feature. Items that cannot apply to a framework-agnostic core
module with no components, no routes, no forms and no JSX are marked **n/a** rather than a hollow ✅.

| Check item                                            | Rule                           | Result                                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SVG path strings inlined into components              | FRONTEND_RULE_COMMON §1.1      | n/a — no components                                                                                                                                                                                  |
| Inline style magic numbers                            | FRONTEND_RULE_COMMON §1.2      | n/a — no styles                                                                                                                                                                                      |
| Hardcoded color values (hex / rgba / oklch literal)   | FRONTEND_RULE_COMMON §1.3      | ✅ (grep empty)                                                                                                                                                                                      |
| `<style>` tag injected into JSX                       | FRONTEND_RULE_COMMON §1.4      | ✅ (grep empty)                                                                                                                                                                                      |
| Module-level mutable ID counters                      | FRONTEND_RULE_COMMON §1.5      | ✅ — the only module-level values are the two `SOURCE_SET_*` consts and a frozen-by-convention `INVALID_SEGMENTS` set                                                                                |
| Login backdoor outside a `NODE_ENV` guard             | FRONTEND_RULE_COMMON §1.6      | n/a — no auth flow                                                                                                                                                                                   |
| Sensitive data passed through URL query strings       | FRONTEND_RULE_COMMON §1.7      | ✅ — credentials travel as headers (`X-API-KEY` / `customHeaders`); the query carries only paths and paging                                                                                          |
| `page.tsx` is thin                                    | FRONTEND_RULE_COMMON §2.1      | n/a — no routes                                                                                                                                                                                      |
| Feature components in `src/components/{feature}/`     | FRONTEND_RULE_COMMON §2.1      | n/a — no components                                                                                                                                                                                  |
| Types and API module exist before first use           | FRONTEND_RULE_COMMON §2.2      | ✅ — `types/source-set-fs.ts` declares the contract; the client imports it and declares nothing of its own                                                                                           |
| API calls routed through a domain module              | FRONTEND_RULE_COMMON §3.2      | ✅ — every request goes through the private `request()` helper; there is one `fetch` call site in the file                                                                                           |
| Server state via TanStack Query                       | FRONTEND_RULE_COMMON §3.3 §3.4 | n/a — core holds no view state                                                                                                                                                                       |
| Forms use RHF + Zod                                   | FRONTEND_RULE_COMMON §3.5      | n/a — no forms                                                                                                                                                                                       |
| Zustand store does not hold server data               | FRONTEND_RULE_COMMON §2.1      | n/a — no store                                                                                                                                                                                       |
| No `as any`; no `eslint-disable` / `@ts-ignore`       | FRONTEND_RULE_COMMON §4.1 §4.2 | ✅ (both greps empty)                                                                                                                                                                                |
| Shared types centralized; no duplicate interfaces     | FRONTEND_RULE_COMMON §4.3 §4.4 | ✅ — all 13 interfaces live in `types/source-set-fs.ts`; `Envelope<T>` is a private local alias, not a duplicate                                                                                     |
| Size magic numbers repeated ≥3× extracted             | FRONTEND_RULE_COMMON §5.2      | ✅ — `1000` and `10_000` are named constants, exported                                                                                                                                               |
| Dates use dayjs + format constants                    | FRONTEND_RULE_COMMON §5.2      | n/a — no date formatting (`mtimeUnix` is passed through)                                                                                                                                             |
| All user-facing text via `t()`                        | FRONTEND_RULE_COMMON §5.3      | n/a — the only strings are developer-facing `Error` messages, which are not localized anywhere in core                                                                                               |
| Repeated logic (≥2×) extracted                        | FRONTEND_RULE_COMMON §6        | ✅ — `request()`, `headers()`, `clampPageSize()`, `copyMoveQuery()` each collapse a repeat                                                                                                           |
| No `setTimeout` mock delays                           | FRONTEND_RULE_COMMON §7        | ✅ (grep empty)                                                                                                                                                                                      |
| No `console.log`                                      | FRONTEND_RULE_COMMON §7        | ✅ (grep empty)                                                                                                                                                                                      |
| No untracked TODO / FIXME                             | FRONTEND_RULE_COMMON §7        | ✅ (grep empty)                                                                                                                                                                                      |
| §1.6 core imports no `react` / `react-dom` / DOM      | FRONTEND_RULE_COMMON §1.6      | ✅ — imports are `../types/http-error`, `../types/source-set-fs`, `./source-set-path`; the only globals are `fetch` / `URL` / `Blob` / `FormData` / `Headers`, already used by `AsgardServiceClient` |
| §3.1 exported functions declare explicit return types | FRONTEND_RULE_COMMON §3.1      | ✅ — all 10 public methods plus `assertVolumePath`                                                                                                                                                   |

**Score: 15 ✅ / 0 ❌ / 9 n/a.**

### §1.1b Task-specific checks

The generic checklist is written for a React feature and touches almost nothing that constrains this
task. These five do, and each traces to an explicit R#.

| Check item                                                                                            | R#  | Result                                                                                         |
| ----------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------- |
| `git diff --exit-code packages/core/src/lib/client.ts packages/core/src/types/sandbox-fs.ts` is empty | R9  | ✅ empty, verified against `HEAD~1..HEAD`                                                      |
| The new client imports neither of those two files                                                     | R9  | ✅ grep finds only prose mentions in comments                                                  |
| No `AsgardServiceClient` inheritance, instance sharing, or coupling                                   | R9  | ✅ the class extends nothing and holds no reference                                            |
| Path guard applied on every method that takes a path, before `fetch`                                  | R2  | ✅ 10/10 — see the call-site audit below                                                       |
| The `listAll` cap is a named constant with the reason in a comment, and is caller-overridable         | R7  | ✅ `SOURCE_SET_DEFAULT_MAX_ENTRIES = 10_000`, six-line rationale, overridable via `maxEntries` |

Path-guard call-site audit (`source-set-client.ts`), 10 public methods, all covered:

| Method      | Guard                                             |
| ----------- | ------------------------------------------------- |
| `list`      | L94 `assertVolumePath(path, { allowRoot: true })` |
| `listAll`   | inherited — delegates every page to `list`        |
| `stat`      | L143                                              |
| `read`      | L159                                              |
| `write`     | L180                                              |
| `mkdir`     | L197                                              |
| `remove`    | L202                                              |
| `removeAll` | L207                                              |
| `copy`      | L226 via `copyMoveQuery` (both `src` and `dst`)   |
| `move`      | L226 via `copyMoveQuery` (both `src` and `dst`)   |

### §1.2 Mechanical Grep

Scoped to the 7 coverage files.

> **First run was invalid and is recorded here on purpose.** The file list was held in a plain shell
> variable and expanded unquoted; zsh does not word-split, so `grep` received one long non-existent
> filename, its error went to `/dev/null`, and all eight patterns reported "(empty) ✅". Re-run with a
> real array after asserting all 7 paths resolve. A green grep pane proves nothing unless the file list
> was proven first.

```
files resolved: 7 (all present)

#[0-9a-fA-F]\{3,6\}\|rgba(\|oklch(             : (empty) ✅
<style>                                        : (empty) ✅
router\.push.*token=\|searchParams.*token      : (empty) ✅
as any                                         : (empty) ✅
eslint-disable\|@ts-ignore                     : (empty) ✅
console\.log                                   : (empty) ✅
setTimeout                                     : (empty) ✅
TODO\|FIXME                                    : (empty) ✅
```

The §5.3 "Chinese string in JSX" grep is not applicable: no `.tsx` file is in scope.

### §1.3 TypeScript and Lint

`npm run lint:check` does not exist in this repo; `npm run lint:packages` is the read-only equivalent
(no `--fix`). `npx tsc --noEmit` is likewise superseded by `npm run typecheck`, which is the gate
`pre-push` runs and which covers core + react + react-demo (BUILD-059).

```
typecheck: PASS — NX Successfully ran target typecheck for 3 projects
lint:      PASS — NX Successfully ran target lint for 2 projects
           4 problems (0 errors, 4 warnings)
```

The 4 warnings are pre-existing in `@asgard-js/react` (`jsx-a11y/role-supports-aria-props`,
`react-hooks/exhaustive-deps`, `react/jsx-no-useless-fragment`, `no-new-func`). None is in a coverage
file — this cycle touches no `.tsx` at all.

---

## §3 Functional Validation

Core-only cycle: there is no demo route yet (it lands with BUILD-061 / TASK-004), so validation is
Vitest against a mocked `fetch`, plus the built `dist` entry exercised from Node and from a separate
consumer-side type probe. No browser step, and none is available.

Suite: **37 new cases** across `source-set-path.spec.ts` (11) and `source-set-client.spec.ts` (26).
Full run with `--skip-nx-cache`: core **13 files / 245 tests**, react **42 files / 254 tests**, all green.

### R# Result Matrix

| R#  | Description                                                                    | Result | Note                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `X-API-KEY` only when `apiKey` set; `customHeaders` on every request           | Pass   | 3 cases; the header-absence case asserts `not.toHaveProperty`, and `customHeaders` is checked on the multipart `write` **and** the blob `read`, not only on a JSON call                                                                                                                                                                                        |
| R2  | Volume-relative path guard; `''` accepted by `list` only                       | Pass   | 8 rejected forms × 2 (`allowRoot` on and off); `stat('/notes/todo.md')` rejects **with `fetch` never called**; `removeAll('')` rejects while `list('')` resolves                                                                                                                                                                                               |
| R3  | `list` → `{ entries, paging }`; envelope tolerated; basenames untouched        | Pass   | enveloped, bare, envelope-level `paging`, and no-`paging` fallback all covered                                                                                                                                                                                                                                                                                 |
| R4  | `stat` on a missing path → `exists: false`, no throw                           | Pass   | resolves to `{ exists: false, isDir: false, sizeBytes: 0 }`; `etag` passes through when present                                                                                                                                                                                                                                                                |
| R5  | `read` header sourcing + both fallbacks; offset-to-EOF not truncated           | Pass   | headers present → 9999/true; both absent → blob size 5 / false; offset-only read at EOF → false                                                                                                                                                                                                                                                                |
| R6  | Mutations issue the documented request; `pageSize` clamped to 1000             | Pass   | `write` asserts `PUT`, `FormData`, a `file` field, `create_only`, `mode`; `mkdir`/`remove`/`removeAll` asserted against `volume/mkdir` `POST`, `volume/item` `DELETE`, `volume/all` `DELETE`; `copy` returns `bytesCopied` and forwards `overwrite`; `move` sends `src`/`dst` and omits `overwrite` when unset; `pageSize: 5000` → `page_size=1000`            |
| R7  | `listAll` pages to `total`; cap reported as data; a failed page throws         | Pass   | 5 entries over 3 pages of 2 (exactly 3 fetches); `maxEntries: 4` of 100 → 4 entries, `total: 100`, `truncatedAtCap: true`; a 500 on page 2 rejects with `HttpError` and returns nothing partial; an empty page short of `total` terminates instead of spinning                                                                                                 |
| R8  | Non-2xx → `HttpError`; 409 identifiable via `.status`                          | Pass   | 409 asserts `status` **and** `body`; a 400 also rejects as `HttpError`                                                                                                                                                                                                                                                                                         |
| R9  | Zero diff on `client.ts` / `sandbox-fs.ts`; neither imported                   | Pass   | see §1.1b                                                                                                                                                                                                                                                                                                                                                      |
| R10 | (Smoke) lint / format / typecheck / build / test green; exports live in `dist` | Pass   | after a `--skip-nx-cache` rebuild all five runtime exports resolve from `dist/index.cjs` (`SOURCE_SET_MAX_PAGE_SIZE` 1000, `SOURCE_SET_DEFAULT_MAX_ENTRIES` 10000, root `""`) and the client instantiates with all ten methods; a consumer probe compiled the 8 exported types against `dist/index.d.ts` under `strict` with `skipLibCheck: false`, tsc exit 0 |

### Mutation testing

Assertions were checked for bite rather than assumed. Four rules were inverted one at a time and
reverted after:

| Mutation                                                 | Failures | Verdict                                      |
| -------------------------------------------------------- | -------- | -------------------------------------------- |
| `listAll` swallows a failed page and returns what it has | 1        | caught                                       |
| `page_size` clamp removed                                | 1        | caught                                       |
| Path guard always accepts the root                       | 2        | caught                                       |
| `data.paging ?? json.paging` fallback dropped            | **0**    | **survived — the test was wrong**, see below |

The surviving mutation was a genuine hole, not a false alarm: the fixture used `total: 1` with one
entry, so the envelope-`paging` path and the entries-derived last-resort fallback produced the same
number and the assertion passed either way. Fixture changed to `total: 42` with one entry, and a
separate case added for the last-resort fallback itself. Re-run: the mutation now fails 1. Suite grew
36 → 37.

### §3.1 Acceptance

- [x] All R# executed
- [x] Each R# marked Pass / Fail / Blocked
- [x] Error paths confirmed (invalid path pre-flight, 400, 409 conflict, 500 mid-`listAll`)
- [x] `dist` export check run after `--skip-nx-cache`
- [x] Assertions mutation-tested; the one that did not bite was fixed

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (carry into BUILD-061)

1. **No request cancellation.** `AsgardSourceSetClient` takes no `AbortSignal`, so a `listAll` that has
   started cannot be stopped. Nothing in F-024 / F-026 asks for it and the existing `sandboxFs*` methods
   behave the same way, so it is not a rule breach — but Cycle 2 is where it bites: collapsing a large
   directory node mid-walk leaves up to 10 sequential requests running for entries nobody will see.
   Adding `signal?: AbortSignal` to the options bags is additive and belongs with the component that
   needs it, not here.
2. **`truncatedAtCap` slightly overstates its cause.** It is `entries.length < total`, which is also
   true in the defensive branch where the backend returns an empty page short of `total`. The field's
   doc comment says "the walk stopped before `total`", which is accurate, and the UI only needs to know
   a shortfall exists — but if BUILD-061 ever wants to word the two cases differently it will need more
   than this flag.

---

## Execution Log

- 2026-08-14: REVIEW task created, paired with BUILD-060 (Status: `draft`).
- 2026-08-14: §1 static review — 15 ✅ / 0 ❌ / 9 n/a, plus 5/5 task-specific checks and a 10/10
  path-guard call-site audit. First grep pass was invalid (unquoted file list under zsh produced eight
  false "(empty) ✅"); re-run with a real array after asserting all 7 paths resolve. `typecheck` PASS
  (3 projects), `lint:packages` PASS (0 errors; 4 pre-existing react warnings, none in scope).
- 2026-08-14: §3 functional validation — R1–R10 all Pass via 37 Vitest cases, a Node `dist` export
  check, and a strict consumer type probe. Four mutations run; the one that survived exposed a weak
  fixture, which was fixed and re-verified. 0 BLOCKERs (Status: `draft → in-progress → done`).
