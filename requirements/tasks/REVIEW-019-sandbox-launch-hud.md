# REVIEW-019 Review: Sandbox Launch HUD

## Meta

- Task ID: `REVIEW-019`
- Status: `done`
- BUILD Task: `BUILD-019`
- Reviewed commit: `e188825` + uncommitted working tree (branch `feat/24-sandbox-launch-hud`)
- Reviewed branch: `feat/24-sandbox-launch-hud`

---

## §1 Static Code Review

Scanned BUILD-019 `## Coverage` files against `FRONTEND_RULE_COMMON.md`.

✅ 通過：18 項 · ❌ 違規：0 項

### §1.1 Checklist

| Check                                                    | Rule        | Result |
| -------------------------------------------------------- | ----------- | ------ |
| No `any` / `as any`                                      | §1.1        | ✅     |
| No `@ts-ignore` / `eslint-disable` (to bypass type/lint) | §1.2        | ✅\*   |
| No leftover `console.log` (non-debug-gated)              | §1.3 / §7   | ✅\*   |
| No hardcoded API key / endpoint / namespace              | §1.4        | ✅     |
| RxJS / timers have teardown                              | §1.5        | ✅     |
| react imports core via public entry only                 | §1.6        | ✅     |
| core does not import react / react-dom / DOM             | §1.6 / §2.1 | ✅     |
| No un-deprecated breaking API change (purely additive)   | §1.7        | ✅     |
| New public types / fns / components exported from entry  | §2.2        | ✅     |
| Event fact type + `EventType` exist before react use     | §2.3        | ✅     |
| `botProviderEndpoint` (not deprecated `endpoint`)        | §2.4        | ✅     |
| Exported fns declare explicit return types               | §3.1        | ✅     |
| Shared types centralized in core `src/types/`            | §3.2        | ✅     |
| React component props fully typed (no `any`)             | §4.1        | ✅     |
| No hardcoded colors in components (theme via CSS vars)   | §4.2        | ✅     |
| `react` / `react-dom` stay peerDependencies              | §4.4        | ✅     |
| Repeated logic / types / JSX extracted                   | §6          | ✅     |
| No `setTimeout` mock delays / dead code / untracked TODO | §7          | ✅\*   |

\* Adjudicated grep hits (not violations of this task):

- `use-channel.ts:329-330` — `// eslint-disable-next-line no-console` + `console.log(...)`. **Pre-existing** consent-debug logging, gated behind `client.debugMode` (§1.3 explicitly permits debug-option-controlled logging). Not introduced by BUILD-019 (this task only added the `sandboxPhase` state lines to `use-channel.ts`).
- `use-sandbox-launch.ts:46/69/78` — three `window.setTimeout`. These are the latch's real UI timers (threshold / ready-beat / exit), **each paired with a `window.clearTimeout` in the effect cleanup** (lines 48/71/80) per §1.5. Not mock/streaming delays — §7 does not apply.

### §1.2 Mechanical Grep (scoped to Coverage paths)

```
§1.1 any / as any                    → (none)
§1.2 ts-ignore / eslint-disable      → use-channel.ts:329 (pre-existing, debug-gated — see note)
§1.3 / §7 console.log                → use-channel.ts:330 (pre-existing, debug-gated — see note)
§1.6 core → react reverse-dep        → (none)
§1.6 react → core/src deep import    → (none)
§4.2 hardcoded color in .ts/.tsx     → (none; all colors live in sandbox-launch-hud.module.scss)
§7 setTimeout                        → use-sandbox-launch.ts:46/69/78 (real UI timers w/ cleanup — see note)
```

### §1.3/§1.4 Build / Lint / tsc

```
lint:packages:  PASS (core + react, 0 errors)
build:core:     PASS (tsc via vite build + dts)
build:react:    PASS
tsc (core):     PASS (npx tsc --noEmit)
format:check:   my changed files PASS (npx prettier --check on packages/** + apps/react-demo/src/**).
                Repo-wide `format:check` reports 132 warnings — ALL inside `references/` git submodules
                (126 at the old pins → pre-existing; `.prettierignore` does not exclude `references/`).
                No warning is in a BUILD-019 file. Flagged as a repo-hygiene item, out of scope here.
```

**§1 result: PASS — 0 blocking violations.**

---

## §3 Functional Validation

Verified via core Vitest (76/76) + the `/sandbox-hud` react-demo route (`npm run serve:react-demo`, http://localhost:4200) with the scoped `sandbox-hud-demo` mock stream. Browser instrumentation confirmed the exact phase/stage timeline and the rendered DOM geometry.

### R# Result Matrix

| R#  | Description                                                                                                                                  | Result | Note                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Core derives phase (launch→launching / ready→ready / idle; reset init·error); per-slice store + `ChannelStates.sandboxPhase` → React context | Pass   | Core Vitest 5 new cases pass (incl. per-slice: a message delta does not re-emit). Live poll: `idle → launching → ready`. Context bridge confirmed (HUD reads `sandboxPhase` via `useAsgardContext`).                                                       |
| R2  | Cold (≥1s launching) shows HUD bottom-right; warm (<1s ready) stays silent                                                                   | Pass   | Cold run: HUD entered DOM at ~1150ms with `Sandbox 啟動中`. Warm path: hook keeps `stage=hidden` for the first 1s (poll t=200–1000ms all hidden) → ready-before-threshold never shows.                                                                     |
| R3  | Ready → ready-beat (~0.9s) → slow fade (~0.6s) → unmount                                                                                     | Pass   | Poll timeline: `ready`(stage) @≈2.8s → `leaving` @≈3.6s → `hidden` @≈4.4s. Ready label `Sandbox 就緒` + expanding ring captured.                                                                                                                           |
| R4  | `position:absolute` scoped in chat view (relative), not `fixed`, `pointer-events:none`, coexists with RunningIndicator                       | Pass   | DOM eval: `position:absolute`, right16/bottom16, nearest positioned ancestor = `chatbot_container` (position:relative), z-index 20. No `fixed`. Independent of RunningIndicator (separate footer seam).                                                    |
| R5  | Grid animation, single `--asg-color-primary` accent, `prefers-reduced-motion`, i18n labels                                                   | Pass   | Grid chip-scan rendered; single blue accent. Labels via catalog — zh `Sandbox 啟動中`/`Sandbox 就緒` verified, en/ja in catalog. `prefers-reduced-motion` fallback present in `.module.scss` (mirrors the proven RunningIndicator pattern; code-verified). |
| R6  | Build + Vitest + demo smoke                                                                                                                  | Pass   | `build:core && build:react` green; core suite 76/76; `/sandbox-hud` cold shows / warm silent walked through. Screenshots in `.github/screenshots/F-018-sandbox-hud-{launching,ready}.png`.                                                                 |

**§3 result: PASS — all R1–R6 Pass.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. Repo-wide `npm run format:check` is noisy (132 warnings) because `.prettierignore` does not exclude the `references/` submodules. Pre-existing (126 at the prior pins); unrelated to this feature. Consider adding `references/` to `.prettierignore` in a separate chore.

---

## Execution Log

- 2026-07-20: REVIEW task created, paired with BUILD-019 (Status: `draft`).
- 2026-07-20: §1 static (18/18 ✅, 0 violations; 2 grep hits adjudicated as pre-existing/legitimate) + §3 functional (R1–R6 all Pass) complete. No BLOCKERs (Status: `draft → ready → in-progress → done`).
