# BUILD-060 A standalone SourceSet volume client in core

## Meta

- Task ID: `BUILD-060`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/pull/60` — **no per-feature issue exists.**
  F-024–F-027 + TASK-004 were spec'd by that merged PR alone; unlike F-018–F-023 / F-028–F-030 they were
  never opened as issues on `asgard-sdk-pm`. The downstream consumer is
  `asgard-ai-platform/asgard-odin-pm#439` (UC-032).
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-024-sourceset-volume-core-client.md`
  (all ACs) + `.../F-026-sourceset-volume-大目錄分頁載入.md` (core half only — see the scope note below)
- Complexity: `M`

---

## Brief

Cycle 1 of the SourceSet File Explorer batch, **core only**. A SourceSet volume is a plain remote
filesystem that is always there — no chat, no sandbox, no lifecycle. This task adds
`AsgardSourceSetClient`, a **standalone** class that wraps its HTTP API so the F-025 component (Cycle 2)
has a typed, unit-tested data layer to sit on. It ships nothing a user can see; the same core-before-UI
split as F-016→F-017, F-019→F-021, and BUILD-055→BUILD-056.

The client is deliberately **not** part of `AsgardServiceClient`: it neither extends nor shares an
instance with it, and this task must not touch it. One `AsgardSourceSetClient` drives all four bases,
because the backend guarantees the path segments after the base are identical:

```
{EDGE}/ns/{ns}/source-set/{name}/volume          # apiKey    → X-API-KEY
{PLATFORM_API}/v1/source-set/{id}/volume         # Bearer    → customHeaders
{PLATFORM_API}/v1/skill-set/{id}/volume          # Bearer    → customHeaders
{HUB_API}/v1/directory/{directory_id}/volume     # Bearer    → customHeaders
```

Four contract differences from the in-sandbox fs API carry the weight. Each one silently produces
working-looking code if copied from the sandbox side:

- **Paths are volume-relative and root is the empty string `''`**, not `/`. A leading `/`, a `.` / `..`
  segment, a doubled or trailing slash all return **400**. Only `list` accepts `''`.
- **Real pagination, not `truncated`.** `list` returns `{ entries, paging: { index, size, total } }`
  with `page` / `page_size` (server cap 1000) as query. `truncated` does not exist here.
- **`stat` on a missing path returns 200 + `exists: false`**, not 404. Branching on a thrown 404 would
  never fire.
- **409 means conflict** — `create_only` hitting an existing path, or `copy`/`move` without
  `overwrite` onto an existing destination. The caller must be able to tell it apart to say "already
  exists" instead of overwriting.

**Already exists:** `packages/core/src/lib/client.ts` (`sandboxFs*` methods L495–L680 — the request /
envelope / `HttpError` conventions to mirror; **read-only, do not edit**),
`packages/core/src/types/sandbox-fs.ts` (the type-file shape to model the new file on; **do not edit**),
`packages/core/src/types/http-error.ts` (`HttpError` carries `.status`, so 409 is already
distinguishable — no new error type is needed),
`references/asgard-chat-kit-prototype/src/SourceSetFileExplorer.tsx` (its header comment block lists the
verb → endpoint mapping; background only).

---

## Scope note — what this task takes from F-026

F-026 spans both packages. This task implements only its data half:

| F-026 AC                                             | Cycle              |
| ---------------------------------------------------- | ------------------ |
| Auto page-through to `paging.total`                  | **this task** (R7) |
| Configurable cap, reported rather than silent        | **this task** (R7) |
| `page_size` never exceeds the server's 1000          | **this task** (R6) |
| A failed page never passes off partial data as whole | **this task** (R7) |
| "loading" on the directory node while paging         | BUILD-061          |
| "N more items not loaded" hint under the node        | BUILD-061          |
| A ≥1000-entry directory does not freeze the UI       | BUILD-061          |

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.4 | No hardcoded API key / endpoint / namespace — pass via `config`                                                           |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)            |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §2.3 | Template type (`core/src/types/sse-response.ts`) + enum (`core/src/constants/enum.ts`) exist before the react component   |
| §2.4 | Use `botProviderEndpoint`, not the deprecated `endpoint`                                                                  |
| §3.1 | Exported functions / methods declare explicit return types                                                                |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                       |
| §4.1 | React component props fully typed (no `any`)                                                                              |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context                                         |
| §4.4 | `react` / `react-dom` stay peerDependencies (not bundled)                                                                 |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                     |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |

`Blob` / `FormData` / `fetch` / `URL` are Web-platform globals already used by `AsgardServiceClient`
(`uploadFile`, `sandboxFsWrite`); they are not DOM APIs and do not breach §1.6.

---

## Acceptance Criteria

- `R1` When a caller constructs `new AsgardSourceSetClient({ sourceSetEndpoint })`, the system shall
  accept `apiKey` and `customHeaders` as optional, send `X-API-KEY` on every request **only** when
  `apiKey` is set, and merge `customHeaders` into every request including the multipart upload and the
  binary download. → T2, T5
- `R2` When any method receives a path, the system shall reject a leading `/`, any `.` or `..` segment,
  a doubled slash, and a trailing slash **before** issuing the request, and shall accept `''` for
  `list` / `listAll` as the volume root. → T1, T2, T5
- `R3` When `list(path, { page, pageSize })` succeeds, the system shall return
  `{ entries, paging: { index, size, total } }`, tolerate a `{ data: … }` envelope via
  `json.data ?? json` (as `channelMetadata` does), and expose `entries[].name` as the basename the
  backend sent — never prefixing a path onto it. → T2, T5
- `R4` When `stat(path)` targets a path that does not exist, the system shall return `exists: false`
  rather than throwing, because the backend answers 200. → T2, T5
- `R5` When `read(path, { offsetBytes, limitBytes })` succeeds, the system shall return
  `{ content: Blob, totalBytes, truncated }` sourced from `X-Total-Bytes` / `X-Truncated`, falling back
  to the blob's own size when `X-Total-Bytes` is absent and to `false` when `X-Truncated` is absent —
  so reading to EOF with only `offsetBytes` does not report a truncation. → T2, T5
- `R6` When a caller invokes `write` / `mkdir` / `remove` / `removeAll` / `copy` / `move`, the system
  shall issue the documented request (`write` as `multipart/form-data` with a `file` field, `copy`
  returning `{ bytesCopied }`), and shall clamp any requested `pageSize` to the server maximum of 1000.
  → T2, T5
- `R7` When `listAll(path)` runs against a directory larger than one page, the system shall keep
  fetching until it has `paging.total` entries or reaches a documented, caller-overridable cap; shall
  report the shortfall as data (`{ entries, total, truncatedAtCap }`) so the UI can say how many were
  left out; and shall **throw** if any page fails rather than returning the pages it did get as if they
  were the whole directory. → T3, T5
- `R8` When any request returns a non-2xx status, the system shall throw the existing `HttpError` with
  its `status`, `statusText`, and decoded body, so a caller distinguishes 409 with
  `isHttpError(e) && e.status === 409` without a new error class. → T2, T5
- `R9` When this task is complete, `git diff` shall be **empty** for
  `packages/core/src/lib/client.ts` and `packages/core/src/types/sandbox-fs.ts`, and the new client
  shall not import from either. → T6
- `R10` (Smoke check) When the developer runs `npm run lint:packages`, `npm run format:check`,
  `npm run typecheck`, `npm run build:core && npm run build:react` and `npm run test:packages`, the
  system shall pass with no errors, and `AsgardSourceSetClient` plus its exported types shall be
  reachable from the built `packages/core/dist` entry — verified after a `--skip-nx-cache` rebuild, since
  a cached build produced a false pass on BUILD-052. → T6

> No demo route and no React binding in this cycle. Both belong to BUILD-061 (F-025 + F-026 UI +
> TASK-004). Nothing here is released on its own.

---

## Implementation Tasks

- [x] T0 (R3, R5, R6): **Re-verify the wire contract before writing code**, the way BUILD-055 checked
      `asgard-sdk-go` rather than trusting the spec prose. Confirm each operation's sub-path, HTTP verb,
      and query-parameter spelling against the dev Swagger
      (`https://api.dev.asgard-ai.com/swagger/index.html`). Working assumption, taken from the
      prototype's header comment and the sandbox fs shape — **treat as unverified until T0 says
      otherwise**:
      `GET volume/list` · `GET volume/stat` · `GET volume/file` · `PUT volume/file` ·
      `POST volume/mkdir` · `DELETE volume/item` · `DELETE volume/all` · `POST volume/copy` ·
      `POST volume/move`; query keys `path` / `page` / `page_size` / `offset_bytes` / `limit_bytes` /
      `mode` / `create_only` / `src` / `dst` / `overwrite`. Record what was checked in the Execution Log.
      **If Swagger contradicts the assumption, stop and report before implementing.**
