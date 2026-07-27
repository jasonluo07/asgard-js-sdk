# BUILD-028 Chat-kit Composer (SDK footer rewrite)

## Meta

- Task ID: `BUILD-028`
- Status: `in-progress` (awaiting review + release authorization)
- Issue: — (direct request; no PM issue)
- Source spec: — (no PM feature; design agreed in-session, recorded in this file)
  - UI authority (pinned prototype @ `8f05d54`): `references/asgard-chat-kit-prototype/src/ChatInput.tsx`
  - Downstream driver: `asgard-ai-agent-hub-web` (Sindri) currently replaces the whole footer via `renderFooter`; this task removes the need for that.
- Complexity: `L`
- Version: `0.3.19 → 0.3.20`. The footer's appearance changes for every consumer, but the repo stays on `0.MINOR.PATCH` with no breaking-change policy (`CLAUDE.local.md`), and no `<Chatbot>` prop is removed — so this is a patch bump, not a new minor line. (Originally planned as `0.3.19`; BUILD-029 shipped under that number while this task was in review.)

---

## Brief

Rewrite the SDK's built-in footer so its input area matches the chat-kit prototype — one rounded **pill** enclosing `[📎] [textarea] [🎤] [↑]` — and open two extension slots so consumers can mount their own controls **inside** the built-in footer instead of replacing it wholesale.

The motivation is downstream: Sindri (`asgard-ai-agent-hub-web`) has rebuilt the entire footer in-app (`ConversationComposer` + `ComposerShell`, mounted through `renderFooter`) purely to get the pill look plus a Model / @mention control row. Every other consumer keeps the old flat footer, so the two drift. Moving the design into the SDK makes the pill the default for **all** consumers, and the new `renderComposerAbove` slot lets Sindri drop its custom composer entirely (phase 2).

Structurally, `chatbot-footer.tsx` (997 lines) is split: `ChatbotFooter` becomes a thin assembly layer, the pill moves to `ChatComposer`, and the two near-duplicate image/document upload paths collapse into one `useAttachmentUpload` hook. Port the prototype's Tailwind design to this repo's SCSS-module + CSS-variable conventions (as F-017 / F-018 / F-022 did) — not a line-by-line copy.

The F-003 `RunningIndicator` (the sweep line at the thread↔footer seam) is **unchanged** — it already matches the prototype and stays exactly where it is.

**Already exists:**

- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx` — 997-line footer: 3-column grid, bordered textarea, Export/Image/Document buttons (collapsing to a `+` menu at ≥3), speech button that _replaces_ the send button, image thumbnail grid + modal, 3:2 document cards, drop/paste handling, theme inline styles.
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.module.scss` — all footer styles.
- `packages/react/src/components/chatbot/chatbot-footer/speech-input-button.tsx` — kept as-is.
- `packages/react/src/components/chatbot/chatbot-footer/document-upload-button.tsx` — standalone document button (dead once 📎 is unified).
- `packages/react/src/components/chatbot/running-indicator/` — F-003 sweep line, already rendered at the footer's top edge.
- `packages/react/src/components/chatbot/chat-header/chat-header.tsx` — F-022 unified header with a first-class `actions[]` API (`ChatHeaderAction`), and `chatbot.tsx` already carries a `headerActions` prop — the landing spot for Export.
- `packages/react/src/utils/file-validation.ts` — `validateImageFiles` / `validateDocumentFiles` / `resolveImageMimeTypes` / `resolveDocumentMimeTypes` / `UploadableImage` / `UploadableDocument`.
- `packages/react/src/context/asgard-theme-context.tsx` — `chatbot.footer.{style,textArea,attachmentButton,submitButton,speechInputButton}`; auto-applies consumer `borderColor` to `footer.textArea.style.borderColor` (line ~552).
- `packages/react/src/components/chatbot/chatbot.tsx` — hosts `<ChatbotFooter>`, owns `footerEndActions` / `renderFooter` / `enableUpload` / `enableExport` / `enableDocumentUpload` / `headerActions`.
- `packages/react/src/context/file-drop-context.tsx` — `useFileDropContext()` for the container-level drop zone.

