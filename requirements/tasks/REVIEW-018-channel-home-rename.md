# REVIEW-018 Channel Home Rename (cwd:// → channel-home://, breaking)

## Meta

- Task ID: `REVIEW-018`
- Status: `done`
- BUILD Task: `BUILD-018`
- Reviewed commit: working tree on `54982a1` (uncommitted)
- Reviewed branch: `feat/channel-home-rename`

---

## §1 Static Code Review

Scan BUILD task `## Coverage` files against `FRONTEND_RULE_COMMON.md`. No server needed.

### §1.1 Checklist

| Check item                                                                                    | Rule                           | Result                 |
| --------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------- |
| No `any` / `as any`                                                                           | FRONTEND_RULE_COMMON §1.1      | ✅                     |
| No `@ts-ignore` / `eslint-disable` to bypass type/lint errors                                 | FRONTEND_RULE_COMMON §1.2      | ✅¹                    |
| No `console.log` in library code (non-debug-gated)                                            | FRONTEND_RULE_COMMON §1.3 §7   | ✅²                    |
| No hardcoded API key / endpoint / namespace                                                   | FRONTEND_RULE_COMMON §1.4      | ✅                     |
| RxJS/EventSource/timer teardown                                                               | FRONTEND_RULE_COMMON §1.5      | ✅ (無新增訂閱)        |
| `@asgard-js/react` imports core via public entry only (no `core/src`)                         | FRONTEND_RULE_COMMON §1.6      | ✅                     |
| `@asgard-js/core` does not import react/react-dom/DOM                                         | FRONTEND_RULE_COMMON §1.6 §2.1 | ✅                     |
| Public API breaking change via `@deprecated` transition                                       | FRONTEND_RULE_COMMON §1.7      | ⚠️³                    |
| New/renamed public symbols exported via package entry (`export type`)                         | FRONTEND_RULE_COMMON §2.2      | ✅⁴                    |
| Uses `botProviderEndpoint` (not deprecated `endpoint`)                                        | FRONTEND_RULE_COMMON §2.4      | ✅                     |
| Exported functions/methods declare explicit return types                                      | FRONTEND_RULE_COMMON §3.1      | ✅⁵                    |
| Shared types centralized in `core/src/types/`; no duplicate interfaces                        | FRONTEND_RULE_COMMON §3.2      | ✅                     |
| React component props fully typed (no `any`)                                                  | FRONTEND_RULE_COMMON §4.1      | ✅                     |
| No hardcoded color values (hex/rgba)                                                          | FRONTEND_RULE_COMMON §4.2      | ✅                     |
| core & react same version number                                                              | FRONTEND_RULE_COMMON §5        | ✅ (both 0.3.2)        |
| Repeated logic/types/JSX extracted                                                            | FRONTEND_RULE_COMMON §6        | ✅ (純 rename，無重複) |
| No `setTimeout` mock delay / dead code / untracked TODO                                       | FRONTEND_RULE_COMMON §7        | ✅⁶                    |
| Hard-cut complete: no residual `cwd`/`Cwd`/`CWD`/`cwd://`/`/cwd/download` under packages+apps | BUILD-018 R4                   | ✅                     |

註：

- ¹ §1.2 grep 命中 6 處 `// eslint-disable-next-line no-console`（client.ts:57/321/327/370/376、channel-home-download.ts:44），全部用於 **debugMode-gated 的 `console.log` 或 error-only `console.error`**（既有既定模式，本票只改字串內容、未新增任何 disable）→ 非違規。
- ² grep 命中 `console.log` 2 處（client.ts:322 file-upload、371 channel-home download），皆包在 `if (this.debugMode)` 內（§1.3 允許由 debug 選項控制的 logging）→ 非違規；371 為本票改名字串。
- ³ **§1.7 刻意豁免**：PM 決議「硬切、不留 `cwd://` fallback、無 `@deprecated` 過渡」，改以 version bump 承擔 breaking（BUILD-018 Scope note 已記為 decision）→ 不列為 violation。
- ⁴ core `src/index.ts` 以 `export type * from './types'` wildcard 匯出，`ChannelHomeDownloadResult` / `downloadChannelHomeFile` 自動流出（`npm run build:core` dts 產出確認）；react util 未對外匯出（僅 chip/card 內部 import），無需改 barrel。
- ⁵ `downloadChannelHomeFile(): Promise<ChannelHomeDownloadResult>`、`isChannelHomeUri(): boolean`、`downloadChannelHomeUri(): Promise<void>` 均標明 explicit return type。
- ⁶ grep 命中 `setTimeout` 2 處（client.ts:26 型別、258 detach timer）為既有 keep-connection 真實功能（有 teardown），非 mock delay。

