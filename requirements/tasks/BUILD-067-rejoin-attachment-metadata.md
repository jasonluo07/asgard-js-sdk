# BUILD-067 Render replayed user attachments from the frame's blob metadata

## Meta

- Task ID: `BUILD-067`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-js-sdk/issues/448`
- Source spec: the issue body itself plus the backend's field contract in
  `asgard-ai-platform/asgard-sindri-pm#206`
  ([comment](https://github.com/asgard-ai-platform/asgard-sindri-pm/issues/206#issuecomment-5385064087)).
  PM has no tracking spec for it; behavioral context is
  `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-014-transcript-冷啟動重播內核與-message-user-事件.md`
  (the replayed `asgard.message.user` frame).
- Complexity: `M`

---

## Brief

A user turn that carried attachments comes back from a GET rejoin with nothing renderable: the frame
holds `blobIds`, while the template draws from `filePreviewUrls` (a browser-local object URL) and
`documentNames` — fields only the **live** send path provides. So a reload drops every chip, and a
pure-attachment turn (`text` is `''`) loses its bubble entirely, because all three branches of
`message_wrapper` are empty.

The backend now ships `blobs` alongside `blobIds` on that frame — `blobId` / `fileType` / `fileName`
(nullable) / `size` / `mime`, no URL. `@asgard-js/core` carries it through to
`ConversationUserMessage`, and `user-image-template` grows a replay branch: a chip per blob labelled
with `fileName` (or the file type's localized stand-in when it is `null`), and — for the old rows that
have `blobIds` **only** and will never be backfilled — a neutral "attachment" chip so the bubble exists.
Images render as chips too; Phase 1 carries no URL to fetch bytes from, and a visible chip beats a
message that is still missing.

**Already exists:** `packages/core/src/types/blob.ts` (`BlobData` with the same five fields, from the
upload response), `packages/core/src/types/sse-response.ts` (`MessageUserEventData` at 229),
`packages/core/src/types/channel.ts` (`ConversationUserMessage` at 143),
`packages/core/src/lib/conversation.ts` (`onMessageUser` at 424),
`packages/react/src/components/templates/user-image-template/user-image-template.tsx` (the two live
paths and the `.document_card` chip markup this reuses),
`packages/react/src/icons/{document,gallery,paperclip}.svg`, `packages/react/src/i18n.ts` (the three-locale
catalog), `apps/react-demo/src/mock-server/sse-mock.ts` (`handleMockTranscriptRejoin` at 1484 and the
channel-metadata gate at 1657 — the pattern a rejoin demo channel needs).

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
Each criterion is mapped to one or more Implementation Tasks (→ T#).

- `R1` When a replayed `asgard.message.user` frame carries `blobs`, the system shall put it verbatim on
  `ConversationUserMessage.blobs`; when the frame omits the key (old backend, or a turn with no
  attachment), the field shall be `undefined` — the addition is purely additive and no existing field
  changes. → T1, T2
- `R2` When a user message has `blobs` and neither `filePreviewUrls` nor `documentNames`, the system shall
  render one chip per blob, labelled with `fileName`, falling back to the localized stand-in for that
  `fileType` when `fileName` is `null`. → T3, T4
- `R3` When such a blob's `fileType` is `IMAGE`, the chip shall use the image glyph and fetch no bytes
  (Phase 1 carries no URL); every other value — including one this SDK does not know — shall fall to the
  document glyph without throwing. → T3, T4
- `R4` When a user message has `blobIds` but no `blobs` (an old transcript row, which the backend will
  never backfill), the system shall render one neutral "attachment" chip per id, so the bubble exists. → T3, T4
- `R5` When the live send path supplies `filePreviewUrls` and/or `documentNames`, the system shall render
  exactly what it renders today — the image previews and document cards, unchanged, with no replay chip
  duplicating them. → T3, T4
- `R6` When a replayed turn has an empty `text`, the system shall still render a visible bubble carrying
  its attachment chips, instead of the empty wrapper that reads as a missing message. → T3, T4
- `R7` When a stand-in label or the neutral "attachment" label is rendered, the string shall come from the
  `i18n.ts` catalog and be present in all three locales (`en-US` / `zh-TW` / `ja-JP`). → T3
- `R8` (Smoke check) When the developer runs `npm run build:core && npm run build:react`,
  `npm run typecheck`, `npm run test:packages`, and walks R2–R6 in the react-demo
  (`npm run serve:react-demo -- -- --port 5100`) on a rejoin channel whose transcript holds a
  pure-attachment turn, an attachment+text turn, and a legacy `blobIds`-only turn — at both the narrow
  default shell and a full-bleed wide shell — the system shall behave as R1–R7 describe with no build
  errors. → T5, T6, T7

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1): `packages/core/src/types/blob.ts` — add the shared `BlobFileType` union and the
      `MessageBlob` interface (`blobId` / `fileType` / `fileName: string | null` / `size` / `mime`,
      the backend's `ContextBlob` shape). Both are public via `export type * from './types'`.
- [x] T2 (R1): `MessageUserEventData` (`sse-response.ts`) and `ConversationUserMessage` (`channel.ts`)
      gain the optional `blobs`; `Conversation.onMessageUser` passes it through. Add core Vitest for the
      present / absent cases.
- [x] T3 (R2–R7): TDD first — a react spec that renders `UserImageTemplate` for the four data shapes
      (blobs / blobIds-only / live previews+docs / empty text + blobs) and fails against today's code.
      Then implement: a `user-attachment-chip` module owning the glyph + label resolution, the replay
      branch in `user-image-template.tsx` guarded so it never fires when a live path already rendered,
      and the new `attachment.*` keys in all three locales of `i18n.ts`.
- [x] T4 (R2–R6): `conversation-message-renderer.tsx` — route to `UserImageTemplate` when either
      `blobIds` or `blobs` is non-empty, so a future frame carrying only `blobs` still gets chips.
- [ ] T5: Run `npm run lint:packages` + `npm run format:check` + `npm run typecheck` +
      `npm run build:core && npm run build:react` + `npm run test:packages`
- [x] T6 (R8): react-demo — a rejoin channel in `sse-mock.ts` replaying the three turn shapes (metadata
      gate + `handleMockTranscriptRejoin` branch), and a route mounting two `<Chatbot>` shells on it
      (narrow default + full-bleed wide) so the chips are compared at both widths.
- [x] T7 (R8): Browser verification of R2–R6 at both widths, with a before/after pair captured by
      reverting the react changes.

---

## Coverage

Use Cases: `R1`–`R8`. R1 has core unit coverage in `conversation.spec.ts` (2 new cases); R2–R7 have react
unit coverage in `replay-attachments.spec.tsx` (10 cases, **8 of them red against the pre-fix source** —
the 2 that were green before and after are the live-path regression guards). R2–R7 were also walked in
the browser on a real `<Chatbot>` restoring a replayed transcript, with a before/after pair captured by
stashing the two react render files.

Files:

**`@asgard-js/core`**

- `types/blob.ts` — new `BlobFileType` (the six-value union; `BlobData.fileType`'s inline list now points
  at it) and `MessageBlob` (the frame's `ContextBlob` shape, no URL by design)
- `types/sse-response.ts` — `MessageUserEventData.blobs?`
- `types/channel.ts` — `ConversationUserMessage.blobs?`
- `lib/conversation.ts` — `onMessageUser` carries `blobs` through
- `lib/conversation.spec.ts` — 2 new cases (carried verbatim / absent key stays `undefined`)

**`@asgard-js/react`**

- `components/templates/user-image-template/user-attachment-chip.tsx` — **new**: `UserAttachmentChip`
  plus `resolveReplayAttachmentChips`, which owns the precedence (`blobs` authoritative → ids → none),
  the glyph choice, and the `fileName === null` stand-in
- `components/templates/user-image-template/user-image-template.tsx` — the replay block, gated on
  `hasLivePreviews` so it can never double a chip the live path already drew
- `components/templates/user-image-template/user-image-template.module.scss` — `.document_icon` pinned to
  20px (the shared icon files declare 24, the live card's inline glyph is 20)
- `components/templates/user-image-template/replay-attachments.spec.tsx` — **new**, 10 tests
- `components/chatbot/chatbot-body/conversation-message-renderer.tsx` — routes on `blobIds` **or** `blobs`
- `i18n.ts` — 6 new `attachment.*` keys × 3 locales

**`apps/react-demo`**

- `src/mock-server/sse-mock.ts` — `MockMessageBlob`, `userAttachmentFrame`, the
  `attachment-rejoin-demo*` replay branch (3 turn shapes) and its metadata gate, plus
  `handleMockBlobUpload` — the `POST /blob` mock that was missing, without which the **live** send path
  could not complete in the demo and R5 was not checkable in a browser at all
- `vite.config.ts` — mounts `/mock-asgard/blob`
- `src/app/routes/attachment-rejoin/` — **new** route, two shells (full-bleed wide + 375×640) on their own
  channel ids, with a locale switcher for R7
- `src/app/app.tsx`, `src/app/components/layout/layout.tsx` — route registration
- `src/app/routes/composer/composer.tsx` — the note claiming the mock has no blob endpoint is no longer
  true, so it now says what actually happens

Not touched, deliberately: the live `filePreviewUrls` / `documentNames` blocks in
`user-image-template.tsx`. They are near-duplicates of the new chip and stay hand-written, because
leaving them byte-identical is what makes "the send path is unchanged" checkable rather than argued.

---

## Execution Log / Change Log

- 2026-08-24: BUILD task created from https://github.com/asgard-ai-platform/asgard-js-sdk/issues/448 (Status: `draft`).
- 2026-08-24: Plan confirmed (R1–R8 as written, image attachments render as chips in Phase 1); branch
  `fix/448-rejoin-attachment-metadata` cut from `main` (Status: `draft → ready → in-progress`).
- 2026-08-24: core carries `blobs` through (`MessageBlob` + `BlobFileType` in `types/blob.ts`); 2 core
  cases green.
- 2026-08-24: TDD — `replay-attachments.spec.tsx` written first, **8 of 10 red** against the pre-fix
  source; the 2 green ones are the live-path guards. Implemented the chip module, the gated replay block
  and the `attachment.*` keys; all 10 pass.
- 2026-08-24: One judgment call worth recording: **`BlobFileType` is shared with `BlobData`**, whose
  inline union listed `UNKNOWN` but not the `BINARY` the backend actually returns. Keeping two lists is
  how they drift, so both now point at one alias that carries both values. Widening a union on a response
  object is additive for anything that reads it; nothing was removed or renamed.
- 2026-08-24: `lint:packages` ✅ (0 errors, 5 pre-existing warnings), `format:check` ✅, `typecheck`
  (core + react + demo) ✅, `build:core` + `build:react` ✅, `test:packages` 604 passed (core 252 / react
  352, +12).
- 2026-08-24: REVIEW-067 §3 boundary pass found one gap and it was fixed here: the backend keeps
  `fileName: ''` distinct from `null`, and honoring that literally produced a chip with a glyph and a
  blank label — which reads as a broken chip, not as a nameless file. Anything blank now earns the
  stand-in (`fileName?.trim()`), pinned by an 11th case covering `''` and `'   '`. `test:packages` after
  the fix: 605 passed (core 252 / react 353, +13).
- 2026-08-24: Browser verification on `/attachment-rejoin` (port 5100), both shells restoring the mock
  transcript. **Before** (the two react render files stashed): 0 chips, and the two pure-attachment turns
  rendered as empty bubbles — the agent's reply sits under nothing, exactly the reported symptom, in both
  widths. **After**: `file:quarterly.txt` / `image:圖片` / `image:revenue-chart.png` / `unknown:附件` in
  both shells; R7 re-checked by switching locale, giving `画像` / `添付ファイル` and `Image` /
  `Attachment`. R5 walked separately on `/composer` with a real pick of one PNG + one .txt: the send
  produced 1 image preview + the `quarterly.txt` card + the text bubble and **0** replay chips
  (Status: `in-progress → done`).