None of the footer internals (`ChatbotFooter`, `SpeechInputButton`, `DocumentUploadButton`) are publicly exported — the public surface is `<Chatbot>` props plus the rendered visuals.

---

## Design decisions

Agreed in session before implementation:

1. **Scope = new look + extension slots** (not a pure restyle, not a full feature-strip down to the prototype's minimum).
2. **📎 unified, speech moves right, Export moves to the header.** One paperclip on the left handles images _and_ documents (multi-select). The speech button stops replacing the send button and becomes a permanent icon to its left — which forces a capability check, since today it renders even where `SpeechRecognition` is absent and only escapes notice by disappearing as soon as the user types. Export History leaves the footer for `ChatHeader.actions`.
3. **Two slots**: `renderComposerAbove` (outside the pill, above it — where Sindri's Model / @mention row goes) and `renderComposerInline` (inside the pill, below the textarea — the ChatGPT/Claude-style placement, available for future use). Existing `footerEndActions` is untouched.
4. **Attachment previews**: images keep the thumbnail grid + zoom modal (real value the prototype simply didn't build); documents drop the 3:2 cards for chat-kit-style chips. Both move inside the pill, above the input row.
5. **Image/document mutual exclusion is removed.** Today picking an image clears any selected document and vice versa. With one unified 📎 that rule is indefensible, and the backend `blobIds` is already a mixed array.
6. **No new theme fields.** The consumer `borderColor` that today lands on `footer.textArea.style.borderColor` is redirected to the pill; the four existing inline-style groups keep their meaning against their (relocated) elements.
7. **`renderFooter` keeps working unchanged**, so Sindri's current code still runs against 0.3.20 and phase 2 can land separately.

---

## Relevant Rules

| §    | Rule (summary)                                                                                      |
| ---- | --------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — precise types, generics, or `unknown` + narrowing                             |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                    |
| §1.3 | No `console.log` left in library code                                                               |
| §1.5 | Every timer / subscription / object URL has teardown (`URL.revokeObjectURL`, effect cleanup)        |
| §1.6 | `@asgard-js/core` never imports react/DOM; react imports core via public entry only                 |
| §1.7 | No breaking public-API change without `@deprecated` transition (no `<Chatbot>` prop is removed)     |
| §2.2 | New public types exported from the package entry with explicit `export type`                        |
| §3.1 | Exported functions / components declare explicit return types                                       |
| §3.2 | Shared types centralized; no duplicate interfaces                                                   |
| §4.1 | React component props fully typed (no `any`)                                                        |
| §4.2 | No hardcoded color values — theme via CSS variables / theme tokens (`--asg-color-*`)                |
| §4.4 | `react` / `react-dom` stay peerDependencies                                                         |
| §5   | core and react keep the same version number (`0.3.20` for both)                                     |
| §6   | Extract repeated logic (≥2×) — the two upload paths collapse into `useAttachmentUpload`             |
| §7   | No mock delays, no dead commented code, no untracked TODO / FIXME                                   |
| a11y | Icon-only buttons carry `aria-label`; disabled send is `disabled`, not hidden; honor reduced-motion |

---

## Acceptance Criteria

- `R1` (pill) When the built-in footer renders, the system shall draw a single rounded container enclosing the attachment button, textarea, speech button and send button, styled from `--asg-color-border` / `--asg-color-surface` / `--asg-radius-lg` / `--asg-spacing-*`, with the focus ring applied to the container via `:focus-within` instead of an `outline` on the textarea; the textarea itself shall carry no border, background or radius. → T2, T3
- `R2` (unified 📎) When `enableUpload` and/or `enableDocumentUpload` is set, the system shall show exactly one attachment button that opens a multi-select file picker accepting the union of the allowed image and document MIME types; when neither is set, no attachment button renders. → T1, T2
- `R3` (no mutual exclusion) When the user selects images and documents in any order or in one pick, the system shall keep all of them pending simultaneously and send their `blobIds` together, subject to the existing per-kind caps (10 images, 10 documents). → T1
- `R4` (speech + send) When the composer is idle, the system shall render the speech button and the send button side by side, the send button being `disabled` (not hidden, not replaced) while there is no text and no successfully uploaded attachment; when `isConnecting` and `stopGeneration` are available, the send button shall become the stop button. When the browser exposes no `SpeechRecognition` / `webkitSpeechRecognition`, the speech button shall not render at all — today it renders a dead button, which only stays unnoticed because it is currently hidden as soon as the user types. → T2
- `R5` (previews) When attachments are pending, the system shall render them inside the pill above the input row: images as a thumbnail grid (click → zoom modal, per-item uploading spinner / error overlay / remove) and documents as chips (`name` + formatted size + remove). → T4
- `R6` (slots) When `renderComposerAbove` is provided, its node shall render between the `RunningIndicator` and the pill; when `renderComposerInline` is provided, its node shall render inside the pill below the input row; both shall be able to read `useAsgardContext()`; `footerEndActions` shall keep rendering after the send button. When a slot is not provided, no wrapper element and no extra spacing shall appear. → T2, T5
- `R7` (Export relocation) When `enableExport` resolves true (prop or `annotations.embedConfig.enableExport`), the system shall contribute an Export History action to `ChatHeader.actions` that downloads the conversation markdown, and the footer shall no longer render any export control; consumers shall need no code change. → T6
- `R8` (theme compat) When a consumer supplies `chatbot.borderColor`, the system shall apply it to the pill border; `chatbot.footer.textArea.style`, `.submitButton.style`, `.attachmentButton.style` and `.speechInputButton.style` shall continue to apply to the textarea, send button, 📎 and 🎤 respectively; no new theme field is introduced and no color is hardcoded. → T3, T7
- `R9` (unchanged behavior) The `RunningIndicator` shall keep rendering at the footer's top edge with its existing sweep; `renderFooter` shall still replace the whole footer including both new slots; drag-and-drop and clipboard-paste ingestion shall keep working through the unified path; IME composition shall still suppress Enter-to-send. → T1, T2, T5
- `R10` (Sindri migration, phase 2, other repo) When `asgard-ai-agent-hub-web` upgrades to `0.3.20`, the conversation page shall drop `renderFooter` in favor of `renderComposerAbove={() => <ConversationControlBar …/>}`, delete `conversation-composer.tsx`, and rely on the SDK for input, attachments, send and stop — with Model selection, @mention, attachment upload, send and stop-generation all verified equivalent to today. `composer-shell.tsx` stays (the home page uses it without `<Chatbot>`). → T10, T11
- `R11` (smoke check) When the developer runs `npm run build:core && npm run build:react`, `npm run lint:packages`, `npm run format:check` and `npm run test:react`, and then drives a new `/composer` react-demo route plus `/all-features-wide` under the Crazy theme **in the browser via claude-in-chrome**, the system shall demonstrate R1–R9 with no console errors; screenshots land in `.github/screenshots/`. → T8, T9, T12

---

## Implementation Tasks

- [x] T1 (R2, R3, R9): Extract `use-attachment-upload.ts` — one `AttachmentItem` shape (`id` / `kind: 'image' | 'document'` / `file` / `status` / `blobId` / `previewUrl?` / `error?`) and one `addFiles(files: File[])` entry that splits by MIME, validates via the existing `validateImageFiles` / `validateDocumentFiles`, enforces the per-kind caps, reads previews for images only, and uploads through `client.uploadFile`. Expose `items` / `addFiles` / `remove` / `clear` / `isUploading` / `blobIds` / `documentNames` / `imagePreviewUrls`. Route drop (`useFileDropContext`) and paste through the same entry. No mutual clearing. Merge validation errors into a single message. Revoke object URLs on removal/unmount.
- [x] T2 (R1, R2, R4, R6, R9): Implement `chat-composer.tsx` + `.module.scss` — the pill: preview area, 📎, textarea (auto-grow with the existing container-relative max-height + `ResizeObserver`, IME guard, paste), speech button, send/stop button, `renderComposerInline` slot, `footerEndActions`. Send is `disabled` when there is nothing to send; stop replaces it only while connecting. Gate the speech button on `SpeechRecognition` / `webkitSpeechRecognition` availability (R4) — lift the capability check out of `speech-input-button.tsx`'s effect so the button can be omitted rather than rendered dead.
- [x] T3 (R1, R8): Rewrite `chatbot-footer.module.scss` for the new structure — pill container, `:focus-within` ring, bare textarea, `--asg-color-primary` send button — and reduce `chatbot-footer.tsx` to the assembly layer: `RunningIndicator` → `renderComposerAbove` → `ChatComposer`, plus content max-width and footer-level theme styles.
- [x] T4 (R5): Implement `attachment-preview.tsx` + `.module.scss` — image thumbnail grid (existing 100×80 look, uploading spinner, error overlay, remove, zoom modal) and document chips (paperclip + truncated name + `formatFileSize` + remove), rendered inside the pill above the input row.
- [x] T5 (R6, R9): Add `renderComposerAbove?: () => ReactNode` and `renderComposerInline?: () => ReactNode` to `ChatbotProps`, thread them to `ChatbotFooter`, and document that `renderFooter` still overrides everything. Keep `footerEndActions` semantics unchanged.
- [x] T6 (R7): Move Export History out of the footer — when `enableExport` resolves true, append an Export action to the default `ChatHeader` actions in `chat-header-host.tsx`, reusing `exportConversationToMarkdown` / `downloadMarkdown`; add the `header.export` i18n key (en/ja/zh); delete the footer's export button, its branch of the `+` menu, and `document-upload-button.tsx`.
- [x] T7 (R8): Redirect the theme-context auto-application of `borderColor` from `footer.textArea.style.borderColor` to the pill, and re-point the four inline-style groups at their relocated elements. No new theme field.
- [x] T8 (R11): Add Vitest coverage for `useAttachmentUpload` — mixed image+document selection stays pending together, caps enforced per kind, failed upload excluded from `blobIds`, object URLs revoked.
- [x] T9 (R11): Add `apps/react-demo/src/app/routes/composer/` route (model on `chat-header`) exercising every R# state — empty / typing / mixed attachments / uploading / error / connecting-stop / both slots filled / no-slot baseline / upload flags off — and register it in `app.tsx` + the layout nav. Comes after T1–T7 because the route consumes the new slot props.
- [x] T10 (R10, other repo): In `asgard-ai-agent-hub-web`, upgrade to `0.3.20` (local `npm pack` first), replace `renderFooter` with `renderComposerAbove`, delete `conversation-composer.tsx`, keep `composer-shell.tsx` for the home page, and remove now-dead attachment plumbing.
- [x] T11 (R10, other repo): Verify Sindri in the browser via claude-in-chrome on port 8344 — Model selector, @mention, attachment upload, send, stop generation, and the pill's placement relative to the control row; screenshot before/after.
- [x] T12 (R11): Run `npm run lint:packages`, `npm run format:check` (changed files only — `.prettierignore` lacks `references/`), `npm run build:core && npm run build:react`, `npm run test:react`; serve react-demo and walk `/composer` + `/all-features-wide` (Crazy theme) via claude-in-chrome; screenshots to `.github/screenshots/`.

---

## Coverage

Files:

- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.tsx` (reduced to the assembly layer)
- `packages/react/src/components/chatbot/chatbot-footer/chatbot-footer.module.scss` (rewritten for the pill)
- `packages/react/src/components/chatbot/chatbot-footer/chat-composer.tsx` (new — pill body)
- `packages/react/src/components/chatbot/chatbot-footer/chat-composer.module.scss` (new)
- `packages/react/src/components/chatbot/chatbot-footer/use-attachment-upload.ts` (new — unified upload hook)
- `packages/react/src/components/chatbot/chatbot-footer/attachment-preview.tsx` (new — thumbnails + chips + modal)
- `packages/react/src/components/chatbot/chatbot-footer/attachment-preview.module.scss` (new)
- `packages/react/src/components/chatbot/chatbot-footer/document-upload-button.tsx` (deleted — dead after 📎 unification)
- `packages/react/src/components/chatbot/chatbot.tsx` (new `renderComposerAbove` / `renderComposerInline` props)
- `packages/react/src/components/chatbot/chat-header/chat-header-host.tsx` (Export action when `enableExport`)
- `packages/react/src/context/asgard-theme-context.tsx` (borderColor redirected to the pill)
- `packages/react/src/i18n.ts` (`header.export`, en/ja/zh)
- `packages/core/package.json` + `packages/react/package.json` (`0.3.20`)
- `apps/react-demo/src/app/routes/composer/` (new demo route)
- `apps/react-demo/src/app/app.tsx` + `components/layout/layout.tsx` (register `/composer`)
- `asgard-ai-agent-hub-web` (phase 2): `src/components/conversation/conversation-view.tsx`, `conversation-composer.tsx` (deleted), `package.json`

---

## Behavior notes (intended changes under 0.3.20)

Every consumer sees these on upgrade; none requires a code change.

- The footer's flat 3-column row becomes one pill. The textarea loses its own border; the border and focus ring belong to the pill.
- Export / Image / Document collapse into one 📎, and the `+` overflow menu disappears (it existed only to fit three buttons).
- Export History moves to the chat header as an action.
- The speech button no longer disappears when the user types — it sits permanently left of the send button, and the send button is now disabled rather than replaced when there is nothing to send. On browsers without `SpeechRecognition` the button is omitted instead of rendered dead.
- Images and documents can be pending at the same time; documents render as chips instead of 3:2 cards.
- `renderComposerAbove` / `renderComposerInline` are additive; consumers already using `renderFooter` are unaffected.

---

## Execution Log / Change Log

- 2026-07-27: BUILD task created from an in-session design agreement (no PM issue). Design decisions 1–7 confirmed with the user; branch `feat/chat-kit-composer` (Status: `draft`).
- 2026-07-27: SDK implemented (T1–T9). `npm run build:core && npm run build:react` ✅, `npm run lint:packages` ✅ (0 errors; the one warning is pre-existing in `file-view.tsx`), `npm run format:check` ✅, `npm run test:react` ✅ 30/30 (+5 for `planAttachments`). Browser-verified with claude-in-chrome on `/composer` — pill / focus ring / `disabled` send / stop-while-streaming / mixed image+document previews / both slots / no-📎 when uploads are off / Export in the header / `renderFooter` still taking over; no console errors beyond the mock's missing blob endpoint (404, expected). Crazy theme on `/all-features-wide`: pill border, surface and send button all resolve from `--asg-color-*`, textarea background stays transparent. Screenshots in `.github/screenshots/build028-*`.
- 2026-07-27: **Bug found in browser (not by build/lint/tests):** the composer row used `grid-template-columns: auto 1fr auto`, but the 📎 is not rendered at all when both upload lanes are off — the two remaining children then landed on the wrong tracks, squeezing the textarea to its intrinsic `cols=20` width and handing the `1fr` to the send zone. Only `/all-features-wide` (uploads off) exposed it; `/composer`'s baseline has the 📎 and looked correct. Fixed by moving the row to flex, which is immune to the child count.
- 2026-07-27: Sindri migration (T10–T11) on `asgard-ai-agent-hub-web` branch `feat/sdk-composer-migration`, installed via `npm pack` of `0.3.20-local` (SDK versions restored afterwards; tarballs deleted). `renderFooter` → `renderComposerAbove` mounting only `ConversationControlBar`; `conversation-composer.tsx` deleted; control bar's `mb-2` dropped (the SDK footer content gap already provides it). `tsc --noEmit` ✅, `npm run lint` ✅ (2 pre-existing warnings). Browser-verified against the dev backend: message sent, image + text file uploaded **together** and both received by the agent ("The user has attached two files"), attachments cleared after send, the sent message's thumbnail still renders. Screenshots in that repo's `.github/screenshots/sdk-composer-*`.
- 2026-07-27: Heimdall (`asgard-ai-auto-post-web`) smoke-tested on `0.3.20-local` as an **untouched consumer** — it mounts `<Chatbot>` with no footer props at all, so it picks up the new pill without a code change. This is also the exact shape that exposed the grid bug (no upload lanes → no 📎): verified `display: flex`, textarea 1066px, send zone 13px from the right edge. Brand gold `#f6c814` flows into `--asg-color-primary` (focus ring, stop button) and the textarea stays transparent. Screenshot: `.github/screenshots/build028-heimdall-consumer.jpg`. The chatbot extension was explicitly out of scope for this check.
- 2026-07-27: Rebased onto `main` after BUILD-029 (PR #354) merged and `0.3.19` was published for it. No conflicts — BUILD-029 touches `templates/attachment-template/chip.tsx` (the sandbox card chip inside a message), this task touches `chatbot-footer/attachment-preview.tsx` (the composer's pending attachments). Version target moved `0.3.19` → `0.3.20`.
- 2026-07-27: Platform / Odin (`asgard-ai-platform-web`) smoke-tested on `0.3.20-local` — the richest consumer shape: `AgentChatPreview` passes `enableUpload` + `enableExport` + `enableDocumentUpload` **all true** plus `renderMenu`, which before this task rendered the three-button set collapsed into the `+` overflow menu. After: the overflow menu is gone (`attachment_menu_container` absent), footer buttons are `Attach files` / `Voice input` / `Stop generating`, header actions are `Export history` / `Reset conversation` / `Close`, and `renderMenu` still renders above the composer. Layout `display: flex`, textarea 1026px, send zone 13px from the right; `--asg-color-primary` = `hsl(160 84% 39%)` (Odin green) drives the stop button and the seam. Screenshot: `.github/screenshots/build028-platform-consumer.jpg`. Version bump PR opened as asgard-ai-platform-web#147.
- 2026-07-27: **Next dev servers cache the SDK across an `npm pack` install** — Platform kept rendering the old footer after the tarball was installed and a hard reload; only stopping `next dev`, clearing `.next` and restarting picked up the new build. Worth remembering for the remaining consumer upgrades.
- 2026-07-27: **Second bug the browser caught, reported from Platform:** the stop button rendered a red disc inside the primary-coloured square. `stop.svg` was never a glyph — it hardcoded `fill="#D04444"` for a disc plus a white square, i.e. a whole button. The pre-BUILD-028 stop button had a transparent background so that disc _was_ the button and looked right; giving the button a `--asg-color-primary` fill turned it into a button inside a button, and under the Crazy theme (primary = pure red) the glyph became nearly invisible against its own fill. Rewrote `stop.svg` as a plain `currentColor` rounded square, matching `send.svg` / `mic.svg`, so the glyph always contrasts with whatever fill the theme supplies. Also dropped `--asg-color-primary-contrast` from the send button — that token does not exist in the palette (only its `#fff` fallback was ever doing anything), and this repo already carries dead-token debt.
- 2026-07-27: Captured before/after pairs on every consumer, since the footer changes appearance for all of them and a reviewer cannot judge that from an "after" alone. Each pair is the same page, same interaction, only the installed SDK differing: Heimdall (no footer props at all), Platform (all three flags on — its `+` overflow menu expanded shows Document / Image / Export History collapsing into one 📎, and the speech button giving up the send slot) and Sindri (its in-app composer, where attachment chips sat outside the input box with no image thumbnail).
- 2026-07-27: Not done here by design — the `0.3.20` version bump, npm publish and both PRs. Sindri's `package.json` already points at `^0.3.20`, so its branch only builds once the SDK is published.
