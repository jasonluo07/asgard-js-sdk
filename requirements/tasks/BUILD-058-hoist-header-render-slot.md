# BUILD-058 Hoist the header L3 escape hatch to the Chatbot layer

## Meta

- Task ID: `BUILD-058`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/432`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/use-cases/UC-043-chatheader-客製三層與-channeltitle-deprecated-相容.md`（併看 `features/F-022-統一-chat-heading-bar-chatheader.md`、`use-cases/UC-041-chatheader-右側-actions-一級-api.md`）
- Complexity: `M`

---

## Brief

Consumer 傳 `renderHeader` 給 `<Chatbot>` 之後，內建的 File Explorer toggle、export 按鈕與 channel title 全部靜默消失，而且**沒有 workaround**。目前 `chatbot.tsx` 用一個三元運算切換：`renderHeader` 一旦提供就直接呼叫 `renderHeader()`（零參數），`<ChatHeaderHost>` 連掛都不掛——而 `actions[]` 正是在 `ChatHeaderHost` 的 `useMemo` 裡組出來的。所以 `actions` 不是「產生了但型別沒說」，而是**從來沒被建立**。

本票把 L3 escape hatch 從 `ChatHeader` 層提升到 `Chatbot` 層：拿掉三元、一律掛 `<ChatHeaderHost>` 並把 `renderHeader` 透傳到已經支援 `ChatHeaderRendererArgs` 的 `<ChatHeader>`。`ChatHeader` 層的契約（`{ botName, title, actions, renderDefault }`、回傳 `null` 隱藏整條）已經正確，不需更動。

**Spec 依據**：UC-043 Main Flow 3 定義 L3 為「整條完全接管（含 actions）」，與 L2「avatar 與右側 actions 仍走公版排版」對照——L3 的語意是 actions 也歸 consumer 畫，SDK 該把材料交出去。F-022 AC 進一步要求「內建 File Explorer toggle 以 `actions` 提供，不需逃生口即可放」與「客製三層**可用**」。目前 Chatbot 層的 L3 拿不到 L1 的材料，這兩條 AC 對 L3 使用端並不成立。

**Already exists:** `chat-header.tsx`（`ChatHeaderRendererArgs`、`renderHeader({ botName, title, actions, renderDefault })`、`hidden`）、`chat-header-host.tsx`（組 `actions[]` 的 `useMemo`）、`chat-header/index.ts`（`ChatHeader` 與三個型別皆已從套件進入點導出）。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                               |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                          |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                    |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`) |
| §1.7 | No breaking public-API change without `@deprecated` transition                                                            |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                     |
| §3.1 | Exported functions / methods declare explicit return types                                                                |
| §3.2 | Shared types centralized; no duplicate interfaces across files                                                            |
| §4.1 | React component props fully typed (no `any`)                                                                              |
| §4.2 | No hardcoded color values in components — theme via CSS variables / theme context                                         |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                   |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                          |

---

## Design note — 為什麼不是「補型別」

Issue #432 建議把 `Chatbot.renderHeader` 的型別補成帶參數的簽章。**單獨補型別會製造更糟的狀態**：IDE 會開始補全 `actions`，consumer 照著寫，然後在 runtime 拿到 `undefined`，炸在 `actions.map()`。現況至少是型別誠實地說「沒有東西可接」。

同樣要記錄的是：`ChatHeader` / `ChatHeaderRendererArgs` / `ChatHeaderAction` **已經**從套件進入點導出（`src/index.ts` → `components/index.ts` → `chat-header/index.ts`），所以「自己 import `<ChatHeader>` 來畫」在型別上可行——但那條路**仍然補不出 File Explorer 那顆按鈕**，因為它的 `onClick` 綁 `fileExplorerController.toggle`，而 controller 是 `<Chatbot>` 在內部自建（`chatbot.tsx:319`）、沒有注入管道；consumer 在外面自己呼叫 `useFileExplorerController()` 會拿到另一個 instance，開不了 `<Chatbot>` 內部那個 aside。開放 controller 注入屬另一個決策（見下方 Out of scope）。

**相容性**：TypeScript 允許函式少接參數，所以把型別從 `() => ReactNode` 放寬成 `(args: ChatHeaderRendererArgs) => ReactNode` 對既有 `() => <MyHeader />` 呼叫端不是 breaking change。此點**必須以實際編譯驗證**（R4），不得以推論代替。

**Out of scope**：`fileExplorerController` 的外部注入 prop（會與 BUILD-057 的 controller identity 一起牽動，且屬新增公開 API 的獨立決策）。

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a consumer passes `renderHeader` to `<Chatbot>`, the system shall invoke it with `{ botName, title, actions, renderDefault }` rather than with no arguments. → T1, T2
- `R2` When `renderHeader` is invoked while `fileExplorer: 'builtin'` and `enableExport` are active, the `actions` array shall contain the built-in File Explorer toggle and the export action alongside `customActions`, `headerActions`, reset and close, in the order `ChatHeaderHost` already defines (F-022 AC；UC-041). → T2
- `R3` When the renderer returns `null`, the system shall hide the whole heading bar, preserving UC-043 Main Flow 3 / 4. → T2, T4
- `R4` When an existing consumer's zero-argument renderer (`() => ReactNode`) is compiled against the new signature, the system shall compile with no error and render unchanged — verified by actually compiling an old-signature sample, not by reasoning. → T3
- `R5` When `renderHeader` is not provided, the system shall render the stock header exactly as before, on both the authenticated and the non-authenticated code paths. → T2, T4
- `R6` (Smoke check) When the developer runs `npm run build:core && npm run build:react` and exercises a `renderHeader` consumer in the react-demo (`npm run serve:react-demo`, http://localhost:4200) at both the default narrow shell and a full-bleed wide shell, the system shall show the built-in File Explorer toggle inside the custom header with no build errors. → T6, T7

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1): In `chatbot.tsx`, widen the `renderHeader` prop type to `(args: ChatHeaderRendererArgs) => ReactNode`, importing the type from the `chat-header` entry. Update the JSDoc — it currently claims `title` / `customActions` / `headerActions` are dropped, which stops being true.
- [x] T2 (R1, R2, R3, R5): Remove both ternaries (authenticated path and non-authenticated path); always mount `<ChatHeaderHost>` and pass `renderHeader` through. Add the `renderHeader` prop to `ChatHeaderHostProps` and forward it to `<ChatHeader>`. Confirm the non-authenticated path still works — `useAsgardContext()` is a plain `useContext` with a default value, so mounting the host outside `AsgardServiceContextProvider` does not throw, but verify rather than assume.
- [x] T3 (R4): Compile an old-signature sample (`renderHeader={() => <div />}`) under `npm run typecheck:packages` to prove the widening is non-breaking. Record the command and its output in the Execution Log.
- [x] T4 (R3, R5): Add Vitest coverage — renderer receives the four fields, renderer returning `null` hides the bar, and the no-renderer path is unchanged.
- [x] T5: Re-check §6 — the two call sites should now share one host invocation shape; extract if they diverge.
- [x] T6: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react`.
- [x] T7 (R6): Smoke check — add/extend a react-demo route that passes `renderHeader`, mount it at both narrow and wide widths side by side (per AGENTS.md「Verify at both widths」), confirm the File Explorer toggle is reachable from the custom header.

