---
name: release-canary
description: 發佈 @asgard-js/core 和 @asgard-js/react 的 canary 版本到 npm
---

## 步驟

### 1. 確認 npm 登入狀態

```bash
npm whoami
```

如果未登入，提示使用者執行 `! npm login`。

### 2. 計算版號

讀取 `packages/core/package.json` 的當前版本（例如 `0.2.33`）。

查詢 npm 上已存在的 canary 版本：

```bash
npm view @asgard-js/core versions --json 2>/dev/null | grep canary
```

根據規則決定版號：

- 基礎版號 = 當前版本的 patch + 1（例如 `0.2.33` → `0.2.34`）
- 如果 npm 上沒有該基礎版號的 canary → 使用 `{基礎版號}-canary.1`
- 如果已有 canary → 取最大編號 + 1（例如已有 `canary.3` → 使用 `canary.4`）
- 最終版號格式：`X.Y.Z-canary.N`

告知使用者即將發佈的版號，確認後才繼續。

### 3. 更新版號

同時更新兩個 package.json 的 version 欄位：

- `packages/core/package.json`
- `packages/react/package.json`

### 4. Build

```bash
npm run build:core && npm run build:react
```

build 失敗則停止，不要發佈。

### 5. 發佈

依序發佈，使用 `--tag canary`：

```bash
cd packages/core && npm publish --tag canary
cd packages/react && npm publish --tag canary
```

### 6. 還原版號

發佈完成後，將兩個 package.json 的 version **還原回原本的版號**。
canary 版號只存在於 npm，不留在 git 歷史中。

### 7. 驗證

```bash
npm view @asgard-js/core@canary version
npm view @asgard-js/react@canary version
```

### 8. 回報

列出：

- 發佈的版號
- 安裝指令：`npm install @asgard-js/core@canary @asgard-js/react@canary`
