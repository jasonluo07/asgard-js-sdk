# BUILD-064 Host extension points on the SourceSet File Explorer

## Meta

- Task ID: `BUILD-064`
- Status: `done`
- Issue: [asgard-sdk-pm#82](https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/82)（需求源為消費端 Odin 的 [odin-pm#472 [F-011] Syncer](https://github.com/asgard-ai-platform/asgard-odin-pm/issues/472)）
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-025-sourceset-file-explorer-元件.md`（**F-025 的 AC 不因本 task 改動**，見 Brief 末段；需求來自 Odin F-011 的 AC，出處為決議 [`2026-08-19-syncer-in-drive`](https://github.com/asgard-ai-platform/asgard-odin-pm/blob/32c1241c5b9b2d0a2fde1e53e1bcdfe94736d984/docs/decisions/2026-08-19-syncer-in-drive.md) 與視覺原型 [asgard-chat-kit-prototype `SourceSetFileExplorer.tsx`](https://github.com/asgard-ai-platform/asgard-chat-kit-prototype/blob/b6f9d0ed1697b0713ee258192a5fb5269166112d/src/SourceSetFileExplorer.tsx#L84-L88)，chat-kit PR #19）
- Complexity: `S`

---

## Brief

`SourceSetFileExplorer` 目前是一個封閉的殼：右鍵選單只有它自己的十個動作，樹上每一列只有 chevron / icon / 名稱。宿主無法在檔案樹裡表達任何屬於宿主領域的東西。

本 task 開兩個擴充點，兩者都在原型裡已經定形：

- **`extraEntryActions?: (entry: FsEntry | null) => ContextMenuItem[]`** — 宿主追加的右鍵動作，成為選單裡自己的一段。`readOnly` 時整段不出現（與 F-025 R10 同一條理由：唯讀 volume 上不提供永遠無法完成的手勢）。
- **`entryBadge?: (entry: FsEntry) => ReactNode`** — 每一列名稱右側的裝飾。純視覺、不吃點擊、**`readOnly` 也照樣渲染**（狀態標記是資訊，不是操作）。

外加把 `ContextMenuItem` 從 package entry 匯出 —— 少了它宿主無法替 `extraEntryActions` 的回傳值標型別，只能 `as any`，正好違反 §1.1。

第一個消費端是 Odin 的 Drive Files tab：資料夾右鍵 `Pull from external source`（已掛 Syncer 時該項變灰、標籤改成 `Pulled by <syncer name>`），樹上已掛來源的資料夾帶一枚同步標記、tooltip `Pulled from <name> (<type>)`。元件本身不知道 Syncer 是什麼——它只負責把宿主給的東西放在對的位置。

> **需求是 Odin F-011 的 AC，不是 F-025 的修改案。** F-011 兩條 AC 明寫「已掛 Syncer 的資料夾右鍵建立項變灰並顯示 `Pulled by <syncer name>`」與「該列名稱右側顯示狀態標記，tooltip `Pulled from <name> (<type>)`，純資訊不吃點擊，View 模式也顯示」。那是要通過的標準，本 task 只是提供讓它通得過的位置。
>
> **F-025 的 AC 不需要改。** 逐條對過，additive prop 沒有牴觸任何一條。唯一值得寫明白的是「toolbar 與右鍵選單提供**同一組動作**」那條：它講的是元件**自己那十個內建動作**的對稱性（#68 修的東西），宿主追加的段落在其範圍外——F-011 要的是針對某個資料夾的動作，toolbar 沒有「當前資料夾」的語意、本質上不存在對應項，因此 parity 對內建集合依然成立。記在這裡，避免日後被讀成規格漂移。
>
> 兩個 prop 的 `readOnly` 待遇也不是實作偏好：動作段隱藏來自 F-025 R10，裝飾照顯來自 F-011 的 AC 原文。

**Already exists:** `packages/react/src/components/source-set-explorer/source-set-file-explorer.tsx`（`menuSections` 已是 `ContextMenuItem[][]` 且尾端 `.filter(section => section.length > 0)`，追加一段即可）、`tree.tsx`（`SourceSetTree`，列的內容在 `styles.label` 那一行收尾）、`source-set-explorer.module.scss`（`.row` / `.label` 已定義，缺一個 badge slot）、`../file-explorer/context-menu`（`ContextMenu` + `ContextMenuItem`，已含 `disabled` / `danger`）、`../file-explorer/types`（`FsEntry`，**已**從 package entry 匯出）、`source-set-explorer.spec.tsx`（397 行，測試依 `F-0NN R#` 分組）、`apps/react-demo/src/app/routes/source-set-explorer/source-set-explorer.tsx`（手動驗收用的 demo route）。

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

Extra rows for this task:

| §         | Rule (summary)                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| F-025 R10 | `readOnly` 移除**所有**變更動作（含右鍵項）——追加的動作段一併適用；但純資訊的裝飾不受此限                                          |
| F-025 R16 | 只用 design-system 的 semantic token（`--asg-color-*`），不自創 token、不寫死色值；次要文字用 `--asg-color-text-secondary`         |
| F-025     | `packages/react/src/components/chatbot/file-explorer/` **零變更**——本 task 只讀 `context-menu` / `types`，不改 in-sandbox explorer |

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a host passes `extraEntryActions` and the user opens the tree's context menu, the system shall render the returned items as their own section, positioned after `Rename` / `Delete` and before `Refresh`. → T2
- `R2` When `extraEntryActions` is called, the system shall pass the currently selected entry, or `null` when nothing is selected — matching how every built-in action already resolves its target. → T2
- `R3` While `readOnly` is true, the system shall not render the `extraEntryActions` section at all. → T2
- `R4` When `extraEntryActions` returns an item with `disabled: true`, the system shall render it inert but visible, and shall not invoke its `onSelect`. → T2
- `R5` When a host passes `entryBadge` and it returns a node for an entry, the system shall render that node to the right of the entry's name, in both normal and `readOnly` mode, without making it a click target for the row's own selection behavior. → T3
- `R6` When `entryBadge` returns `null` or is not supplied, the system shall render the row exactly as before (no empty slot, no layout shift). → T3
- `R7` When a consumer imports from `@asgard-js/react`, the system shall expose `ContextMenuItem` as a public type so `extraEntryActions` can be typed without `any`. → T4
- `R8` When neither new prop is supplied, the system shall behave identically to 0.3.67 — no visual, DOM, or API change for existing consumers. → T5
- `R9` (Smoke check) When the developer runs `npm run typecheck`, `npm run test:react`, `npm run build:core && npm run build:react`, and exercises the demo route (`npm run serve:react-demo -- -- --port 5100`, see `CLAUDE.local.md`) with a stub `extraEntryActions` + `entryBadge`, the system shall show the extra menu section, the disabled variant, and the row badge, with no build or type errors. → T6

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1: Add the two optional props to `SourceSetFileExplorerProps` with doc comments stating the contracts R2 / R3 / R5 encode.
- [x] T2 (R1–R4): Append the host section inside `menuSections` — `extraEntryActions` is skipped entirely while `readOnly`; the existing trailing `.filter(section => section.length > 0)` already drops it when it returns nothing.
- [x] T3 (R5, R6): Thread `entryBadge` through `SourceSetTreeProps` into the row, rendered after `styles.label`; add a `.rowBadge` class (semantic tokens only, §4.2 / F-025 R16) that reserves no space when absent.
- [x] T4 (R7): Re-export `ContextMenuItem` from `components/file-explorer/index.ts` (currently only `FsEntry` is public) so it reaches the `@asgard-js/react` entry.
- [x] T5 (R8): Confirm the no-props path is untouched — `chatbot/file-explorer/` diff stays empty, existing specs still pass unchanged.
- [x] T6 (R9): Extend `source-set-explorer.spec.tsx` with a `BUILD-064` group covering R1–R6, wire the two props into the react-demo route for manual inspection, then run `npm run lint:packages`, `npm run format:check`, `npm run typecheck`, `npm run test:react`, `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: `R1`–`R9` — all nine verified, `R1`–`R7` by Vitest (`BUILD-064 — host extension points`, 7 cases) and
`R1`–`R6` / `R8` again by hand in the react-demo at both mount widths.

Files:

| File (package)                                                                       | Change                                                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `packages/react/src/components/source-set-explorer/source-set-file-explorer.tsx`     | Both props (T1) and the host menu section inside `menuSections` (T2)     |
| `packages/react/src/components/source-set-explorer/tree.tsx`                         | `entryBadge` on `SourceSetTreeProps`, rendered after `styles.label` (T3) |
| `packages/react/src/components/source-set-explorer/source-set-explorer.module.scss`  | `.rowBadge` slot — layout only, no colour of its own (T3)                |
| `packages/react/src/components/file-explorer/index.ts`                               | `export type { ContextMenuItem }`, +3 lines, nothing else (T4)           |
| `packages/react/src/components/source-set-explorer/source-set-explorer.spec.tsx`     | `BUILD-064` group, 7 cases over R1–R7 (T6)                               |
| `apps/react-demo/src/app/routes/source-set-explorer/source-set-explorer.tsx`         | A "host extension points" switch that plays Odin's Drive Files tab (T6)  |
| `apps/react-demo/src/app/routes/source-set-explorer/source-set-explorer.module.scss` | `.pulledBadge` — the demo's own marker, styled host-side (T6)            |

`packages/react/src/components/chatbot/` and `packages/core/` are untouched (T5).

---

## Decisions

- **`extraEntryActions` takes `FsEntry | null`, not `FsEntry`.** `asgard-sdk-pm#82` says the shape follows the
  prototype, and the prototype writes `(entry: FsEntry)`; `R2` above widens it. Confirmed 2026-08-20 to keep
  `R2`: the tree's background is right-clickable with nothing selected, so `null` is a state that actually
  occurs, and narrowing to `FsEntry` later leaves every host compiling while widening later would not (§1.7).
  Consumers null-check — Odin's `entry.isDir` becomes `entry?.isDir`.
- **The badge sits on the row's trailing edge (`margin-left: auto`), not immediately after the name.** F-011's
  wording is "名稱右側", which at full-bleed width (the way Odin mounts this) puts ~950px between the name and
  the marker. Both were rendered side by side and the prototype's placement was confirmed 2026-08-20: markers
  line up in one column, which is what makes "which folders have a source?" scannable.
- **The `Relevant Rules` row naming `packages/react/src/components/chatbot/file-explorer/` is a stale path** —
  no such directory exists; the shared explorer lives at `packages/react/src/components/file-explorer/`, which
  T4 deliberately touches. The intent (leave the in-sandbox explorer's behavior alone) holds: the only change
  there is a type re-export.

---

## Execution Log / Change Log

- 2026-08-20: BUILD task created as an F-025 increment, driven by odin-pm#472 (Status: `draft`).
- 2026-08-20: Implemented T1–T6 (Status: `in-progress` → `done`). Static gates green — `lint:packages` 0 errors
  (5 pre-existing warnings), `format:check` clean apart from the untracked local `CLAUDE.local.md`, `typecheck`
  green over core + react + react-demo (the demo resolves `@asgard-js/react` to source, so its
  `import type { ContextMenuItem }` is a real check on T4), `test:packages` 553 passed (7 new),
  `build:core` + `build:react` clean and both props present in the emitted `.d.ts`.
- 2026-08-20: Functional walk in the react-demo at 320px and full-bleed — host section renders between
  `Delete` and `Refresh` as its own separated group, the mounted folder's item is greyed as
  `Pulled by nightly-docs`, picking `Pull from external source` on an unmarked folder marks it in both mounts,
  `readOnly` drops the section while the markers stay, and with both props off every row is back to three
  children with zero badge slots in the document.