---

## Coverage

Use Cases: R1–R6 — all Pass.
Files:

- `packages/react/src/components/chatbot/chatbot.tsx` (react) — widened `renderHeader` type, removed both ternaries, forwards to the host
- `packages/react/src/components/chatbot/chat-header/chat-header-host.tsx` (react) — accepts and forwards `renderHeader`
- `packages/react/src/components/chatbot/chat-header/render-header-actions.spec.tsx` (react, new) — 7 tests
- `apps/react-demo/src/app/routes/chat-header/chat-header.tsx` (demo) — L3 renderer now draws the assembled `actions`; builtin File Explorer enabled in that mode
- `apps/react-demo/src/app/routes/chat-header/chat-header.module.scss` (demo) — action-button styling for the custom bar

---

## Execution Log / Change Log

- 2026-08-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/432 (Status: `draft`).
- 2026-08-14: Implementation started (Status: `ready → in-progress`). T1/T2 applied — both ternaries removed, `<ChatHeaderHost>` now mounts unconditionally and forwards `renderHeader`. The non-authenticated path was checked rather than assumed: `useAsgardContext` is a plain `useContext` over a context created **with** a default value, so mounting the host outside `AsgardServiceContextProvider` cannot throw.
- 2026-08-14: **R4 needed a different method than planned.** T3 originally put the old-signature sample in the new spec file — but `tsconfig` excludes `*.spec.*`, proven by injecting a deliberate type error there and watching `npm run typecheck:packages` still exit 0. The compile check was redone with a throwaway `src/__type-canary.tsx` carrying both the legacy assignment and a canary error: the run failed on `src/__type-canary.tsx(7,14): error TS2322` (canary) while the legacy `NonNullable<ChatbotProps['renderHeader']> = () => null` line reported nothing. Removing the canary left exit 0. The file was then deleted; the spec's comment was corrected so it no longer claims a typecheck guarantee it cannot give.
- 2026-08-14: T6 green — `lint:packages` 0 errors (4 warnings, all pre-existing in `chat-composer.tsx` / `file-view.tsx`, none in touched files); `format:check` pass; `typecheck:packages` exit 0; `build:core` ✓ 1.39s; `build:react` ✓ 6.62s. `test:packages`: core 11 files / 208 tests, react 42 files / 254 tests — all pass (react +1 file / +7 tests from this task).
- 2026-08-14: T7 (R6) verified in a real browser on `/chat-header`, mode "renderHeader 整條接管 L3". The custom bar renders `["升級方案", "File Explorer", "Reset conversation", "Close"]` — the three built-ins were previously unreachable here. Clicking the File Explorer button set `aria-pressed="true"` and took the aside count 1 → 2, i.e. it drove `<Chatbot>`'s **internal** controller, which is exactly what a consumer could not do before. Confirmed at 500px and 1440px viewports. Note: with the aside open the custom bar visually clips to two buttons — a pre-existing space constraint, not a regression: the stock header on the untouched `fileExplorer` mode narrows 375px → 150px under the same aside. `apps/react-demo` also carries two pre-existing type errors (`mocks/theme-gallery.ts`, `routes/events/events.tsx`) outside this task's scope; the touched demo route typechecks clean (Status: `in-progress → done`).
