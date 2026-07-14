# BUILD-006 Built-in Tool-Call Variants + Label Synthesis

## Meta

- Task ID: `BUILD-006`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/4`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-004-內建工具-tool-call-variants-顯示與-label-合成.md` (+ `use-cases/UC-007`; pinned prototype spec `docs/superpowers/specs/2026-07-10-builtin-tool-call-variants-design.md` §1–§3)
- Complexity: `M`

---

## Brief

Render the seven Claude-native built-in tools (Bash / Read / Write / Edit / Skill / WebFetch / WebSearch) as **variants** — a synthesized label + a per-tool identity icon — and fix the tool-call label priority. The current `toolCall.reason || toolCall.toolName` (`chatbot-body.tsx:53`) falls back to a raw `toolName` for the seven native tools (whose `reason` is `""`). Replace it with the spec §1 priority (`reason → synthesize → toolName`), correctly distinguishing the two `toolsetName === ""` classes (native vs Asgard-platform), and give each native tool its lucide identity icon. React-only: `toolsetName` / `parameter` already exist end-to-end on `ConversationToolCallMessage` — read only, no core type change.

**Scope this cycle (F-004):** the label priority + native detection + synthesis (en-US) + per-tool variant icons. **Not this cycle:** the i18n `locale` prop + catalog (F-005 — the synthesis helper is built i18n-ready and F-005 will pass it a locale); grouping + group summary (F-006); Write/Edit diff (F-007); expanded-content localization (F-008); `IsError` (F-009).

