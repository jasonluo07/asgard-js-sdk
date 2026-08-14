# REVIEW-058 Hoist the header L3 escape hatch to the Chatbot layer

## Meta

- Task ID: `REVIEW-058`
- Status: `done`
- BUILD Task: `BUILD-058`
- Reviewed commit: `working tree (uncommitted)` — reviewed before commit at the user's instruction
- Reviewed branch: `fix/427-432-file-explorer-consumer-gaps`

> Checklist source: `.claude/skills/feature-workflow/REVIEW_RULE.md` §1.1 (the SDK-specific table), not
> `_review_template.md`'s Next.js checklist. Same rationale as REVIEW-057.

---

## §1 Static Code Review

Scope — `BUILD-058 ## Coverage` files:

- `packages/react/src/components/chatbot/chatbot.tsx`
- `packages/react/src/components/chatbot/chat-header/chat-header-host.tsx`
- `packages/react/src/components/chatbot/chat-header/render-header-actions.spec.tsx`
- `apps/react-demo/src/app/routes/chat-header/chat-header.tsx`
- `apps/react-demo/src/app/routes/chat-header/chat-header.module.scss`

### §1.1 Checklist

| 檢查項目                                             | 對應規則  | Result                                                                                                             |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| 有無 `any` / `as any`                                | §1.1      | ✅ none                                                                                                            |
| `@ts-ignore` / `eslint-disable` 規避型別或 lint      | §1.2      | ✅ none                                                                                                            |
| library code 殘留 `console.log`                      | §1.3 §7   | ✅ none                                                                                                            |
| hardcode API key / endpoint / namespace              | §1.4      | ✅ none                                                                                                            |
| RxJS 訂閱 / EventSource / timer 有 teardown          | §1.5      | ✅ n/a — no subscription touched                                                                                   |
| react 只從 core 公開進入點 import                    | §1.6      | ✅                                                                                                                 |
| core 有無 import react / react-dom / DOM             | §1.6 §2.1 | ✅ core untouched                                                                                                  |
| 公開 API 變更經 `@deprecated` 過渡                   | §1.7      | ✅ **widening, not breaking** — see the dedicated note below                                                       |
| 新增公開型別 / 函式從 package 進入點導出             | §2.2      | ✅ `ChatHeaderRendererArgs` was already exported via `components/index.ts` → `chat-header/index.ts`                |
| message template 前置依賴齊備                        | §2.3      | ✅ n/a                                                                                                             |
| 使用 `botProviderEndpoint`                           | §2.4      | ✅ demo route uses `botProviderEndpoint: 'skip'`                                                                   |
| 導出函式標明 explicit return type                    | §3.1      | ✅ `ChatHeaderHost(props): ReactNode` unchanged                                                                    |
| 共用型別集中、無跨檔重複 interface                   | §3.2      | ✅ reuses `ChatHeaderRendererArgs`; no parallel type defined                                                       |
| React props 完整型別化                               | §4.1      | ✅ `renderHeader?: (args: ChatHeaderRendererArgs) => ReactNode`                                                    |
| 元件 hardcode 色值                                   | §4.2      | ✅ library files add no color. Demo scss uses `var(--asg-color-*, fallback)`, matching the file's existing pattern |
| react / react-dom 維持 peerDependencies              | §4.4      | ✅ unchanged                                                                                                       |
| core 與 react 版本號一致                             | §5        | ✅ both `0.3.64`                                                                                                   |
| 重複邏輯 (≥2) / 型別 / JSX (≥3) 已抽出               | §6        | ✅ both call sites now share one host invocation shape; asserted by a test                                         |
| `setTimeout` 模擬 delay、註解死碼、殘留 TODO / FIXME | §7        | ✅ none in scope                                                                                                   |

#### §1.7 note — why the signature change is not breaking

`renderHeader` widened from `() => ReactNode` to `(args: ChatHeaderRendererArgs) => ReactNode`. TypeScript
permits a function that accepts fewer parameters than its target signature, so existing
`() => <MyHeader />` consumers still compile.

