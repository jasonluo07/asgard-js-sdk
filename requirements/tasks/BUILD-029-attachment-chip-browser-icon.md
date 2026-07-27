# BUILD-029 Give the sandbox open-browser attachment chip its own globe glyph

## Meta

- Task ID: `BUILD-029`
- Status: `done`
- Issue: — (no PM issue; direct product feedback: 「Web 的 Logo 比較合適 看能不能換」)
- Source spec: — (regression against `references/asgard-chat-kit-prototype/src/SandboxCards.tsx`, the F-020 design origin)
- Complexity: `S`

---

## Brief

`AttachmentChip` hard-codes `<DocumentSvg />` in its icon box (`chip.tsx:120`), so **every** attachment chip
renders a file-text glyph regardless of what its `defaultAction` actually does. A chip whose action is
`sandbox://<name>/open-browser` — the browser-handoff card, titled 「開啟沙箱瀏覽器登入」in the reported
screenshot — therefore shows a document icon for an action that opens a browser. The glyph contradicts the
action.

This is an **implementation gap in BUILD-022, not a new design**. The chat-kit prototype the sandbox cards
were built from already splits the two:

```
// references/asgard-chat-kit-prototype/src/SandboxCards.tsx
import { FileText, Globe, ChevronRight } from 'lucide-react';

SandboxBrowserHandoffCard → <Globe size={18} />      // 接手瀏覽器
SandboxOpenFileCard       → <FileText size={18} />   // 開啟檔案
```

The SDK shipped only the `FileText` half. The discrimination logic already exists and is already used by this
very component: `dispatchUriAction` routes the same action through `resolveSandboxUri()`, which returns
`{ kind: 'open-browser' }` vs `{ kind: 'open-file' }`. This task reuses that resolver to pick the glyph, so
the icon and the side effect are driven by one shared source of truth.

**Scope.** Glyph selection only. The prototype's chevron affordance, the `icon_box` background colour, and the
button/carousel `Card` are untouched — the feedback was about the logo.

---

## Relevant Rules

| §    | Rule (summary)                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — `ButtonAction` is a discriminated union, narrowed on `type` before reading `uri`          |
| §1.7 | No public API, prop, or theme-contract change; `iconBox` custom style keeps applying to both glyphs  |
| §2.1 | `@asgard-js/react` imports `resolveSandboxUri` from the `@asgard-js/core` public entrypoint only     |
| §3.2 | Glyph geometry frozen from `lucide-react`, matching the inlined-icon convention used across the repo |

---

## Acceptance Criteria

- `R1` An attachment chip whose `defaultAction` resolves to `{ kind: 'open-browser' }` renders a globe glyph
  in its icon box. → T1, T2
- `R2` Every other chip keeps the document glyph — `open-file`, `channel-home://` downloads, plain
  `http(s)` uris, `message` and `emit` actions, and any malformed/unknown `sandbox://` action (for which
  `resolveSandboxUri` returns `null`). → T2
- `R3` The globe glyph is geometrically identical to `lucide-react`'s `globe` and matches the sibling
  `icons/*.svg` convention (24×24, `fill="none"`, `stroke="currentColor"`, stroke-width 2, round caps/joins).
  → T1
- `R4` No public API, props, or theme change; `customStyle.iconBox` still styles the box for both glyphs. → T2
- `R5` Verified in the browser: a browser-handoff chip and a file chip render side by side with different
  glyphs, screenshotted. → T3

---

## Implementation Tasks

- [x] T1 (R1, R3): add `packages/react/src/icons/globe.svg`, frozen from `lucide-react` `globe`
      (`circle 12,12,r10` + `path M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20` + `path M2 12h20`).
- [x] T2 (R1, R2, R4): `chip.tsx` — derive the intent from `defaultAction` via `resolveSandboxUri`, narrowed
      on the `uri`/`URI` discriminant; render `<GlobeSvg />` for `open-browser`, `<DocumentSvg />` otherwise.
- [x] T3 (R5): build + lint + tests green; verify in `react-demo` and capture screenshots into
      `.github/screenshots/`.

---

## Coverage

Use Cases: R1, R2, R3, R4, R5

Files:

- `packages/react/src/icons/globe.svg` (new) — the glyph.
- `packages/react/src/components/templates/attachment-template/chip.tsx` — glyph selection.

---

## Notes / Open Questions

- **Colour is out of scope, and not a defect.** The reported screenshot shows a **green** icon box, but the
  SDK default is `rgba(71, 103, 235, 1)` (blue-violet, `attachment-template.module.scss:37`). The green comes
  from the consumer overriding `theme.template.AttachmentMessageTemplate.iconBox.style`, so it is not
  changeable from the SDK side. Flagged in case the same feedback also meant the background.
- **Glyph provenance.** Frozen from `lucide-react@0.542.0` (the version resolved in this repo's
  `node_modules`, pulled in by `streamdown`). BUILD-025's geometry guard covers
  `file-explorer/icons.tsx` only, not `icons/*.svg`, so this glyph is not under that test.
- **Deliberately not ported from the prototype**: the trailing `ChevronRight` affordance and the card's
  hover/active feedback. Those belong to a broader chip-affordance change, not to this feedback.

---

## Execution Log / Change Log

- 2026-07-27: task created from direct product feedback on the 「開啟沙箱瀏覽器登入」chip (Status: `ready`).
- 2026-07-27: implemented and verified (Status: `ready → done`). Root cause confirmed as a BUILD-022 gap
  against the prototype, which already split `Globe` / `FileText`. Verified on the existing
  `/sandbox-cards` demo route — no demo file changed, since it already renders all three relevant cases
  (open-browser, open-file, plain https). Before: all three chips show the document glyph. After: only the
  open-browser chip switches to the globe; the other two are pixel-identical. Screenshots:
  `.github/screenshots/build-029-attachment-chip-{before,after}.png`. Build + `lint:react` green;
  `test:packages` green (core 126/126, react 25/25).
