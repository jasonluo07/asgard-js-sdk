# Streamdown 遷移計畫

## 🎯 概述

全面淘汰 react-markdown 生態系統，改用 streamdown 來實現流式 markdown 渲染。Streamdown 是 Vercel 開發的專為 AI 流式內容設計的 react-markdown 替代品，能夠更好地處理不完整的 markdown 區塊。

## 📊 目前 react-markdown 的使用情況

### 主要檔案

- `packages/react/src/hooks/use-react-markdown-renderer.tsx` - 核心渲染器（282 行）
- `packages/react/src/components/templates/text-template/text-template.tsx` - 使用渲染器
- `packages/react/src/components/templates/text-template/bot-typing-box.tsx` - 使用渲染器
- `packages/react/src/components/templates/text-template/use-react-markdown-renderer.spec.tsx` - 測試檔案
- `packages/react/src/hooks/index.ts` - 匯出 hook

### 相關文檔

- `docs/react-markdown-migration.md` - 原本的遷移文檔
- `docs/react-markdown-migration-phase2.md` - 第二階段遷移文檔
- `docs/react-markdown-migration-test-cases.md` - 測試案例文檔

## 🗑️ 需要移除的套件和依賴

### 在 `packages/react/package.json` 中的套件：

```json
{
  "react-markdown": "^10.1.0", // 主要套件 (~50KB)
  "remark-gfm": "^4.0.1", // GitHub Flavored Markdown 支援
  "remark-math": "^6.0.0", // 數學表達式解析 (~15KB)
  "rehype-highlight": "^7.0.2", // 語法突出顯示
  "rehype-katex": "^7.0.1", // LaTeX 數學渲染 (~25KB)
  "katex": "^0.16.22", // 數學渲染引擎
  "highlight.js": "^11.11.1" // 語法突出顯示引擎
}
```

### CSS 依賴

- `katex/dist/katex.min.css` 的引入（在 use-react-markdown-renderer.tsx:14）

### 總體移除大小估算

- 約 **90KB+** 的 bundle 大小減少

## 🔄 Streamdown 替代方案

### 優勢

- ✅ 專為 AI 流式內容設計的 react-markdown 替代品
- ✅ **支援所有 react-markdown props** - 遷移更簡單
- ✅ 內建處理不完整 markdown 區塊的能力
- ✅ 更簡潔的 API（直接作為 children 傳入）
- ✅ 內建 Mermaid 圖表支援
- ✅ 與 AI SDK 的 useChat 完美整合
- ✅ 更小的 bundle 大小
- ✅ 更好的流式渲染性能

### 基本用法

```tsx
import { Streamdown } from 'streamdown';

// 替換複雜的 hook
<Streamdown>{markdownText}</Streamdown>;
```

### 功能支援檢查

**✅ 已確認支援（基於 context7 驗證）：**

- [x] 基本 markdown 語法
- [x] GitHub Flavored Markdown (GFM) - 默認包含 remarkGfm
- [x] 數學表達式渲染 (KaTeX) - 默認包含 remarkMath, rehypeKatex
- [x] 語法突出顯示 (Shiki) - 支援 light/dark 主題
- [x] Mermaid 圖表 - 內建支援且可配置
- [x] 自訂元件覆寫 - 支援 components prop
- [x] 流式渲染不完整 markdown 區塊 - parseIncompleteMarkdown
- [x] remark/rehype 插件配置 - remarkPlugins, rehypePlugins props
- [x] **所有 react-markdown props** - 完全相容

**⚠️ 需要適配的功能：**

- defaultLinkTarget - 需透過 components.a 自訂實作
- 主題顏色整合 - 需要適配到 shikiTheme
- 現有 CSS 樣式 - 從 highlight.js 遷移到 Shiki 樣式

### 完整的 Props API（基於 context7 驗證）

```tsx
interface StreamdownProps {
  // 核心 props
  children: string; // markdown 內容

  // 流式渲染配置
  parseIncompleteMarkdown?: boolean; // 預設 true - 處理不完整區塊

  // 插件配置（默認包含 remarkGfm, remarkMath, rehypeKatex）
  remarkPlugins?: PluggableList; // remark 插件陣列
  rehypePlugins?: PluggableList; // rehype 插件陣列

  // 元件自訂
  components?: Components; // 覆寫任何 HTML 元素的渲染

  // 樣式和主題
  shikiTheme?:
    | string
    | {
        // Shiki 語法突出主題
        light?: string; // 預設: 'github-light'
        dark?: string; // 預設: 'github-dark'
      };

  // Mermaid 圖表
  mermaidConfig?: object; // Mermaid 圖表配置

  // 安全性設定
  allowedImagePrefixes?: string[]; // 允許的圖片 URL 前綴
  allowedLinkPrefixes?: string[]; // 允許的連結 URL 前綴
  defaultOrigin?: string; // 相對 URL 的預設來源

  // UI 控制
  controls?: boolean; // 顯示複製/下載按鈕

  // 重要：支援所有 react-markdown props
  // 包括 className, skipHtml, linkTarget 等
}
```

## 📋 執行計畫

### 階段 1: 準備和移除