**Already exists:** `toolCallToItemData` + the `reason || toolName` label (`chatbot-body.tsx:45,53`); `ToolCallItemData` (`{ id, label, status, initial?, result? }`) + `ToolCallGroup` / `ToolCallItem` (inlined lucide SVG icons, `StatusIcon`, JsonViewer) in `tool-call-group.tsx`; `ConversationToolCallMessage` carries `toolsetName` / `toolName` / `parameter` / `reason`. No native detection, no synthesis, no left identity icon yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — type the tool-name union + parameter reads                                   |
| §1.6 | `@asgard-js/core` untouched; react-only; read existing `ConversationToolCallMessage` fields        |
| §2.2 | Export any new public type (e.g. a tool variant) from the package entry if it crosses the boundary |
| §3.1 | Explicit return types on the synthesis helper                                                      |
| §4.1 | Component props / new `ToolCallItemData.variant` fully typed                                       |
| §4.2 | No hardcoded colors — icons use `currentColor`; theme via existing CSS variables                   |
| §6   | Inline the lucide variant icons alongside the existing tool-call icons (don't add a lucide dep)    |
| §7   | en-US synthesis strings are grouped in one place so F-005 can lift them into the i18n catalog      |

---

## Acceptance Criteria

- `R1` The single-call label follows the spec §1 priority: `reason !== ""` → use `reason` (general tools + Asgard-platform built-ins); `reason === ""` and the call is one of the native seven → **synthesize**; otherwise → `toolName` fallback. → T1
- `R2` The two `toolsetName === ""` classes are distinguished by gating native on **`toolName ∈ {seven} && toolsetName === ""`** (not `toolsetName` alone): an Asgard-platform tool (e.g. `execute_database_query`, `show_cwd_download_link`) with an empty `toolsetName` but a non-empty `reason` uses its `reason` and is **not** misclassified as native. → T1
- `R3` Synthesis (en-US, when `reason === ""`): Bash → `parameter.description` (raw NL, **not** i18n); Read → `Read {file}`; Write → `Wrote {file}`; Edit → `Edited {file}`; Skill → `Ran skill {skill}`; WebFetch → `Fetched {host}`; WebSearch → `Searched "{query}"` — `{file}` = basename(`file_path`), `{host}` = host(`url`). → T1
- `R4` Each native tool renders its dedicated lucide identity icon on the left (Bash→Terminal, Read→FileText, Write→FilePlus, Edit→FilePen, Skill→Sparkles, WebFetch→Globe, WebSearch→Search); general + platform tools render a generic icon. The left icon is identity (muted), independent of the status icon. → T2
- `R5` No `@asgard-js/core` change — `toolsetName` / `toolName` / `parameter` / `reason` are read from the existing `ConversationToolCallMessage`. → T1, T2
- `R6` (Smoke) build green; a scoped react-demo route whose mock emits the seven native tool-calls (each with `reason === ""`) plus a general tool and an Asgard-platform tool (`reason !== ""`) shows: native = synthesized label + variant icon; general/platform = `reason` label + generic icon; a DB/download platform tool is **not** treated as native; screenshot to `.github/screenshots/f-004/`. → T3, T4

---

## Implementation Tasks

- [x] T1 (R1, R2, R3, R5): added a pure `synthesizeToolCallLabel` + `getToolCallVariant` helper in `tool-call-label.ts` (native-seven set + `toolsetName === ""` gate → priority `reason → synthesize → toolName`; basename / host extraction; Bash uses `parameter.description`; en-US strings grouped in `EN_LABEL` for F-005 to lift). Wired into `toolCallToItemData` replacing `reason || toolName`.
- [x] T2 (R4): added a typed `variant: ToolCallVariant` to `ToolCallItemData`; inlined the seven native lucide icons + a generic Wrench (currentColor, matching the existing tool-call icon style); render `<VariantIcon>` on the left of `ToolCallItem` (muted, separate from `StatusIcon`).
- [x] T3 (R6): scoped `/tool-call-variants` route with `initMessages` (nine completed tool-calls: seven native + one general + one platform DB); `botProviderEndpoint: 'skip'` so it renders statically; browser-verified labels + icons + the no-misclassification case.
- [x] T4 (R6): screenshots `.github/screenshots/f-004/tool-call-variants{,-top}.png`.
- [x] T5: `npm run lint:packages` + `npm run format:check` (own files) + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5, R6 (UC-007 顯示優先序與內建 variant)
Files:

- `packages/react/src/components/templates/tool-call-group/tool-call-label.ts` — `synthesizeToolCallLabel` + `getToolCallVariant` + `ToolCallVariant` (native detection, §1 priority, §3 synthesis, en-US `EN_LABEL`)
- `packages/react/src/components/templates/tool-call-group/tool-call-group.tsx` — seven native lucide icons + Wrench generic + `VariantIcon`; `variant` on `ToolCallItemData`; left identity icon in `ToolCallItem`
- `packages/react/src/components/templates/tool-call-group/tool-call-group.module.scss` — `.tool_call_item__variant_icon` (muted identity)
- `packages/react/src/components/templates/tool-call-group/index.ts` — export `tool-call-label`
- `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx` — `toolCallToItemData` uses `synthesizeToolCallLabel` + `getToolCallVariant`
- `apps/react-demo/src/app/routes/tool-call-variants/{tool-call-variants.tsx,tool-call-variants.module.scss,index.ts}` — scoped demo route (nine tool-calls via `initMessages`)
- `apps/react-demo/src/app/app.tsx`, `apps/react-demo/src/app/components/layout/layout.tsx` — register `/tool-call-variants`

---

## Execution Log / Change Log

- 2026-07-14: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/4 (F-004 + UC-007, pinned spec §1–§3) (Status: `draft`).
- 2026-07-14: Implemented T1–T5 (react-only; no core change). build:core+react green, lint:packages green, own-file format clean. Browser-verified `/tool-call-variants` (nine tool-calls): DOM extraction confirmed all nine labels + variant-icon signatures — Bash→description + Terminal, Read/Write/Edit→basename + FileText/FilePlus/FilePen, Skill→skill + Sparkles, WebFetch→host + Globe, WebSearch→query + Search, general→reason + Wrench, and the Asgard-platform `execute_database_query` (`toolsetName === ""`, `reason !== ""`)→reason + Wrench (NOT misclassified as native). 0 console errors. Screenshots: `.github/screenshots/f-004/tool-call-variants{,-top}.png`. i18n locale switching deferred to F-005 (en-US strings live in `EN_LABEL`). (Status: `in-progress → done`).
