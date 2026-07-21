# REVIEW-022 sandbox:// Handoff Cards (Browser Handoff / Open File)

## Meta

- Task ID: `REVIEW-022`
- Status: `done`
- BUILD Task: `BUILD-022`
- Reviewed commit: `<filled at PR>`
- Reviewed branch: `feat/28-sandbox-handoff-cards`

---

## §1 Static Code Review

Scanned BUILD-022 `## Coverage` files against `FRONTEND_RULE_COMMON.md`.

### §1.1 Checklist

| Check item                                                                                                                                   | Rule      | Result |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| No `any` / `as any` (only `as unknown` in existing test fixtures)                                                                            | §4.1      | ✅     |
| No `eslint-disable` / `@ts-ignore` bypassing **type** errors                                                                                 | §4.2      | ✅     |
| `@asgard-js/core` does not import react / DOM (open-url fetch in core; `window.open` only in react `dispatch-uri-action` / `uri-validation`) | §1.6      | ✅     |
| `sandbox://` intercepted **before** `safeWindowOpen`; raw URI never `window.open`ed                                                          | §1.4 / §7 | ✅     |
| Additive only — new util + client method + optional context props; no breaking change                                                        | §1.7      | ✅     |
| uri-action dispatch consolidated into one shared util (chip + card both route through `dispatchUriAction`)                                   | §3.2 / §6 | ✅     |
| New public API exported from the package entry (`resolveSandboxUri` / `SandboxUriIntent` from core)                                          | §2.2      | ✅     |
| Explicit return types on new exports                                                                                                         | §3.1      | ✅     |
| Card visuals reuse existing attachment/button template styles (accent / hover / reduced-motion); no new hardcoded colors                     | §4.2      | ✅     |
| No new `console.log`; the one `console.error` in `dispatch-uri-action` matches the existing `channel-home-download.ts` catch-log convention  | §7        | ✅     |

### §1.2 Mechanical Grep

```bash
grep -rnE 'as any|@ts-ignore|eslint-disable|console\.log' <Coverage.Files>
```

Grep results:

```
packages/core/src/lib/client.ts:330  console.log('[AsgardServiceClient] File upload response:', ...)      # pre-existing, debugMode-gated (uploadFile) — not introduced by this task
packages/core/src/lib/client.ts:379  console.log('[AsgardServiceClient] Channel Home download response:', ...) # pre-existing, debugMode-gated (downloadChannelHomeFile) — not introduced by this task
```

No `as any` / `@ts-ignore` / `eslint-disable` (bypassing types). The two `console.log` hits are pre-existing, `if (this.debugMode)`-guarded logs in `client.ts` unrelated to F-020 (the file appears in Coverage only because `generateSandboxBrowserOpenUrl` was added to it); the new method adds none. The new `dispatch-uri-action.ts` has a single `console.error` for an open-url failure, gated behind the same `eslint-disable-next-line no-console` catch-log convention already used by `channel-home-download.ts`.

### §1.3 TypeScript and Lint

```bash
npm run build:core && npm run build:react   # authoritative tsc via Vite build (react-demo has pre-existing, unrelated tsc config noise, so the package builds are the type-check of record)
npm run lint:packages
```

Results:

```
build: PASS — @asgard-js/core + @asgard-js/react built, no type errors
lint:  PASS — Successfully ran target lint for 2 projects (Nx Cloud 401 is a cloud-cache warning, not a lint failure)
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked ✅
- [x] No ❌ violations
- [x] §1.2 grep run and output pasted (only pre-existing debug-gated logs)
- [x] Package builds (tsc) clean; `npm run lint:packages` clean

---

## §3 Functional Validation

Validated on the react-demo `/sandbox-cards` route (`npm run serve:react-demo`) + core Vitest. No matching e2e spec exists for this route, so R# were validated in the browser + unit tests.

### R# Result Matrix

| R#  | Description                                                            | Result | Note                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `resolveSandboxUri` → typed intents / null                             | Pass   | core Vitest `resolve-sandbox-uri.spec` 7/7 (both intents, decode, null cases).                                                                                                |
| R2  | `sandbox://` intercepted before `safeWindowOpen`; raw URI never opened | Pass   | Browser: clicking each sandbox card fired the typed-intent callback with no tab opened and 0 console errors; non-sandbox control falls through.                               |
| R3  | uri dispatch consolidated; chip + card route through the shared util   | Pass   | `chip.tsx` + `card.tsx` both call `dispatchUriAction`; the duplicated uri-case is gone.                                                                                       |
| R4  | open-browser → client open-url → open (default new tab, configurable)  | Pass   | core Vitest `generateSandboxBrowserOpenUrl` 4/4 (endpoint, `data.openURL`, bare body, url-encode, error); dispatch uses `onSandboxOpenBrowser` override else the client path. |
| R5  | open-file → host `onSandboxOpenFile` callback (F-021 destination)      | Pass   | Browser: open-file card logged `sandboxName="sbx-analysis", absolutePath="/home/user/report.md"` (query decoded).                                                             |
| R6  | Action-card visuals (accent / hover / reduced-motion)                  | Pass   | Reuses the existing attachment-chip card styles; renders as a clickable card.                                                                                                 |
| R7  | Build green + Vitest + browser smoke (screenshot)                      | Pass   | Core Vitest 112/112; build core+react green; `.github/screenshots/f-020-sandbox-cards.png`.                                                                                   |

### §3.1 Acceptance

- [x] All R# executed and marked Pass
- [x] Boundary: unresolvable `sandbox://` (null intent) → treated as plain card (`resolveSandboxUri` null cases); plain https control falls through to normal link behavior; open-url failure logs, never `window.open`s the raw scheme

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- The `open-file` destination (File Explorer preview) is delivered by F-021; F-020 only wires the intent → `onSandboxOpenFile` callback.
- Placement note: the pure `resolveSandboxUri` lives in `@asgard-js/core` (framework-agnostic, Vitest-covered) rather than the spec's suggested react utils path, since the react package has no test harness; re-exported from the core entry so consumers import it as public API.

---

## Execution Log

- 2026-07-22: REVIEW task created, paired with BUILD-022 (Status: `draft`).
- 2026-07-22: §1 static (10 ✅ / 0 ❌; grep only pre-existing debug-gated logs; package builds + lint clean) + §3 functional (R1–R7 all Pass; core Vitest 112/112; `/sandbox-cards` browser smoke + screenshot) complete — zero BLOCKERs (Status: `in-progress → done`).