- [x] T1 (R2): New `packages/core/src/lib/source-set-path.ts` — a pure volume-relative path guard
      (`''` is the root; reject leading `/`, `.` / `..` segments, doubled and trailing slashes). Pure and
      exported, because F-025 needs the same rule client-side.
- [x] T2 (R1, R3–R6, R8): New `packages/core/src/types/source-set-fs.ts` (types first, per §2.3) and new
      `packages/core/src/lib/source-set-client.ts` (`AsgardSourceSetClient`). Mirror the request /
      envelope / `HttpError` conventions of `client.ts` L495–L680 **by reading it**, not by importing or
      editing it.
- [x] T3 (R7): `listAll` on the same class — sequential page-through with a named, commented cap
      constant, returning `{ entries, total, truncatedAtCap }`.
- [x] T4 (R1, R3–R8): Export `AsgardSourceSetClient`, its config, and every result type from the core
      entry with explicit `export type`.
- [x] T5 (R1–R8): **TDD** — write the failing Vitest cases first against a mocked `fetch`, then
      implement. Minimum set: header on/off by `apiKey`; `customHeaders` present on upload and download;
      each invalid path form rejected pre-flight and `''` accepted by `list`; envelope with and without
      `data`; `stat` missing → `exists: false`; `read` with both headers, with neither, and
      offset-to-EOF → `truncated: false`; `pageSize` above 1000 clamped; `listAll` across three pages;
      `listAll` hitting the cap → `truncatedAtCap: true` with the real `total`; `listAll` failing on
      page 2 → throws, returns nothing partial; 409 surfaced as `HttpError.status === 409`.
