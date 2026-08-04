# BUILD-040 Anchor the chat column rows explicitly and allow a null header

## Meta

- Task ID: `BUILD-040`
- Status: `draft`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/31`
- Source spec: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/31` — issue body 缺陷 8「`renderHeader` 回 `null` 會弄壞版面（medium，消費端已中招）」＋第一階段清單第 5 項。**PM 尚未把本稽核開成 `tracking/asgard-js-sdk` 下的 F/UC/TASK spec**，故以 issue 本體為 source spec，經使用者授權先行動工。
- Complexity: `M`

---

## Brief

`.chatbot__chat_column`（`packages/react/src/components/chatbot/chatbot.module.scss:45`）宣告 `grid-template-rows: max-content 1fr max-content max-content max-content`，五列**純靠子元素順序**對應。任何一個子元素消失或多出來，訊息區就會掉出 `1fr` 那一列——沒有型別訊號、沒有執行期警告、code review 也看不出來。Sindri 已經中招並在自家程式碼裡留下 `renderHeader={() => <div aria-hidden className="h-0" />}` 這個零高度佔位 workaround。

複驗發現實際情況比 issue 原本描述的更脆：條件渲染的子元素（`FileExplorerArrivalBridge`、`renderMenu?.()`、會回 `null` 的 `ToolCallConsentGate`）讓 grid item 數量在 6–8 之間浮動，宣告卻只有 5 列，超出的落進 implicit `auto` row。

本票把每個結構性區塊改為顯式指定 `grid-row`（或改用不依賴子元素計數的排版），讓 thread 無論子元素怎麼增減都固定拿到 `1fr`，並讓 `renderHeader={() => null}` 成為受支援的用法。

**Already exists:** `packages/react/src/components/chatbot/chatbot.module.scss`（`.chatbot__chat_column` / `.chatbot__main_row` / `.chatbot__thread_area`）、`packages/react/src/components/chatbot/chatbot.tsx`（`renderHeader` 逃生口 `:157`、兩處 chat column 分支 `:563` / `:604`）。

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

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When the chat column renders with every optional child present, the system shall give the thread area the sole flexible row and pin header / docked strip / seam / footer to their own rows, with the row assignment stated explicitly in CSS rather than inferred from child order. → T1
- `R2` When a consumer passes `renderHeader={() => null}`, the system shall render the chatbot with no header row occupying space, while the thread still fills the remaining height and the footer stays pinned to the bottom — no element may take the flexible row in the header's place. → T1, T2
- `R3` When `renderMenu` is omitted, when `ToolCallConsentGate` renders `null`, and when `FileExplorerArrivalBridge` is absent (no built-in File Explorer), the system shall keep the same layout as when those children are present, so a varying grid-item count cannot shift the thread out of the flexible row. → T1
- `R4` When the thread holds content taller than the viewport, while a header is present and while it is `null`, the system shall keep the composer visible and pinned at the bottom and confine scrolling to the thread — the footer shall never be pushed out of view. → T2, T4
- `R5` When the docked run-chrome strip (TaskList / SubagentList) is showing, the system shall keep BUILD-031's `max-height: 50%` behavior intact and shall not let the strip take the flexible row. → T2, T4
- `R6` When the existing react test suite runs, the system shall keep every current test passing and add coverage that fails if the flexible row is ever assigned implicitly by child order again. → T3
- `R7` (Smoke check) When the developer runs `npm run lint:packages && npm run format:check && npm run typecheck:packages` then `npm run build:core && npm run build:react`, and exercises the react-demo (`npm run serve:react-demo`, http://localhost:4200) on a route with a long transcript — first normally, then with `renderHeader={() => null}` — the system shall render both without layout breakage, verified by measuring the thread and footer boxes in DevTools and screenshotted to `.github/screenshots/`. → T4

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [ ] T1 (R1, R2, R3): Rework `.chatbot__chat_column` so row assignment is explicit — give each structural block its own `grid-row` (or move to a layout that does not depend on child count), and make an absent header contribute no row.
- [ ] T2 (R2, R4, R5): Verify the two chat-column branches in `chatbot.tsx` (`:563` File Explorer path, `:604` plain path) both honor a `null` header; document `renderHeader={() => null}` as supported on the prop's JSDoc.
- [ ] T3 (R6): Add react test coverage locking the explicit row assignment.
- [ ] T4 (R4, R5, R7): Add / extend a demo route covering long transcript × (header | no header) × (docked strip on | off); run `npm run lint:packages` + `npm run format:check` + `npm run typecheck:packages` + `npm run build:core && npm run build:react`; measure boxes in DevTools and screenshot.

---

## Coverage

Use Cases: [filled during build]
Files: [filled during build]

---

## Execution Log / Change Log

- 2026-08-04: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/31 缺陷 8 (Status: `draft`). 自 BUILD-039 拆出——本票有版面回歸風險、驗證方式（長內容 × 子元素組合的實測量測）與 BUILD-039 的型別／token 接線完全不同。