### §1.2 Mechanical Grep

Scope: changed source files listed in `BUILD-018 ## Coverage`.

```bash
# §1.1 any / as any  → empty ✅
grep -n ': any\b|<any>|as any' <coverage-files>          # (no output)

# §1.2 ts-ignore / eslint-disable  → 6 hits, all pre-existing debug/error no-console (see 註¹)
client.ts:57,321,327,370,376  // eslint-disable-next-line no-console
channel-home-download.ts:44   // eslint-disable-next-line no-console

# §1.3/§7 console.log  → 2 hits, both debugMode-gated (see 註²)
client.ts:322  console.log('[AsgardServiceClient] File upload response:', result);
client.ts:371  console.log('[AsgardServiceClient] Channel Home download response:', { filename, size });

# §1.6 core reverse-dep react (packages/core changed files)  → empty ✅
grep -n "from 'react'|react-dom" client.ts types/client.ts    # (no output)

# §1.6 react deep-import core/src  → empty ✅
grep -n "@asgard-js/core/src|core/src/lib" channel-home-download.ts chip.tsx card.tsx  # (no output)

# §4.2 hardcoded colors in changed react files  → empty ✅
grep -n '#[0-9a-fA-F]{3,6}|rgba(' channel-home-download.ts chip.tsx card.tsx  # (no output)

# §7 setTimeout  → 2 hits, pre-existing detach timer (see 註⁶)
client.ts:26,258

# BUILD-018 R4 hard-cut sweep (git grep cwd on packages/apps)  → empty ✅
git grep -niE 'cwd' -- 'packages/**' 'apps/**' ':(exclude)references/**'   # (no output)
```

### §1.3 TypeScript and Lint

```bash
npm run lint:packages                          # ESLint core + react
npm run build:core && npm run build:react      # 型別檢查以 build 為準 (REVIEW_RULE §1.4)
npm run format:check                           # Prettier (changed files)
```

Results:

```
lint:packages: PASS — "Successfully ran target lint for 2 projects" (Nx Cloud 401 為 workspace 未連線警告，非 lint 錯誤)
build:core:    PASS — 259 modules, dts built, ✓ built
build:react:   PASS — dts built, ✓ built (authoritative type gate — green)
format:check:  PASS — 改動檔全數 Prettier-clean（repo 既有 baseline 303 檔未處理，非本票引入）
tsc --noEmit:  N/A — 直接跑 tsconfig.lib.json 產生 26× TS6305「.d.ts not built from source」composite/project-reference 陳舊噪音，遍及所有 core 檔（enum/index/所有 types…），與本票改動無關（grep channel-home/download/chip/card 零命中）；型別檢查以 build 為準（已 PASS）
```

### §1.4 Static Review Acceptance

- [x] All §1.1 items checked and marked ✅ (§1.7 豁免見 註 ³)
- [x] No ❌ violations
- [x] All §1.2 grep commands run and output pasted
- [x] `npm run build:core && npm run build:react` — green (authoritative type check)
- [x] `npm run lint:packages` — no ESLint errors

**§1 結果：0 violation。**

---

## §3 Functional Validation