- [x] T6 (R9, R10): `git diff --exit-code` on the two untouchable files; `npm run lint:packages` +
      `npm run format:check` + `npm run typecheck` + `npm run build:core && npm run build:react` +
      `npm run test:packages`; confirm the new exports in `packages/core/dist` after a
      `--skip-nx-cache` rebuild.

---

## Coverage

Use Cases: R1–R10. No PM use case attaches to this cycle — F-024 and F-026 carry acceptance criteria
only, and the UI use cases they serve (Odin UC-032) are exercised in BUILD-061. Validation is Vitest
against a mocked `fetch` plus the built `dist` entry; there is no demo route yet.

Files:

**`@asgard-js/core`** (all new except the two barrels)

- `packages/core/src/types/source-set-fs.ts` (new) — 13 exported interfaces for the volume contract
- `packages/core/src/lib/source-set-path.ts` (new) — `SOURCE_SET_VOLUME_ROOT`, `assertVolumePath`
- `packages/core/src/lib/source-set-client.ts` (new) — `AsgardSourceSetClient` + the two cap constants
- `packages/core/src/lib/source-set-path.spec.ts` (new, 11 cases)
- `packages/core/src/lib/source-set-client.spec.ts` (new, 26 cases)
- `packages/core/src/types/index.ts` — one line: `export type * from './source-set-fs'`
- `packages/core/src/index.ts` — the client, the two constants, `assertVolumePath`, `SOURCE_SET_VOLUME_ROOT`

**`@asgard-js/react`** — untouched. Nothing in this cycle reaches the react package.

Deliberately **not** touched (R9, verified by an empty `git diff`): `packages/core/src/lib/client.ts`,
`packages/core/src/types/sandbox-fs.ts`.

---

## Execution Log / Change Log

