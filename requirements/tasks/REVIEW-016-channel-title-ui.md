# REVIEW-016 Channel Title UI

## Meta

- Task ID: `REVIEW-016`
- Status: `done`
- BUILD Task: `BUILD-016`
- Reviewed commit: working tree on `3774a9a` (F-017 delta, pre-commit)
- Reviewed branch: `feat/f-017-channel-title-ui`

---

## §1 Static Code Review

Scope: BUILD-016 `## Coverage` files (F-017 delta only). `tsc` / `lint` run project-wide.

### §1.1 Checklist

| Item                                                    | Result | Note                                                                                                                        |
| ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| No `any` / `as any` / `<any>`                           | ✅     | grep clean                                                                                                                  |
| No `@ts-ignore` / `@ts-expect-error` / `eslint-disable` | ✅     | grep clean                                                                                                                  |
| No `console.*`                                          | ✅     | grep clean                                                                                                                  |
| No `<style>` injected into JSX                          | ✅     | animation lives in `.module.scss` (`@keyframes channel_title_in` + reduced-motion), not the prototype's inline `<style>`    |
| No hardcoded hex in the `.tsx`                          | ✅     | colors only in `.module.scss` via `--asg-color-*` tokens                                                                    |
| Component props fully typed (§4.1)                      | ✅     | `ChannelTitleRendererProps`; `renderTitle` / `untitledLabel` / `channelTitleHidden` typed on the context                    |
| Theming via CSS variables (§4.2)                        | ✅     | surface / border / text-primary / text-secondary tokens; neutral, no ad-hoc accent                                          |
| lucide icon byte-identical to 0.487.0 (§4.4)            | ✅     | `MessageSquare` path `M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z` — exact match                          |
| Reuses F-016 `channelTitle` (§6)                        | ✅     | reads `channelTitle` from the service context; no second title source; custom-render aligned with the existing slot pattern |
| Semantic separation from bot-name header (R5)           | ✅     | placed at the thread top **below** the unchanged `ChatbotHeader` (`orderOk: true`)                                          |

### §1.2 Grep (F-017 scope)

```
[: any / as any / <any>]        (none)
[@ts-ignore / eslint-disable]   (none)
[console.*]                     (none)
[<style> in channel-title.tsx]  (none — animation in scss)
[hex/rgba in channel-title.tsx] (none — colors in scss)
[MessageSquare 0.487.0 path]    exact match
```

### tsc / lint

- `npx tsc --noEmit -p packages/core/tsconfig.lib.json` → clean (no core change).
- `npm run build:react` (vite dts, authoritative react type check) → green.
- `npm run lint:packages` → `Successfully ran target lint for 2 projects`.

**§1 result: PASS — zero BLOCKERs.**

---

## §3 Functional Validation

React-only display (no core change → no Vitest). All R# via the scoped `/channel-title-ui` route (Playwright MCP): a `<Chatbot>` (preview) driven by `channelTitle` / `renderTitle` / `channelTitleHidden` with a 5-state selector.

### R# Result Matrix

| R#  | Description                                         | Result | Note                                                                                                                                                  |
| --- | --------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | thread-top row bound to channelTitle (prototype)    | Pass   | DOM: `.asgard-channel-title` 56px row + border-b; `MessageSquare` path byte-identical; title bound to the F-016 `channelTitle` prop                   |
| R2  | named truncate + hover; unnamed muted placeholder   | Pass   | DOM: named → foreground white + `title=` hover attr; unnamed → muted `新對話` `rgb(140,140,140)`, no `title` attr (no stale value)                    |
| R3  | title change fade-in; reduced-motion honored        | Pass   | DOM: 換新 → title changes with `animationName: channel_title_in`, `0.2s`, `cubic-bezier(0,0,.58,1)`; `@media prefers-reduced-motion` → animation none |
| R4  | renderTitle replaces / null hides / hidden shortcut | Pass   | DOM: custom → default row gone, custom `#` + 分享 row present; hidden → no default nor custom row                                                     |
| R5  | separate from bot-name ChatbotHeader                | Pass   | DOM: the bot-name header (`備料查詢助理`) stays; the channel-title row follows it (`orderOk: true`); hidden leaves the header intact                  |
| R6  | (build + browser smoke)                             | Pass   | build:core + build:react green; `/channel-title-ui` 0 console errors; screenshot `.github/screenshots/f-017/channel-title-ui.png`                     |

**§3 result: PASS — zero BLOCKERs.**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

- The animation was moved from the prototype's inline `<style>` into `.module.scss` (`@keyframes channel_title_in`) — matches the SDK's styling convention and avoids injecting `<style>` into JSX.
- The F-015 `GET /channel/metadata` → seed timing remains out of scope; F-017 consumes the F-016 `channelTitle` (seed slot filled by F-015 later).

---

## Execution Log

- 2026-07-15: REVIEW task created, paired with BUILD-016 (Status: `draft`).
- 2026-07-15: §1 static — all checklist ✅, all greps clean (incl. byte-identical MessageSquare), tsc/lint/build green. §3 functional — R1–R6 all Pass (all 5 states verified via DOM + screenshot). Zero BLOCKERs (Status: `done`).
