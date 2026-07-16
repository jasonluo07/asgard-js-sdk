# BUILD-018 Channel Home Rename (cwd:// → channel-home://, breaking)

## Meta

- Task ID: `BUILD-018`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/21`
- Source spec: `references/asgard-sdk-pm/tracking/asgard-sdk-go/tasks/TASK-002-cwd-語彙全面改名為-channel-home-wire-sdk-breaking-rename-需原子部署.md` (母票；js-sdk mirror。js-sdk 專屬 TASK-003 tracking 檔尚未建立，issue #21 body 即詳細 spec)
- Complexity: `M`

---

## Brief

asgard-core 已把「每個 channel 的檔案下載/交換平面」由舊名 `cwd`（current working directory）正式改名為 **Channel Home**，並以**原子部署、無 `cwd` 相容別名**上線（舊 `/cwd/download` route 已原子移除）。asgard-sdk-go（reference SDK, PR #13）已對齊。本票在 `asgard-js-sdk` 同步這個 wire + 公開 API 的**硬切改名**：Download URI scheme `cwd://` → `channel-home://`、HTTP route `.../cwd/download` → `.../channel-home/download`、client method `downloadCwdFile` → `downloadChannelHomeFile`、型別 `CwdDownloadResult` → `ChannelHomeDownloadResult`，以及 react util / consumer / demo / core README 的連動改名。**只認 `channel-home://`，不保留 `cwd://` fallback**（歷史訊息裡的舊 `cwd://` 卡片將不再可下載，此為 PM 決議）。因公開 API 改名，對 `@asgard-js/core` 使用端為 **breaking change**。

**Already exists:** `packages/core/src/types/client.ts`（`CwdDownloadResult` / `IAsgardServiceClient.downloadCwdFile?`）、`packages/core/src/lib/client.ts`（`downloadCwdFile` + `/cwd/download` route）、`packages/react/src/utils/cwd-download.ts`（`CWD_SCHEME` / `isCwdUri` / `downloadCwdUri`）、consumer `attachment-template/chip.tsx` + `button-template/card.tsx`、demo `apps/react-demo/src/app/routes/cwd-download/*` + `app.tsx` route + `.env.example`、`packages/core/README.md`。全部就地改名，無新檔（除檔名 rename）。

---

## Relevant Rules

Distilled from `FRONTEND_RULE_COMMON.md`; builder reads this table instead of the full corpus.

| §    | Rule (summary)                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| §1.1 | No `any` / `as any` — use precise types, generics, or `unknown` + narrowing                                                                   |
| §1.2 | No `@ts-ignore` / `eslint-disable` to bypass type or lint errors                                                                              |
| §1.3 | No `console.log` left in library code (gate behind an explicit debug option if needed)                                                        |
| §1.4 | No hardcoded API key / endpoint / namespace — pass via `config`                                                                               |
| §1.6 | `@asgard-js/core` never imports `react` / `react-dom` / DOM; react imports core via its public entry only (no `core/src`)                     |
| §1.7 | ⚠️ **本票刻意豁免**：PM 決議「硬切、不留 `cwd://` fallback、無 `@deprecated` 過渡」，改以 **version bump** 承擔 breaking（見下方 Scope note） |
| §2.2 | New public types / functions / components exported from the package entry with explicit `export type`                                         |
| §3.1 | Exported functions / methods declare explicit return types                                                                                    |
| §3.2 | Shared types centralized in `core/src/types/`; no duplicate interfaces across files                                                           |
| §4.1 | React component props fully typed (no `any`)                                                                                                  |
| §5   | `@asgard-js/core` and `@asgard-js/react` keep the same version number                                                                         |
| §6   | After implementation: extract repeated logic (≥2×), duplicate types, repeated JSX (≥3×)                                                       |
| §7   | No `setTimeout` mock delays, no `console.log`, no dead commented code, no untracked TODO / FIXME                                              |

**Barrel note:** core `src/index.ts` 以 `export type * from './types'`（wildcard）匯出，型別改名自動流出，**無需改 barrel**；react `utils/index.ts` 未匯出 `cwd-download`（僅 chip/card 內部 import），**亦無需改 barrel**。§2.2 因此只需確保改名後對外符號（`downloadChannelHomeFile` / `ChannelHomeDownloadResult`）經既有 wildcard 正確暴露。

