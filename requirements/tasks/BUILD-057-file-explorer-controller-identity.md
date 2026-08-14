# BUILD-057 Stop the File Explorer controller identity loop

## Meta

- Task ID: `BUILD-057`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/427`
- Source spec: 無 PM spec —— consumer 回報的實作層 bug（`references/asgard-sdk-pm/tracking/asgard-js-sdk/bugs/` 無對應條目）。行為權威為 F-021 AC9（open-file intent：展開祖先 + highlight + 開檔）。
- Complexity: `S`

---

## Brief

`controller.requestFile(sourceId, path)` 之後畫面進入無限重繪，console 連續噴 `Maximum update depth exceeded`，100% 重現。根因是 `FileExplorerProvider` 消化 `requestedFile` 的 effect 相依於 `updateView`，而 `updateView` 的 `useCallback` 依賴**整個 `controller` 物件**；`useFileExplorerController()` 回傳的是未經 memo 的物件字面量，於是 `updateSourceView` → `sourceViews` 換新 → 持有 controller 的元件重繪 → 新 controller → 新 `updateView` → effect 再跑，`requestedFile` 只要不是 null 就停不下來。

影響範圍不限自組面板的 consumer：`fileExplorer: 'builtin'` 時 `requestFile` 由 SDK 自己在 open-file 卡到達時呼叫（`chatbot.tsx` 的 `handleSandboxOpenFile`），所以任何 consumer 只要收到真的 `sandbox://…/open-file` 卡就會踩到。

**Already exists:** `packages/react/src/components/file-explorer/file-explorer-context.tsx`（`updateView` + open-file effect）、`packages/react/src/hooks/use-file-explorer-controller.ts`（controller 本體，`updateSourceView` 已是 `useCallback(..., [])`）。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.5 | Every RxJS subscription / EventSource / timer has teardown (`takeUntil` / `unsubscribe` / `useEffect` cleanup)            |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §3.1 | Exported functions / methods declare explicit return types                                                                |
| §4.1 | React component props fully typed (no `any`)                                                                              |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |

---

## Design note — 為什麼「只 memo 回傳值」不夠

Issue #427 提了兩個候選修法，並以「或」連接。實際查證後**只有第一個能解**：

- `updateSourceView` 的實作是 `setSourceViews(prev => ({ ...prev, [id]: … }))`，**每次呼叫都產生新的 `sourceViews`**。
- `sourceViews` 是 controller 回傳物件的一個欄位，所以即使把回傳值包進 `useMemo`，只要 `updateSourceView` 被呼叫過一次，controller 的 identity 仍然合法地改變。
- 而 `updateView` 依賴整個 controller ⇒ 跟著換新 ⇒ effect 再跑 ⇒ 再呼叫 `updateSourceView`。迴圈原封不動。

因此 **T1（把 `updateView` 的依賴改成穩定的 `controller.updateSourceView`）是必要修法**；T2（memo 回傳值）是額外的 identity 健壯性改善，讓 consumer 端的 `memo` / React Compiler 不會因為無關的 re-render 而誤判，但單獨做**不能**修掉 #427。

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When `controller.requestFile(sourceId, absolutePath)` is called while the File Explorer is mounted, the system shall consume the request and settle, without the open-file effect re-entering on the re-renders that its own `updateSourceView` call triggers. → T1
- `R2` When a component holding the controller re-renders without any controller state having changed, the system shall return a controller object whose identity is unchanged. → T2
- `R3` When the built-in aside (`fileExplorer: 'builtin'`) receives a `sandbox://…/open-file` card, the system shall expand the ancestor directories, select the path, and open it in the FileView (F-021 AC9) with no `Maximum update depth exceeded`. → T1, T3
- `R4` When the file tree is used to open the same file directly (the path that does not go through `requestedFile`), the system shall behave exactly as before this change (no regression). → T3
- `R5` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and exercises the File Explorer via Vitest and the react-demo (`npm run serve:react-demo`, http://localhost:4200) at both the default narrow shell and a full-bleed wide shell, the system shall open requested files with no build errors and no console update-depth errors. → T5, T6

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1, R3): In `file-explorer-context.tsx`, narrow the `updateView` `useCallback` dependency from the whole `controller` to `controller.updateSourceView` (already `useCallback(..., [])`, therefore stable). Confirm the open-file effect's dependency array no longer transitively depends on controller identity.
- [x] T2 (R2): Wrap the `useFileExplorerController()` return value in `useMemo` with an explicit dependency list covering every returned field. Keep the explicit `FileExplorerController` return type (§3.1).
- [x] T3 (R3, R4): Add a Vitest regression test that fails before T1 and passes after — render the provider, call `requestFile`, assert the effect settles (bounded render count) and that the tree-click path is unaffected.
- [x] T4: Re-check §6 — no repeated logic introduced.
- [x] T5: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react`.
- [x] T6 (R5): Smoke check — `npm run serve:react-demo`, exercise an open-file card at both narrow and wide shells, confirm no update-depth error in the console.

---

## Coverage

Use Cases: R1, R2, R3, R4 (Vitest) + R5 (react-demo, both widths) — all Pass.
Files:

- `packages/react/src/components/file-explorer/file-explorer-context.tsx` (react) — `updateView` dependency narrowed to `updateSourceView`
- `packages/react/src/hooks/use-file-explorer-controller.ts` (react) — return value memoized
- `packages/react/src/components/file-explorer/request-file-loop.spec.tsx` (react, new) — loop + identity regression tests

---

## Execution Log / Change Log

- 2026-08-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/427 (Status: `draft`).
- 2026-08-14: Implementation started (Status: `draft → in-progress`).
- 2026-08-14: Reproduction first (per the repo's "write the failing test first" rule). The loop **hangs** rather than throws — it is synchronous, so it blocks the event loop and vitest's own timeout never fires; two runs had to be killed at 180s and 300s. Added a `RENDER_BUDGET` guard so the regression fails in 640ms instead. Fail-before evidence: `render loop detected: Harness rendered more than 50 times`.
- 2026-08-14: T1 applied → both tests pass. T2's identity test verified independently by stashing only `use-file-explorer-controller.ts`: `expected 3 to be 1` before, pass after — so each fix has its own fail-before/pass-after evidence.
- 2026-08-14: T5 green — `lint:packages` pass; `format:check` pass (three markdown files reformatted); `typecheck:packages` exit 0 ("Successfully ran target typecheck for 2 projects"); `build:core` ✓ 1.41s; `build:react` ✓ 6.26s. Full react suite 41 files / 247 tests pass — no regression.
- 2026-08-14: T6 (R5) verified in a real browser on the react-demo `/file-explorer` route, which ships a `simulate-open-file` button calling `controller.requestFile('sbx-demo', '/home/user/project/README.md')` — the exact reported path. Before/after captured by stashing only the two source files so HMR served the pre-fix build: **before** → `Maximum update depth exceeded ... at FileExplorerProvider`, logged **56 times**; **after** → zero console errors, FileView opens README.md and renders its content. Repeated at a narrow viewport (500px inner width) — also clean. The two React Router future-flag warnings present in both runs are pre-existing and unrelated (Status: `in-progress → done`).
