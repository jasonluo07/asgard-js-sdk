# BUILD-022 sandbox:// Handoff Cards (Browser Handoff / Open File)

## Meta

- Task ID: `BUILD-022`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/28`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-js-sdk/features/F-020-sandbox-handoff-卡片-瀏覽器接手-開檔.md` (+ `use-cases/UC-034` / `UC-035` / `UC-036`; prototype `SandboxCards.tsx`)
- Complexity: `M`

---

## Brief

Agent pushes two attachment actions carrying a custom `sandbox://` URI (mirroring the existing `channel-home://` download card): `sandbox://<name>/open-browser` (invite the user to take over the sandbox's browser session — 2FA / login / captcha) and `sandbox://<name>/open-file?absolute_path=<abs>` (preview a file in the File Explorer). `sandbox://` is **not** a browser-openable URL — the uri-validation whitelist only passes http/https/mailto/tel, and `window.open('sandbox://…')` would open a broken tab. So the click dispatch must intercept the `sandbox://` scheme **before** the `safeWindowOpen` fallback, resolve it to a typed intent via `resolveSandboxUri()`, and run the SDK side effect: open-browser → core `POST sandbox/{name}/browser/open-url` for a one-time URL then open it (default new tab, configurable); open-file → hand a typed intent to a host callback (the File Explorer destination lands in F-021). The uri-action dispatch currently duplicated in the attachment chip and the button/carousel card is consolidated into one shared util (mirroring `channel-home-download.ts`).

**Already exists:** `channel-home-download.ts` (`isChannelHomeUri` / `downloadChannelHomeUri` — the sister util template); `uri-validation.ts` (`safeWindowOpen` + the http/https/mailto/tel whitelist); the duplicated uri-case dispatch in `attachment-template/chip.tsx` (`dispatchAction`) and `button-template/card.tsx` (`handleClick`); `AsgardTemplateContext` (holds `defaultLinkTarget`, `onTemplateBtnClick`); `client.ts` (`downloadChannelHomeFile`, `channelMetadata` — the fetch + envelope-tolerant decode patterns); F-019 `launchedSandboxes` on `Channel`. No `sandbox://` handling, no browser-open-url client method yet.

---

## Relevant Rules

| §    | Rule (summary)                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` — `SandboxUriIntent` is a typed discriminated union                                                         |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass types                                                                   |
| §1.4 | No hardcoded endpoint — the browser-open-url method derives from `botProviderEndpoint`                               |
| §1.6 | `@asgard-js/core` never touches the DOM — the open-url fetch is core; `window.open` / `safeWindowOpen` stay in react |
| §1.7 | Additive only — new util + client method + optional context props; no breaking change                                |
| §2.2 | New public API (`resolveSandboxUri`, `SandboxUriIntent`, the client method) exported from the package entry          |
| §3.1 | Explicit return types on all new exports                                                                             |
| §3.2 | Consolidate the duplicated uri-action dispatch into one shared util (no second copy across chip / card)              |
| §4.2 | Card visuals via CSS variables / theme; single `--primary` accent; honor `prefers-reduced-motion`                    |
| §6   | The `sandbox://` intercept lives once in the shared dispatch util, reused by chip + card                             |

---

## Acceptance Criteria

- `R1` (AC4) `resolveSandboxUri(uri)` parses `sandbox://<name>/<action>?<query>` into a typed `SandboxUriIntent` (`open-browser` → `{ kind, sandboxName }`; `open-file` + `absolute_path` → `{ kind, sandboxName, absolutePath }`); an unknown action / missing `absolute_path` / malformed URI returns `null` (host ignores → treated as a plain card). → T1
- `R2` (AC3) A shared uri-action dispatch util intercepts the `sandbox://` scheme **before** `safeWindowOpen`; `sandbox://` never enters the uri-validation whitelist and its raw URI is never `window.open`ed. Non-`sandbox://` uris fall through to the existing whitelist + `safeWindowOpen` unchanged. → T2, T3
- `R3` (AC5) The uri-action dispatch duplicated in `chip.tsx` + `card.tsx` is consolidated into the single shared util; both call sites route through it. → T3
- `R4` (AC1) An `open-browser` intent calls core `client.generateSandboxBrowserOpenUrl(sandboxName)` for a one-time URL and opens it — **default new tab**, configurable via a template-context prop (target and/or a host `onSandboxOpenBrowser` override); on failure it surfaces the error and **never** `window.open`s the raw `sandbox://` URI. → T2, T4

  > Backend contract (confirmed against `asgard-core` `edgeserver` `GenerateSandboxBrowserOpenUrl`, `bot_provider.go:1984`): `POST {botProviderEndpoint}/sandbox/{sandbox_name}/browser/open-url`, path params only (no `custom_channel_id`), `X-API-KEY` auth, response `{ data: { openURL: string } }` (`RespWrapper{data=map[string]string}`). Decode via the same `json.data ?? json` envelope tolerance as `channelMetadata`, reading `openURL`.

- `R5` (AC2) An `open-file` intent is handed to a host `onSandboxOpenFile(sandboxName, absolutePath)` callback (the File Explorer preview destination is F-021); absent callback → no-op (documented), never a broken tab. → T2, T5
- `R6` (AC6) The clickable sandbox action reads as an action card per the design system — single `--primary` accent, hover / active affordance, honor `prefers-reduced-motion` (satisfied by the existing attachment/button template card styles; no line-by-line port of the prototype `<style>`). → T6
- `R7` (Smoke) build green; core Vitest covers `resolveSandboxUri` (both intents + null cases) and the shared dispatch (sandbox intercept precedes whitelist; open-browser → client method → open; open-file → callback; channel-home + plain uri unchanged); a scoped react-demo route exercises both cards (open-browser opens the returned URL via a mock client; open-file fires the callback) — browser-verified with a screenshot. → T7, T8

---

## Implementation Tasks

- [x] T1 (R1): `packages/react/src/utils/resolve-sandbox-uri.ts` — port `resolveSandboxUri` + `SandboxUriIntent` from the prototype (hand-written regex + `URLSearchParams`); export from the react entry.
- [x] T2 (R2, R4, R5): `packages/core/src/lib/client.ts` — `generateSandboxBrowserOpenUrl(sandboxName)` (`POST {base}/sandbox/{sandboxName}/browser/open-url`, `X-API-KEY`, envelope-tolerant decode → `data.openURL` string). `packages/react/src/utils/dispatch-uri-action.ts` (new shared util) — `sandbox://` intercept → `resolveSandboxUri` → open-browser (client method → open target) / open-file (callback); else channel-home → download; else `safeWindowOpen`.
- [x] T3 (R2, R3): `attachment-template/chip.tsx` + `button-template/card.tsx` — replace the duplicated uri-case with a call to the shared dispatch util.
- [x] T4 (R4): `AsgardTemplateContext` + `Chatbot` props — `onSandboxOpenBrowser?` / `sandboxBrowserOpenTarget?` (default `_blank`); thread through to the dispatch util.
- [x] T5 (R5): `AsgardTemplateContext` + `Chatbot` props — `onSandboxOpenFile?(sandboxName, absolutePath)`; thread through.
- [x] T6 (R6): confirm the attachment chip / button card action visuals meet the design-system action-card bar (accent, hover/active, reduced-motion); adjust only if a gap exists (no new prototype `<style>` port).
- [x] T7 (R7): core Vitest for `generateSandboxBrowserOpenUrl` decode; react-side `resolveSandboxUri` + shared-dispatch tests (see note: react test harness — added if feasible, else covered by the demo smoke).
- [x] T8 (R7): scoped react-demo route (`/sandbox-cards`) with a mock client returning a fake open-url; browser-verify open-browser (opens returned URL) + open-file (fires callback) + a plain uri (unchanged); screenshot to `.github/screenshots/`.
- [x] T9: `npm run lint:packages` + `npm run format:check` + `npm run build:core && npm run build:react`.

---

## Coverage

Use Cases: R1 (core Vitest — `resolve-sandbox-uri.spec`), R2/R3 (shared dispatch util + chip/card wiring; browser smoke), R4 (core Vitest — `generateSandboxBrowserOpenUrl`; dispatch default/override paths), R5 (dispatch open-file → callback; browser smoke), R6 (existing attachment/button card visuals), R7 (build + Vitest + `/sandbox-cards` browser smoke + screenshot)
Files:

- `packages/core/src/lib/resolve-sandbox-uri.ts` (core) — `resolveSandboxUri` + `SandboxUriIntent`
- `packages/core/src/lib/resolve-sandbox-uri.spec.ts` (core) — 7 tests
- `packages/core/src/lib/client.ts` (core) — `generateSandboxBrowserOpenUrl(sandboxName)`
- `packages/core/src/lib/client.spec.ts` (core) — +4 tests
- `packages/core/src/index.ts` (core) — export `resolveSandboxUri` / `SandboxUriIntent`
- `packages/react/src/utils/dispatch-uri-action.ts` (react) — shared uri-action dispatcher (`sandbox://` intercept before `safeWindowOpen`)
- `packages/react/src/context/asgard-template-context.tsx` (react) — `onSandboxOpenBrowser` / `onSandboxOpenFile` / `sandboxBrowserOpenTarget`
- `packages/react/src/components/chatbot/chatbot.tsx` (react) — thread the three props
- `packages/react/src/components/templates/attachment-template/chip.tsx` (react) — route uri case through the shared util
- `packages/react/src/components/templates/button-template/card.tsx` (react) — route uri case through the shared util
- `apps/react-demo/src/app/routes/sandbox-cards/*` + `app.tsx` + `layout.tsx` (demo) — `/sandbox-cards` route
- `.github/screenshots/f-020-sandbox-cards.png` (evidence)

---

## Execution Log / Change Log

- 2026-07-22: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/28 (F-020 + UC-034/035/036) (Status: `draft`).
- 2026-07-22: Backend contract confirmed against `asgard-core` `edgeserver` `GenerateSandboxBrowserOpenUrl` (`POST {base}/sandbox/{name}/browser/open-url`, `{ data: { openURL } }`, path params only). Placement decision: the pure `resolveSandboxUri` parser lives in `@asgard-js/core` (framework-agnostic, gets Vitest coverage — react has no test harness), re-exported from the core entry; only the DOM-touching dispatch util stays in react.
- 2026-07-22: Implemented T1–T9 via TDD (`resolveSandboxUri` 7 + `generateSandboxBrowserOpenUrl` 4, test-first). Consolidated the duplicated chip/card uri dispatch into `dispatch-uri-action.ts` (sandbox intercept precedes the whitelist). open-file wires a host callback (F-021 destination). Core Vitest 112/112 (+11). lint + build green. `/sandbox-cards` browser-verified: both cards resolve the correct typed intent + params, the plain https control falls through, no raw `sandbox://` window.open (Status: `in-progress → done`).
