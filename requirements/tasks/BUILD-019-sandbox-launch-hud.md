# BUILD-019 Sandbox Launch HUD

## Meta

- Task ID: `BUILD-019`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/24`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-018-sandbox-冷啟動指示浮層-launch-hud.md` (UC-029 / UC-030 / UC-031)
- Complexity: `L`

---

## Brief

Add a self-contained "Sandbox 啟動中" HUD that surfaces cold-start feedback for the backend `asgard.sandbox.launch` / `asgard.sandbox.ready` events. Core gains the two `EventType`s + their fact shape (`{ sandboxName, blueprintName }`) and a per-slice `sandboxPhase$` store (`idle` / `launching` / `ready`) folded into `ChannelStates` (UC-031). React gains a delay-before-spinner latch hook (`useSandboxLaunch`, 1s threshold → warm starts stay silent) and a `SandboxLaunchHud` overlay (grid chip-scan animation) mounted `position:absolute` in the chat-view container, fully independent of `RunningIndicator` and honoring `prefers-reduced-motion` (UC-029 / UC-030). The authoritative UI design is the pinned prototype (`SandboxLaunchOverlay.tsx` + `useSandboxLaunch.ts` @ `aa0899d`) — ported to this repo's SCSS-module + `--asg-color-*` token + i18n-catalog conventions, not copied line-by-line.

**Already exists:** core `Channel.channelTitle$` store precedent (`packages/core/src/lib/channel.ts`) and `Fact<Type>` mapping (`packages/core/src/types/sse-response.ts`); react `RunningIndicator` internal-component + SCSS-module pattern, `ChatbotContainer` relative overlay anchor (hosts `DropZoneOverlay`), `useAsgardContext()` state bridge (`use-channel.ts` + `asgard-service-context.tsx`), and the i18n catalog (F-005) for `sandbox.*` label keys.

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                            |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                       |
| §1.3 | No `console.log` left in library code                                                                                  |
| §1.4 | No `<style>` tag injected into JSX — all styling via `.module.scss` (matches RunningIndicator)                         |
| §1.5 | Every RxJS subscription / timer / `setTimeout` / `setInterval` has teardown (`unsubscribe` / `useEffect` cleanup)      |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only              |
| §1.7 | No breaking public-API change without `@deprecated` transition (this task is purely additive)                          |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                  |
| §2.3 | Event fact type (`core/src/types/sse-response.ts`) + `EventType` (`core/src/constants/enum.ts`) exist before react use |
| §3.1 | Exported functions / methods declare explicit return types                                                             |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                    |
| §4.1 | React component props fully typed (no `any`)                                                                           |
| §4.2 | No hardcoded color values in components — theme via `--asg-color-*` CSS variables (in `.module.scss`)                  |
| §4.4 | `react` / `react-dom` stay peerDependencies                                                                            |
| §5.3 | All user-facing text via the i18n catalog (`sandbox.*` keys, en/ja/zh) — no hardcoded Chinese in JSX                   |
| §6   | Extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                                      |
| §7   | No leftover `console.log`, no dead commented code, no untracked TODO / FIXME                                           |

---

## Acceptance Criteria