Coverage.Use Cases = R1–R5 (≠ `—`) → 執行。core 邏輯用 Vitest；UI/行為用 react-demo `/channel-home-download`（http://localhost:4200）。

### R# Result Matrix

| R#  | Description                                                                                                               | Result | Note                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | core public API: `downloadChannelHomeFile` / `ChannelHomeDownloadResult`; route `/channel-home/download`; no `cwd` symbol | Pass   | `build:core` 匯出改名符號；`git grep cwd` on core 零殘留；client.spec.ts 5 tests pass；browser Network 打 `/channel-home/download`                                                                                                                                                                                                                                                                                 |
| R2  | react recognizes only `channel-home://` (no `cwd://` fallback); chip/card use renamed util                                | Pass   | `isChannelHomeUri` 只比對 `channel-home://`（無 `cwd://` 分支）；chip/card import `utils/channel-home-download`；browser: `channel-home://` attachment 顯示 download icon 且點擊觸發 handler                                                                                                                                                                                                                       |
| R3  | demo `/channel-home-download` + `channel-home://` mock + env var + README updated                                         | Pass   | browser 載入 `/channel-home-download`，heading「Channel Home Download (channel-home:// URI action)」+ `channel-home://業務員業績排行.json` mock；`.env.example` = `VITE_CHANNEL_HOME_BOT_PROVIDER_ENDPOINT`；README `downloadChannelHomeFile`/`ChannelHomeDownloadResult`                                                                                                                                          |
| R4  | hard-cut grep clean (no residual cwd)                                                                                     | Pass   | `git grep -niE cwd` on `packages/**` + `apps/**`（排除 references/）→ 空                                                                                                                                                                                                                                                                                                                                           |
| R5  | (Browser smoke) build green; click card → `GET .../channel-home/download`                                                 | Pass   | 點下載卡片 → Network: `GET http://localhost:9999/ns/test/bot-provider/bp-channel-home-test/channel-home/download?custom_channel_id=channel-home-download-demo&relative_path=%E6%A5%AD%E5%8B%99%E5%93%A1%E6%A5%AD%E7%B8%BE%E6%8E%92%E8%A1%8C.json`（非 `/cwd/download`、非 window.open；`ERR_CONNECTION_REFUSED` 因 dummy endpoint 無 server，符合預期）。截圖 `.github/screenshots/channel-home-download-demo.png` |

### §3.1 Acceptance

- [x] All R# executed (static read + browser operation + boundary)
- [x] Each R# marked Pass
- [x] Network panel confirms `GET .../channel-home/download` fired (not `/cwd/download`, not `window.open`)
- [x] core Vitest 71 pass（含 client.spec.ts 5）

> 邊界：`skip` endpoint（無 client）下卡片正確 render download icon 但點擊不發請求（offline UI-only，符合 demo 設計）；配置真實 endpoint（client 建立）後點擊發出 `/channel-home/download`。二態皆符合預期。

**§3 結果：R1–R5 全數 Pass。**

---

## Findings

### Critical (must fix before done)

None.

### Important (should fix in this cycle)

None.

### Minor (nice to have)

None.

---

## Review 總結

| Section                  | 結果 | 備註                                                                            |
| ------------------------ | ---- | ------------------------------------------------------------------------------- |
| §1 Static Code Review    | ✅   | 0 violation（§1.7 硬切依 PM 決議豁免）                                          |
| §3 Functional Validation | ✅   | R1–R5 全 Pass；core Vitest 71 pass；browser smoke 確認 `/channel-home/download` |

結論：§1 與 §3 皆通過，無 BLOCKER → REVIEW-018 驗收完成。

---

## Execution Log

- 2026-07-16: REVIEW task created, paired with BUILD-018 (Status: `draft`).
- 2026-07-16: BUILD-018 done → REVIEW ready (Status: `draft → ready`).
- 2026-07-16: §1 靜態（0 violation，§1.7 豁免）+ §3 功能（R1–R5 全 Pass）完成，無 BLOCKER (Status: `ready → in-progress → done`).