This was **verified by compiling, not by reasoning** (per the repo's standing rule). A throwaway
`packages/react/src/__type-canary.tsx` held both the legacy assignment and a deliberate canary error:
`typecheck:packages` failed on `src/__type-canary.tsx(7,14): error TS2322` (the canary) and reported
nothing on the legacy line; removing the canary left exit 0. The file was deleted afterwards.

Behavior for existing consumers also changes in one respect worth naming: previously a `renderHeader`
consumer's bar was rendered _instead of_ `ChatHeaderHost`, so the host's context reads and `useMemo` never
ran. They now run. This is the intended fix (it is what produces `actions`), it restores UC-043 L3
semantics, and it cannot break a renderer that ignores its argument — such a renderer draws exactly what
it drew before.

### §1.2 Mechanical Grep

Scanned `components/chatbot` and the demo route directory:

```
--- any / as any ---            (empty)
--- ts-ignore / eslint-disable --- (empty)
--- console.log ---               (empty)
--- setTimeout ---                chatbot-footer/chat-composer.tsx:261   (pre-existing, out of scope)
--- TODO / FIXME ---              (empty)
--- hardcoded colors (changed library files) --- chatbot.tsx:479, 543, 582
```

**Not violations.** The `chatbot.tsx` hits are the `#[0-9a-fA-F]{3,6}` pattern matching issue references
in comments (`#200`, `#387`, `#432`), not color literals. `chat-composer.tsx` is outside `Coverage.Files`.

### §1.3 TypeScript and Lint

```
typecheck:packages: PASS — exit 0, "Successfully ran target typecheck for 2 projects"
lint:packages:      PASS — exit 0, 4 problems (0 errors, 4 warnings; all pre-existing, none in scope)
format:check:       PASS — "All matched files use Prettier code style!"
build:              PASS — build:core ✓ 1.39s, build:react ✓ 6.62s
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked
- [x] No ❌ violations in scope
- [x] All §1.2 greps run and output pasted
- [x] Type check run — no errors
- [x] Lint run — no errors

---

## §3 Functional Validation

### R# Result Matrix

| R#  | Description                                          | Result | Note                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Renderer invoked with the four args                  | Pass   | "hands over botName, title, actions and renderDefault". Source-inspection tests also assert no ternary and no `renderHeader()` call remain.                                                                                               |
| R2  | `actions` contains the built-ins in host order       | Pass   | "includes the built-in File Explorer toggle": ids contain `file-explorer`, `reset`, `close`.                                                                                                                                              |
| R3  | Returning `null` hides the whole bar (UC-043 MF 3/4) | Pass   | `.asgard-chat-header` absent from the container.                                                                                                                                                                                          |
| R4  | Legacy zero-arg renderer still compiles and renders  | Pass   | Compile half via the `__type-canary` module (see §1.7). Runtime half: legacy renderer renders "legacy".                                                                                                                                   |
| R5  | Stock header unchanged when no renderer, both paths  | Pass   | "renders the stock bar when no renderer is provided"; a test asserts `renderHeader={renderHeader}` appears on **every** `<ChatHeaderHost>` call site (authenticated + non-authenticated).                                                 |
| R6  | Demo smoke at both widths, toggle reachable          | Pass   | `/chat-header` L3 mode renders `["升級方案","File Explorer","Reset conversation","Close"]`; clicking it set `aria-pressed="true"` and took aside 1 → 2, proving it drives `<Chatbot>`'s internal controller. Checked at 500px and 1440px. |

Vitest: `render-header-actions.spec.tsx` 7/7 pass. Full react package 42 files / 254 tests pass.

Boundary conditions confirmed: renderer returning `null` (empty path), no renderer (default path), legacy
zero-arg renderer (compatibility path), and the non-authenticated tree — where `ChatHeaderHost` now mounts
outside `AsgardServiceContextProvider`. That last one was checked rather than assumed: `useAsgardContext`
is a plain `useContext` over a context created with a default value, so it cannot throw.

### §3.1 Acceptance

- [x] All R# executed (static read + browser operation + boundary check)
- [x] Each R# marked with evidence
- [x] Vitest run and passing
- [x] Boundary conditions confirmed

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

1. **The custom bar visually clips to two buttons while the aside is open** in the demo. Not a regression:
   the untouched `fileExplorer` mode's stock header narrows 375px → 150px under the same aside, so this is
   the pre-existing F-021 AC6 space constraint of a 375px shell, not something this task introduced. All
   four actions are present in the DOM.
2. **`apps/react-demo` carries two pre-existing type errors** (`mocks/theme-gallery.ts:85`,
   `routes/events/events.tsx:80`). They surface because the demo is not covered by `typecheck:packages`.
   Out of scope here; worth its own ticket alongside REVIEW-057's Minor 1 (spec files also excluded).

---

## Execution Log

- 2026-08-14: REVIEW task created, paired with BUILD-058 (Status: `draft`).
- 2026-08-14: §1 Static review — 19/19 checklist items ✅, 0 violations in scope; §1.7 compatibility verified by compilation rather than argument; typecheck / lint / format / build all green (Status: `draft → in-progress`).
- 2026-08-14: §3 Functional validation — R1–R6 all Pass; 7/7 unit tests plus browser evidence that the built-in toggle now drives the Chatbot-internal controller. 0 BLOCKERs; 2 Minor findings, neither caused by this task (Status: `in-progress → done`).