EARS form. Each criterion maps to Implementation Tasks (→ T#).

- `R1` (UC-031) When the core SSE stream delivers `asgard.sandbox.launch`, the system shall derive sandbox phase `launching`; on `asgard.sandbox.ready`, phase `ready`; with no sandbox event, phase `idle`. Phase is reset to `idle` on run `init` and `error`. The phase is exposed as a per-slice store `Channel.sandboxPhase$` (`distinctUntilChanged`, not re-emitted on message deltas) + `getSandboxPhase()` snapshot + `ChannelStates.sandboxPhase`, and surfaced through the React `useAsgardContext()`. → T1, T2, T3
- `R2` (UC-029) When phase remains `launching` for ≥1s without `ready`, the system shall show the HUD in the chat view's bottom-right corner; when `ready` arrives before the 1s threshold (warm sandbox), the HUD shall never appear (fully silent). → T4, T5
- `R3` (UC-029) When `ready` arrives while the HUD is shown, the system shall switch to the "Sandbox 就緒" ready-beat (~0.9s) then slow fade out (~0.6s) and unmount. → T4, T5
- `R4` (UC-030) The HUD shall be `position:absolute` scoped inside the chat-view container (`position:relative`) — never `position:fixed` to the viewport — with `pointer-events:none`, and shall coexist with `RunningIndicator` without interfering. → T5, T6
- `R5` (UC-030) The HUD shall use the grid (4×4 chip-scan) animation with a single accent (`--asg-color-primary` + `color-mix` derivations), and shall honor `prefers-reduced-motion` (static composite + light breathing, no spin/scan). All labels shall resolve through the i18n catalog (`sandbox.launching` / `sandbox.ready`, en/ja/zh). → T5, T7
- `R6` (Smoke check) When the developer runs `npm run build:core && npm run build:react`, the core Vitest for `sandboxPhase` derivation passes, and in the react-demo (`npm run serve:react-demo`, http://localhost:4200) a cold start (≥1s launching) shows the HUD then rings-out on ready while a warm start (<1s) stays silent, the system shall behave as above with no build errors. → T8, T9

---

## Implementation Tasks

Run in order; each maps to the R# it satisfies.

- [x] T1 (R1): Add `SANDBOX_LAUNCH = 'asgard.sandbox.launch'` / `SANDBOX_READY = 'asgard.sandbox.ready'` to `EventType` (`packages/core/src/constants/enum.ts`); add `SandboxEventData { sandboxName: string; blueprintName: string }` + `sandboxLaunch` / `sandboxReady` keys to `Fact<Type>` in `packages/core/src/types/sse-response.ts`.
- [x] T2 (R1): Add `SandboxPhase = 'idle' | 'launching' | 'ready'` type (core `types/channel.ts`); add `sandboxPhase$` `BehaviorSubject` to `Channel` (mirror `channelTitleSubject`), update it via `updateSandboxPhase()` in `buildRunHandlers.onSseMessage` for launch/ready and reset to `idle` on `INIT` / `ERROR`; expose `sandboxPhase$` (`distinctUntilChanged`) + `getSandboxPhase()`, add `sandboxPhase` to `ChannelStates` + the `combineLatest` in `subscribe()`; teardown in `close()`. Exported via the core types barrel.
- [x] T3 (R1): Add core Vitest — launch→launching, ready→ready, idle default, init/error reset, per-slice (delta doesn't re-emit), exposed on `ChannelStates` (5 new tests, all pass; full core suite 76/76).
- [x] T4 (R2, R3): Port `useSandboxLaunch` into `packages/react/src/hooks/use-sandbox-launch.ts` (stage `hidden→launching→ready→leaving`, `thresholdMs`/`readyBeatMs`/`exitMs`, all timers cleaned up per §1.5). Dropped the prototype's elapsed-seconds tick (not shown in final label).
- [x] T5 (R2–R5): `SandboxLaunchHud` folder (`.tsx` + `.module.scss` + `index.ts`) — grid variant only (product-decided), `--asg-color-*` tokens in SCSS module (no inline `<style>`, no color literals in `.tsx`), `prefers-reduced-motion` fallback, labels via i18n `t()`.
- [x] T6 (R1, R4): Bridged `sandboxPhase` through React — `use-channel.ts` `statesObserver` × 3 → `useState` → `UseChannelReturn` → `AsgardServiceContextValue`; mounted `<SandboxLaunchHud />` inside `AsgardTemplateContextProvider` in `chatbot.tsx` (reads `locale`; `position:absolute` anchors to `ChatbotContainer` `position:relative`, coexists with `RunningIndicator`).
- [x] T7 (R5): Added `sandbox.launching` / `sandbox.ready` to the i18n catalog (en / ja / zh).
- [x] T8: `npm run lint:packages` ✅ · my files `prettier --check` ✅ · `npm run build:core && npm run build:react` ✅. (Repo-wide `format:check` has 132 pre-existing `references/` submodule warnings — unrelated; see REVIEW note.)
- [x] T9 (R6): Smoke check — core Vitest 76/76; added `/sandbox-hud` react-demo route (cold/warm buttons, `zh-TW` locale) + `sandbox-hud-demo` mock stream. Verified in-browser: cold shows HUD at ~1.15s (`Sandbox 啟動中`) → ready (`Sandbox 就緒` + ring) → fade; warm stays silent; `position:absolute` anchored to `ChatbotContainer` (not `fixed`), `pointer-events:none`, coexists with the run indicator. Screenshots in `.github/screenshots/F-018-sandbox-hud-{launching,ready}.png`.

---

## Coverage

Use Cases: R1 (UC-031), R2 / R3 (UC-029), R4 / R5 (UC-030), R6 (smoke).
Files:

- core: `packages/core/src/constants/enum.ts`, `packages/core/src/types/sse-response.ts`, `packages/core/src/types/channel.ts`, `packages/core/src/lib/channel.ts`, `packages/core/src/lib/channel.spec.ts`
- react: `packages/react/src/hooks/use-sandbox-launch.ts` (new), `packages/react/src/hooks/index.ts`, `packages/react/src/components/chatbot/sandbox-launch-hud/{sandbox-launch-hud.tsx,sandbox-launch-hud.module.scss,index.ts}` (new), `packages/react/src/components/chatbot/chatbot.tsx`, `packages/react/src/context/asgard-service-context.tsx`, `packages/react/src/hooks/use-channel.ts`, `packages/react/src/i18n.ts`
- demo: `apps/react-demo/src/app/routes/sandbox-hud/{sandbox-hud.tsx,sandbox-hud.module.scss,index.ts}` (new), `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx`, `apps/react-demo/src/mock-server/sse-mock.ts`

---

## Execution Log / Change Log

- 2026-07-20: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/24 (Status: `draft`).
- 2026-07-20: Plan confirmed by user; submodule pointer bumps (pm `ee9e194`, prototype `aa0899d`) kept in-branch. Implementation started (Status: `draft → ready → in-progress`).
- 2026-07-20: All T1–T9 done; core 76/76, lint/build green, HUD verified in-browser (cold shows / warm silent / ready beat + fade; scoped absolute, coexists with RunningIndicator). Screenshots committed (Status: `in-progress → done`).