- 2026-08-14: BUILD task created from the F-024 + F-026 specs (spec batch
  https://github.com/asgard-ai-platform/asgard-sdk-pm/pull/60; no per-feature issue exists) (Status: `draft`).
- 2026-08-14: Plan confirmed; three-cycle split agreed (Status: `draft → ready → in-progress`).
- 2026-08-14: **T0 done — wire contract verified against the live dev edge-server OpenAPI**
  (`https://api.dev.asgard-ai.com/swagger/doc.json`, 54 paths), not taken from the spec prose. All nine
  sub-paths, verbs and query keys match the working assumption:
  `GET/PUT volume/file` · `GET volume/list` · `GET volume/stat` · `POST volume/mkdir|copy|move` ·
  `DELETE volume/item|all`; keys `path` / `page` / `page_size` / `offset_bytes` / `limit_bytes` /
  `mode` / `create_only` / `src` / `dst` / `overwrite`; `PUT file` consumes `multipart/form-data` with
  a `file` field. Five details the spec did not state, now folded into the design:

  1. **`page` is 0-based** (default 0); `page_size` default **and** max are both 1000.
  2. **`paging` is declared in two places** — on the `RespWrapper` envelope _and_ inside
     `SourceSetListDirectoryResult`. The reader takes `data.paging ?? json.paging`, so the plain
     `json.data ?? json` unwrap alone would have dropped it.
  3. `X-Total-Bytes` (integer) / `X-Truncated` (boolean) are documented response headers on
     `GET volume/file` — confirms R5 rather than assuming it.
  4. `DELETE volume/all` explicitly disallows the volume root; `POST volume/mkdir` creates missing parents.
  5. `offset_bytes` / `limit_bytes` accept `offset` / `limit` aliases; the canonical names are used.

  Entry and stat field names (`name` / `isDir` / `sizeBytes` / `mtimeUnix` / `mode` / `exists` / `etag`)
  turn out identical to the sandbox equivalents, but the types stay separate per R9 — same shape today,
  different contracts.

- 2026-08-14: TDD — 37 cases written red first (both spec files failed to resolve their module), then
  implemented; 37/37 green. **Mutation-tested the four load-bearing rules**, each reverted after:
  making `listAll` swallow a failed page → 1 failure; removing the `page_size` clamp → 1; letting the
  path guard always accept the root → 2; dropping the `data.paging ?? json.paging` fallback → **0, the
  test survived**. That last one was a real hole: the fixture's `total` happened to equal
  `entries.length`, so the envelope path and the entries-derived last-resort fallback produced the same
  number. Fixture changed to `total: 42` with one entry, and a second case added for the last-resort
  fallback itself; the mutation now fails 1. This is what the mutation pass is for — the assertion read
  fine.
- 2026-08-14: Two decisions worth recording. **(a) No new error class for 409.** F-024 asks only that
  the caller can identify it, and `HttpError.status` already does
  (`isHttpError(e) && e.status === 409`); a second error type would be a parallel API for something
  that already works. **(b) `list` keeps a last-resort `paging` fallback** derived from the entries in
  hand. If a relay ever drops `paging` from both layers, claiming a total we cannot reach would make
  `listAll` spin; reporting what we hold terminates.
- 2026-08-14: All R# verified. `lint:packages` ✅ / `format:check` ✅ / `typecheck` ✅ (3 projects) /
  `build:core && build:react` ✅ / `test:packages` ✅ — core **13 files / 245 tests** (was 11 / 208;
  +2 / +37), react 42 / 254 unchanged. R9: `git diff --exit-code` empty on both untouchable files, and
  neither is imported (grep finds only prose references in comments). R10: after a `--skip-nx-cache`
  rebuild, all five runtime exports resolve from `packages/core/dist/index.cjs`
  (`SOURCE_SET_MAX_PAGE_SIZE` 1000, `SOURCE_SET_DEFAULT_MAX_ENTRIES` 10000, root `""`) and the client
  instantiates with all ten methods; a separate consumer-side probe compiled the eight exported types
  against `dist/index.d.ts` under `strict` with `skipLibCheck: false` — tsc exit 0
  (Status: `in-progress → done`).