1. **備份目前實作**

   - 建立分支進行遷移
   - 確保所有測試通過

2. **移除舊套件**

   ```bash
   cd packages/react
   npm uninstall react-markdown remark-gfm remark-math rehype-highlight rehype-katex katex highlight.js
   ```

3. **安裝 streamdown**
   ```bash
   npm install streamdown
   ```

### 階段 2: 重構核心實作

1. **重寫 use-react-markdown-renderer.tsx**

   - 簡化複雜的 token 解析邏輯
   - 移除快取機制（streamdown 內建優化）
   - 保持相同的 API 介面以減少影響
   - 保留 typing effect 功能
   - **關鍵實作要點**：
     ```tsx
     // 利用 Streamdown 支援所有 react-markdown props
     <Streamdown
       remarkPlugins={[remarkGfm, remarkMath]}
       rehypePlugins={[rehypeKatex]}
       components={{
         a: ({ href, children }) => (
           <a href={href} target={defaultLinkTarget}>
             {children}
           </a>
         ),
       }}
     >
       {markdownText}
     </Streamdown>
     ```

2. **更新元件**
   - `text-template.tsx`
   - `bot-typing-box.tsx`
   - 確保 API 相容性
   - 更新 CSS 模組：`.hljs` → Shiki 樣式類別

### 階段 3: 測試和驗證

1. **更新測試檔案**

   - 重寫 `use-react-markdown-renderer.spec.tsx`
   - 確保所有功能測試通過
   - 驗證渲染結果一致性

2. **功能驗證**
   - 基本 markdown 渲染
   - GFM 功能（表格、任務列表等）
   - 數學表達式（如果支援）
   - 語法突出顯示
   - 連結處理
   - 主題整合

### 階段 4: 清理和文檔

1. **移除舊文檔**

   - `docs/react-markdown-migration.md`
   - `docs/react-markdown-migration-phase2.md`
   - `docs/react-markdown-migration-test-cases.md`

2. **更新文檔**
   - 更新 README 中的相關說明
   - 更新 CLAUDE.md 中的架構描述

## ⚠️ 風險和注意事項

### ✅ **React 版本相容性確認**

1. **Streamdown peerDependencies:**
   - **支援 React ^18.0.0 || ^19.0.0**
   - **目前專案使用 React ^18.0.0 - 完全相容！**
   - **不需要升級 React 版本**

### 潛在問題

1. **渲染差異**

   - 輸出的 HTML 結構可能不同
   - CSS 樣式需要調整
   - **語法突出顯示系統轉換**：
     - 目前：highlight.js
     - Streamdown：Shiki（不同的 CSS 類別和主題系統）

2. **自訂功能移植**

   - defaultLinkTarget 功能需透過 components.a 重新實作
   - 主題顏色整合需要適配到 shikiTheme
   - 現有的 CSS 模組（.hljs 類別）需要更新

3. **測試覆蓋**
   - 需要確保所有邊緣案例都被測試到
   - 驗證在不同 React 版本下的相容性（18.x 和 19.x）

### 回滾計畫

- 保留原本的實作在分支中
- 如果遇到無法解決的問題，可以快速回滾

## 🎯 成功指標

1. **功能完整性**

   - 所有現有功能都能正常運作
   - 渲染結果視覺上一致

2. **性能改善**

   - Bundle 大小減少
   - 渲染性能提升

3. **程式碼簡化**

   - 移除複雜的 token 解析邏輯
   - 減少程式碼行數和維護負擔

4. **測試覆蓋**
   - 所有測試通過
   - 新功能有適當的測試覆蓋

## 🚀 開始遷移

✅ **好消息：不需要升級 React！**

### 執行順序：

```bash
# 1. 建立功能分支
git checkout -b feature/migrate-to-streamdown

# 2. 直接開始遷移 (React 18 完全相容)
cd packages/react
npm uninstall react-markdown remark-gfm remark-math rehype-highlight rehype-katex katex highlight.js
npm install streamdown
npm test  # 確保所有測試通過
```

## 📝 結論

基於 context7 的深入分析，此遷移計畫**技術上可行**，但有以下重要考慮：

### ✅ 正面因素：

- **Streamdown 支援所有 react-markdown props** - 遷移難度大幅降低
- 支援所有關鍵功能（GFM、數學、語法突出、Mermaid）
- API 更簡潔，維護成本更低
- 專為 AI 流式內容優化
- 預期顯著減少 bundle 大小（約 90KB+）
- 默認包含常用插件（remarkGfm, remarkMath, rehypeKatex）

### ⚠️ 挑戰：

1. 語法突出顯示系統轉換（highlight.js → Shiki）
2. 少數自訂功能需要調整（如 defaultLinkTarget）
3. CSS 樣式需要從 .hljs 遷移到 Shiki 系統

### 🎯 建議：

**遷移複雜度：中低**

- React 18 完全相容，無需版本升級
- 支援所有 react-markdown props 使遷移更平滑
- 對 SDK 使用者零影響
- 主要工作集中在樣式系統轉換

---

_此文檔更新於 2025-09-25，基於 context7 驗證後的完整 react-markdown 到 streamdown 遷移計畫。_