**Scope note（不在本 BUILD 範圍）:** version bump（`package.json` ×2）、npm publish、git tag、CHANGELOG/MIGRATION 檔屬 **release 流程**，且 issue 明載「**發版需與 asgard-core 上線窗口綁定**（wire 無相容別名）」，由使用者於部署窗口驅動，不在本票程式改動內。本票只做程式/demo/docs 的改名。

---

## Acceptance Criteria

EARS form: `When <event/condition>[, while <state>], the system shall <observable behavior>`.

- `R1` When a caller uses `@asgard-js/core`'s public API, the system shall expose `AsgardServiceClient.downloadChannelHomeFile(relativePath, customChannelId)` returning `Promise<ChannelHomeDownloadResult>` and `IAsgardServiceClient.downloadChannelHomeFile?`, and the method shall issue `GET <base>/channel-home/download?custom_channel_id=...&relative_path=...`; no `downloadCwdFile` / `CwdDownloadResult` symbol nor `/cwd/download` route path shall remain in core. → T1, T2
- `R2` When the react attachment/button templates encounter a download action URI, the system shall recognize **only** the `channel-home://` scheme (via `isChannelHomeUri`) and dispatch it through `downloadChannelHomeUri` → `client.downloadChannelHomeFile`; a legacy `cwd://` URI shall **not** be treated as a downloadable link (no `cwd://` fallback), and `chip.tsx` / `card.tsx` shall import from `utils/channel-home-download`. → T3, T4
- `R3` When the react-demo and core docs are consulted, the system shall present the demo route at `/channel-home-download` with a `channel-home://` mock attachment, `.env.example` using `VITE_CHANNEL_HOME_BOT_PROVIDER_ENDPOINT`, and `packages/core/README.md` documenting `downloadChannelHomeFile` / `ChannelHomeDownloadResult` (anchor `channel-home-download-result`). → T5, T6
- `R4` When the codebase is grepped for `cwd` / `Cwd` / `CWD` / `cwd://` / `/cwd/download` under `packages/**` and `apps/**` (excluding `references/` submodules, historical `requirements/tasks/*` records, and `process.cwd()` if any), the system shall return no matches (hard-cut complete). → T7
- `R5` (Smoke check) When the developer runs `npm run lint:packages`, `npm run format:check`, and `npm run build:core && npm run build:react`, and then opens the react-demo (`npm run serve:react-demo`, http://localhost:4200) `/channel-home-download` route and clicks the attachment card, the system shall build with no errors and fire a `GET <base>/channel-home/download?...` network request (no `window.open`, no `/cwd/download`). → T8, T9

---

## Implementation Tasks

Run in order; each task maps to the R# it satisfies.

- [x] T1 (R1): `packages/core/src/types/client.ts` — `CwdDownloadResult` → `ChannelHomeDownloadResult`; `IAsgardServiceClient.downloadCwdFile?` → `downloadChannelHomeFile?`.
- [x] T2 (R1): `packages/core/src/lib/client.ts` — import 改名；method `downloadCwdFile` → `downloadChannelHomeFile`；route `${base}/cwd/download` → `${base}/channel-home/download`；錯誤訊息（`Unable to derive cwd download endpoint` / `CWD download failed`）+ JSDoc 註解同步改名。
- [x] T3 (R2): rename `packages/react/src/utils/cwd-download.ts` → `channel-home-download.ts`；`CWD_SCHEME='cwd://'` → `CHANNEL_HOME_SCHEME='channel-home://'`；`isCwdUri` → `isChannelHomeUri`；`downloadCwdUri` → `downloadChannelHomeUri`；內部呼叫 `client.downloadCwdFile` → `downloadChannelHomeFile`；註解 + `console.error` 訊息同步。只認 `channel-home://`，不留 fallback。
- [x] T4 (R2): consumers — `attachment-template/chip.tsx`（import 路徑 + `isCwdUri`/`downloadCwdUri` + local `isDownloadCwd` → `isDownloadChannelHome`）；`button-template/card.tsx`（import 路徑 + `isCwdUri`/`downloadCwdUri`）。
- [x] T5 (R3): demo — rename dir `apps/react-demo/src/app/routes/cwd-download/` → `channel-home-download/`；`cwd-download.tsx` → `channel-home-download.tsx`（`CwdDownload` → `ChannelHomeDownload`、`createCwdAttachmentExample` → `createChannelHomeAttachmentExample`、`cwd://` mock literals → `channel-home://`、title/description/comment/env var 同步）；`index.ts` export 改名；`app.tsx` import + `<Route path="/cwd-download">` → `/channel-home-download`；`.env.example` `VITE_CWD_BOT_PROVIDER_ENDPOINT` → `VITE_CHANNEL_HOME_BOT_PROVIDER_ENDPOINT`。
- [x] T6 (R3): `packages/core/README.md` — `downloadCwdFile` → `downloadChannelHomeFile`、`CwdDownloadResult` → `ChannelHomeDownloadResult`、anchor `cwd-download-result` → `channel-home-download-result`、`cwd://` / `/cwd/download` 文字 → channel-home。
- [x] T7 (R4): grep sweep（`git grep -niE 'cwd'` on packages/apps）確認零殘留（references/、historical requirements/tasks 除外）。
- [x] T8: `npm run lint:packages` ✅ + `npm run format:check`（改動檔全綠；repo 既有 baseline 未處理）+ `npm run build:core && npm run build:react` ✅。
- [x] T9 (R5): Smoke — build core+react ✅；core Vitest 71 pass；react-demo `/channel-home-download` 點卡片 → Network `GET .../channel-home/download?custom_channel_id=...&relative_path=...`（非 `/cwd/download`、非 window.open）；截圖 `.github/screenshots/channel-home-download-demo.png`。

---

## Coverage

Use Cases: R1, R2, R3, R4, R5 (母票 TASK-002 無 linked use-case；本票以 R# 為驗收單位)

Files:

- `packages/core/src/types/client.ts` (core) — `CwdDownloadResult` → `ChannelHomeDownloadResult`；`IAsgardServiceClient.downloadCwdFile?` → `downloadChannelHomeFile?`
- `packages/core/src/lib/client.ts` (core) — import + method `downloadChannelHomeFile`；route `/channel-home/download`；error/debug 訊息 + JSDoc
- `packages/react/src/utils/channel-home-download.ts` (react) — renamed from `cwd-download.ts`；`CHANNEL_HOME_SCHEME` / `isChannelHomeUri` / `downloadChannelHomeUri`
- `packages/react/src/components/templates/attachment-template/chip.tsx` (react) — import + `isChannelHomeUri`/`downloadChannelHomeUri` + `isDownloadChannelHome`
- `packages/react/src/components/templates/button-template/card.tsx` (react) — import + `isChannelHomeUri`/`downloadChannelHomeUri`
- `packages/core/README.md` (docs) — `downloadChannelHomeFile` / `ChannelHomeDownloadResult` / anchor `channel-home-download-result`
- `apps/react-demo/src/app/routes/channel-home-download/channel-home-download.tsx` (demo) — renamed；`ChannelHomeDownload` + `channel-home://` mock + env var
- `apps/react-demo/src/app/routes/channel-home-download/index.ts` (demo) — export 改名
- `apps/react-demo/src/app/app.tsx` (demo) — import + `<Route path="/channel-home-download">`
- `apps/react-demo/.env.example` (demo) — `VITE_CHANNEL_HOME_BOT_PROVIDER_ENDPOINT`

Barrel（core `index.ts` / react `utils/index.ts`）無需改動：core 型別經 `export type * from './types'` wildcard 自動流出；react util 未對外匯出（僅 chip/card 內部 import）。

---

## Execution Log / Change Log

- 2026-07-16: BUILD task created from https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/21 (Status: `draft`).
- 2026-07-16: Plan confirmed by user; implementation started (Status: `draft → ready → in-progress`).
- 2026-07-16: T1–T9 complete. Hard-cut rename across core/react/demo/docs；`git grep cwd` on packages+apps 零殘留；lint ✅ / build:core ✅ / build:react ✅ / core Vitest 71 pass；browser smoke 確認點卡片打 `GET .../channel-home/download`（非 `/cwd/download`、非 window.open）。version bump / publish / CHANGELOG 留給 release 流程（deploy-window-bound，見 Scope note）。(Status: `in-progress → done`).
