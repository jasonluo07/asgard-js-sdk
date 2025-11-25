# TODO - Asgard JS SDK

## 🔴 Critical: 虛擬鍵盤顯示時的佈局閃爍問題

### 問題描述

當使用者在行動裝置上點擊輸入框時，虛擬鍵盤彈出會導致 Chatbot 容器出現明顯的佈局錯位與閃爍現象。

### 問題重現步驟

1. 在 **iOS Chrome** 上開啟全螢幕 Chatbot
2. 點擊輸入框以喚起虛擬鍵盤
3. 觀察畫面變化

**測試環境**：

- 裝置：iPhone 12
- 系統：iOS 26
- 瀏覽器：Chrome for iOS
- 重現率：100%（每次點擊輸入框都會發生）

### 實際行為（Bug）

**點擊輸入框的瞬間**：

- ❌ **整個 Chatbot 容器向上跳動**
- ❌ 容器被推出可視範圍
- ❌ 頂部內容（標題欄、聊天記錄）瞬間消失

**延遲修正（~1000ms 後）**：

- ✅ Chatbot 自動「掉下來」回到正確位置
- ✅ 標題欄和內容重新可見
- ⏱️ **有明顯的 1 秒延遲**，使用者體驗極差

### 預期行為

- ✅ 鍵盤彈出時，輸入框應被推到鍵盤上方
- ✅ Chatbot 容器高度應**立即且平滑地**調整為 `visualViewport.height`
- ✅ 頂部內容應始終保持可見
- ✅ **無閃爍、無延遲、無跳動**

---

## 技術分析

### 根本原因

根據 2025 年的網路查證，這是一個已知的 **iOS `position: fixed` 與虛擬鍵盤衝突問題**：

#### 1. **iOS Chrome/Safari 的 `position: fixed` 問題**

**核心問題**：

- 📱 iOS 在虛擬鍵盤彈出時會**重新計算 `position: fixed` 元素的位置**
- 🔄 Safari 不會將 `position: fixed` 元素視為固定，而是**暫時變成類似 `position: static` 的行為**
- ⚡ 重新計算發生在鍵盤彈出的**瞬間**，導致元素向上跳動
- ⏱️ 之後需要等待 viewport 穩定後才會修正回來

**iOS Chrome 與 Safari 的共同點**：

- iOS Chrome 底層使用 WebKit，與 Safari 有相同的 `position: fixed` 問題
- Chrome 108+ 已將 viewport 行為對齊 Safari（只縮小 Visual Viewport，不改變 Layout Viewport）
- 兩者在處理虛擬鍵盤時的行為已趨於一致

**為什麼會跳動**：

- iOS 不改變 Layout Viewport 大小，鍵盤只是覆蓋在頁面上方
- `position: fixed` 的底部元素實際上還在螢幕底部，但被鍵盤遮擋
- 當鍵盤彈出時，瀏覽器會**錯誤地重新定位 fixed 元素**，導致整個容器被推出螢幕

參考：

- [Is there any fix to iOS, safari and chrome fixed position for when keyboard shows up?](https://stackoverflow.com/questions/77200936/is-there-any-fix-to-ios-safari-and-chrome-fixed-position-for-when-keyboard-show)
- [Stop the iOS keyboard hiding your sticky or fixed position header](https://www.codemzy.com/blog/sticky-fixed-header-ios-keyboard-fix)
- [iOS 18 beta viewport issues](https://gist.github.com/claus/622a938d21d80f367251dc2eaaa1b2a9)

#### 2. **React 狀態更新時序問題**

- ⚛️ `isOnScreenKeyboardOpen` 狀態更新晚於瀏覽器的 viewport 變化
- 📊 `useViewportSize()` hook 的更新機制不夠即時
- 🔄 `visualViewport.height` 的變化無法直接觸發 React useEffect（需透過事件監聽器）

參考：

- [React visualViewport useEffect timing issue](https://stackoverflow.com/questions/72658864/window-visualviewport-height-doenst-update-useeffect-when-a-dependency)
- [Difficult to react to changes in visualViewport](https://github.com/WICG/visual-viewport/issues/44)

#### 3. **現有實作的問題**

**檔案：`packages/react/src/hooks/use-viewport-size.ts`**

```typescript
function effectTwice(): void {
  updateViewportSize();
  setTimeout(updateViewportSize, 1000); // ⚠️ 問題：1000ms 太長
}
```

- ❌ **延遲時間過長**：1000ms (1 秒) 導致使用者看到明顯的「過了一會兒才修正」
- ❌ **時序不準確**：第一次 `updateViewportSize()` 可能在 viewport 還在變化時執行
- ❌ **無法處理快速操作**：使用者快速開關鍵盤時可能出現狀態錯亂

**檔案：`packages/react/src/components/chatbot/chatbot-container/chatbot-full-screen-container.tsx`**

```typescript
const styles = useMemo(() => {
  return Object.assign(
    theme?.chatbot?.backgroundColor ? { backgroundColor: theme.chatbot?.backgroundColor } : {},
    isOnScreenKeyboardOpen ? { height } : {}, // ⚠️ height 值可能不準確
  );
}, [height, isOnScreenKeyboardOpen, theme]);
```

- ❌ **條件式設定高度**：只在 `isOnScreenKeyboardOpen` 為 true 時才設定高度
- ❌ **初始狀態錯誤**：鍵盤彈出瞬間，`height` 可能還是舊值

**檔案：`packages/react/src/components/chatbot/chatbot-container/chatbot-container.module.scss`**

```scss
&.screen_keyboard_open {
  padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
}
```

- ⚠️ **workaround 正確但不足**：移除 `padding-bottom` 是正確的做法
- ❌ **無法解決高度問題**：只解決了 padding，沒有解決容器高度計算錯誤

---

## 解決方案探索

根據 2025 年的最佳實踐，針對 iOS `position: fixed` 問題有以下方案：

### 選項 1：iOS 改用 `position: absolute` + 動態高度 ⭐ 最穩定

**核心策略**：在 iOS 上避免使用 `position: fixed`

**實作要點**：

1. 偵測 iOS 裝置（檢查 `navigator.userAgent`）
2. 在 iOS 上將 `.full_screen` 從 `position: fixed` 改為 `position: absolute`
3. 使用 `window.visualViewport.height` 動態計算高度
4. 監聽 `input` 元素的 `focus/blur` 事件（而非 `resize` 事件）
5. 在 `focus` 時立即更新高度，避免延遲

**優點：**

- ✅ 徹底避免 iOS `position: fixed` 的跳動問題
- ✅ `focus` 事件比 `visualViewport.resize` 更即時、更可靠
- ✅ 無需等待瀏覽器重新計算，立即響應
- ✅ 解決「向上跳動」的根本原因

**缺點：**

- ⚠️ 需要針對 iOS 特殊處理
- ⚠️ 程式碼複雜度增加
- ⚠️ 需要維護 iOS 偵測邏輯

**參考：**

- [Stop the iOS keyboard hiding your sticky or fixed position header](https://www.codemzy.com/blog/sticky-fixed-header-ios-keyboard-fix)
- [iOS fix for position fixed elements on input focus](https://dansajin.com/2012/12/07/fix-position-fixed/)

---

### 選項 2：使用 CSS Dynamic Viewport Height (dvh) + 優化事件監聽

**核心策略**：利用現代 CSS `dvh` 單位自動適應

**實作要點**：

```scss
.full_screen {
  height: calc(var(--vh, 1vh) * 100); /* fallback */
  height: 100dvh; /* 現代瀏覽器會覆蓋上一行 */
}
```

**配合 JavaScript 優化**：

1. 移除 `setTimeout(updateViewportSize, 1000)` 的 1 秒延遲
2. 改用 `requestAnimationFrame` 避免重複更新
3. 只監聽 `visualViewport.resize` 事件

**優點：**

- ✅ 程式碼改動最小
- ✅ 利用瀏覽器原生支援（Chrome 108+, Safari 15.4+）
- ✅ 無需平台偵測
- ✅ 移除延遲後響應速度更快

**缺點：**

- ⚠️ **無法解決 iOS `position: fixed` 的跳動問題**
- ⚠️ `dvh` 單位對虛擬鍵盤的支援因瀏覽器而異
- ⚠️ 可能還是會有輕微閃爍

**重要限制**：
根據 2025 年文件，`dvh` 單位**預設不考慮虛擬鍵盤**：

> "The on-screen keyboard (also known as the virtual keyboard) is not considered part of the UA UI. Therefore it does not affect the size of the viewport units."

**參考：**

- [Fix mobile keyboard overlap with dvh](https://www.franciscomoretti.com/blog/fix-mobile-keyboard-overlap-with-visualviewport)
- [Understanding dvh: The CSS Dynamic Viewport Height](https://mayank1513.medium.com/understanding-dvh-the-css-dynamic-viewport-height-9ddf70a77c6c)

---

### 選項 3：混合方案（推薦） ⭐⭐

**結合選項 1 和選項 2 的優點**：

1. **CSS 層**：使用 `dvh` + `position: fixed` 作為基礎（適用於大部分瀏覽器）
2. **JavaScript 層**：偵測到 iOS 時，動態改用 `position: absolute`
3. **事件監聽**：監聽 `input` 的 `focus/blur` 事件立即調整
4. **效能優化**：使用 `requestAnimationFrame` 避免重複更新

**實作策略**：

```typescript
// 1. 偵測 iOS
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

// 2. iOS 上改用 absolute + focus/blur 事件
if (isIOS) {
  container.style.position = 'absolute';

  inputElement.addEventListener('focus', () => {
    // 立即更新高度，無延遲
    updateHeight(window.visualViewport.height);
  });
}
```

**優點：**

- ✅ 針對 iOS 特殊處理，徹底解決跳動問題
- ✅ 其他平台使用標準 CSS，程式碼簡潔
- ✅ `focus` 事件響應即時，無閃爍
- ✅ 向下相容，舊瀏覽器有 fallback

---

### 選項 4：使用 VirtualKeyboard API

**優點：**

- ✅ 專門為虛擬鍵盤設計的 API
- ✅ 提供 `keyboard-inset-*` CSS 環境變數
- ✅ 可精確控制鍵盤行為

**實作：**

```javascript
if ('virtualKeyboard' in navigator) {
  navigator.virtualKeyboard.overlaysContent = true;
}
```

```css
.chatbot_container.screen_keyboard_open {
  padding-bottom: env(keyboard-inset-height, 0);
}
```

**缺點：**

- ❌ Chrome 94+ 才支援
- ❌ **iOS Safari 尚未支援**（截至 2025 年）

參考：[VirtualKeyboard API](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)

### 選項 5：viewport meta tag 設定

**實作：**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
```

**缺點：**

- ❌ **iOS Safari/Chrome 不支援 `interactive-widget`**（截至 2024-2025）
- ✅ 僅 Android Chrome 和 Firefox 有效

---

## 建議的修復方案

### 🎯 方案 A：先測試已完成的優化（最小變動）

**已完成的修改**：

1. ✅ 移除 `setTimeout(updateViewportSize, 1000)` 的 1 秒延遲
2. ✅ 改用 `requestAnimationFrame` 避免重複更新
3. ✅ CSS 加入 `height: 100dvh` 並保留 fallback

**測試重點**：

- 在 iOS 26 + iPhone 12 + Chrome 上測試
- 觀察點擊輸入框時是否還有向上跳動
- 觀察修正速度是否改善

**預期結果**：

- ⚡ 修正速度應該更快（從 1 秒降到幾十毫秒）
- ⚠️ 可能還是會有輕微跳動（因為 `position: fixed` 問題未解決）

---

### 🎯 方案 B：實作混合方案（推薦，徹底解決） ⭐

如果方案 A 還是有明顯跳動，則實作**選項 3：混合方案**

**實作步驟**：

1. **創建 iOS 偵測 hook**

   ```typescript
   // packages/react/src/hooks/use-is-ios.ts
   export function useIsIOS(): boolean {
     return /iPhone|iPad|iPod/.test(navigator.userAgent);
   }
   ```

2. **創建 iOS 專用的容器樣式處理**

   ```typescript
   // 在 chatbot-full-screen-container.tsx
   const isIOS = useIsIOS();

   const containerClassName = useMemo(() => {
     return clsx(
       classes.full_screen,
       isIOS && classes.full_screen_ios, // iOS 專用 class
     );
   }, [isIOS]);
   ```

3. **SCSS 加入 iOS 專用樣式**

   ```scss
   .full_screen {
     position: fixed; // 預設
     height: 100dvh;

     &.full_screen_ios {
       position: absolute; // iOS 改用 absolute
     }
   }
   ```

4. **監聽 input focus/blur 事件**
   - 在 `chatbot-input` 組件加入 `onFocus` handler
   - focus 時立即觸發 `updateViewportSize()`
   - 確保即時更新高度

**預期效果**：

- ✅ 徹底解決 iOS 的 `position: fixed` 跳動問題
- ✅ 響應速度極快（focus 事件立即觸發）
- ✅ 其他平台不受影響

---

### 🎯 方案 C：長期優化

未來可考慮：

1. **VirtualKeyboard API**（等 iOS 支援後）
2. **添加單元測試**模擬各種裝置和場景

3. **添加單元測試**
   - 模擬 viewport resize 事件
   - 測試不同時序下的狀態更新

---

## 影響範圍

### 方案 A（已完成）

- ✅ `packages/react/src/hooks/use-viewport-size.ts` - 已移除 1 秒延遲，改用 `requestAnimationFrame`
- ✅ `packages/react/src/components/chatbot/chatbot-container/chatbot-container.module.scss` - 已加入 `100dvh`

### 方案 B（若需要實作）

- ➕ `packages/react/src/hooks/use-is-ios.ts` - 新增 iOS 偵測 hook
- ✏️ `packages/react/src/components/chatbot/chatbot-container/chatbot-full-screen-container.tsx` - 加入 iOS 判斷邏輯
- ✏️ `packages/react/src/components/chatbot/chatbot-container/chatbot-container.module.scss` - 加入 iOS 專用 class
- ✏️ `packages/react/src/components/chatbot/chatbot-input/...` - 加入 focus 事件處理

---

## 測試重點

**主要測試環境**：

- 📱 **iOS 26 + iPhone 12 + Chrome** ⭐ 核心問題發生環境
- 📱 iOS Safari (14+)
- 📱 Android Chrome (latest)
- 📱 不同螢幕尺寸 (iPhone SE ~ iPad)

**測試項目**：

1. ⌨️ 點擊輸入框時是否有向上跳動
2. ⌨️ 修正速度（應該在幾十毫秒內完成）
3. ⌨️ 虛擬鍵盤開啟/關閉的流暢度
4. ⌨️ 快速連續點擊輸入框的穩定性
5. 📏 容器高度是否正確適應鍵盤

---

## 參考資料

### iOS Position Fixed 問題

- [Is there any fix to iOS, safari and chrome fixed position for when keyboard shows up?](https://stackoverflow.com/questions/77200936/is-there-any-fix-to-ios-safari-and-chrome-fixed-position-for-when-keyboard-show) ⭐ 核心討論
- [Stop the iOS keyboard hiding your sticky or fixed position header](https://www.codemzy.com/blog/sticky-fixed-header-ios-keyboard-fix)
- [iOS fix for position fixed elements on input focus](https://dansajin.com/2012/12/07/fix-position-fixed/)

### 官方文檔

- [Visual Viewport API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [VirtualKeyboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)
- [CSS env() - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/env)

### 技術文章 (2025)

- [Fix mobile keyboard overlap with dvh](https://www.franciscomoretti.com/blog/fix-mobile-keyboard-overlap-with-visualviewport)
- [Understanding dvh: The CSS Dynamic Viewport Height](https://mayank1513.medium.com/understanding-dvh-the-css-dynamic-viewport-height-9ddf70a77c6c)
- [Dealing with the Visual Viewport](https://rdavis.io/articles/dealing-with-the-visual-viewport)
- [iOS 18 beta viewport issues](https://gist.github.com/claus/622a938d21d80f367251dc2eaaa1b2a9)

### GitHub Issues

- [Difficult to react to changes in visualViewport](https://github.com/WICG/visual-viewport/issues/44)
- [Stack Overflow: React visualViewport useEffect](https://stackoverflow.com/questions/72658864/window-visualviewport-height-doenst-update-useeffect-when-a-dependency)

---

## 優先級

- **Priority:** 🔴 Critical
- **Severity:** High - 嚴重影響 iOS 使用者體驗（100% 重現率）
- **Effort:**
  - 方案 A（已完成）：Low - 已完成初步優化
  - 方案 B（若需要）：Medium - 需要加入 iOS 偵測和特殊處理
- **Risk:** Low - 變更已經過充分調查，且有 fallback 機制

---

## 當前狀態

- **方案 A**：✅ 已完成（2025-01-21）

  - 已移除 1 秒延遲
  - 已改用 `requestAnimationFrame`
  - 已加入 `100dvh` CSS
  - **待測試**：需在 iOS 26 + iPhone 12 + Chrome 上驗證效果

- **方案 B**：⏸️ 待定
  - 如果方案 A 測試後還有明顯跳動，則實作混合方案
  - 預計工時：4-6 小時

---

**建立日期：** 2025-01-21
**最後更新：** 2025-01-21（重新調查 iOS Chrome 問題）
**負責人：** TBD

---

## 🔴 Critical: AI 串流回應時無法向上滾動查看歷史訊息

### 問題描述

當 AI 正在串流回應訊息（typing 狀態）時，使用者**完全無法向上滾動**來查看先前的聊天記錄。每次嘗試向上滑動，都會立即被強制拉回到最底部，造成極差的使用者體驗。

### 問題重現步驟

1. 開啟 Chatbot 並發送一個訊息給 AI
2. 等待 AI 開始回應（串流訊息）
3. 在 AI 回應過程中，嘗試向上滾動查看歷史訊息
4. 觀察滾動行為

### 實際行為（Bug）

**當 AI 正在打字時：**

- ❌ 使用者嘗試向上滾動時，**立即被拉回底部**
- ❌ 完全無法查看歷史訊息
- ❌ 每次新的文字片段（token）到達時都會觸發強制滾動
- ❌ 滾動條被頻繁重置，造成視覺上的抖動感

**具體觸發時機：**

- 🔄 每當 `messages` 狀態更新（每個新 token 到達）
- 🔄 每當打字框內容增長（`BotTypingBox` resize）
- 🔄 兩個機制同時作用，雙重強制滾動

### 預期行為

- ✅ 當使用者**主動向上滾動**時，應停止自動滾動到底部
- ✅ 只有當使用者**已經在底部**時，新訊息到達才自動滾動
- ✅ 使用者可以自由查看歷史訊息，不受 AI 回應影響
- ✅ 提供「回到底部」按鈕，讓使用者可以快速返回最新訊息

---

## 技術分析

### 根本原因

這是一個**滾動控制邏輯缺陷**，完全忽略了使用者的滾動意圖：

#### 1. **無條件強制滾動**

**檔案：`packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx:15-17`**

```typescript
useEffect(() => {
  messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, messageBoxBottomRef]);
```

**問題：**

- ❌ **每次 `messages` 更新都滾動**：在 AI 串流時，每個 token 都會更新 `messages`
- ❌ **無條件執行**：完全沒有檢查使用者是否已經向上滾動
- ❌ **忽略使用者意圖**：即使使用者正在查看歷史訊息，也會被強制拉回

#### 2. **雙重強制滾動機制**

**檔案：`packages/react/src/components/templates/text-template/bot-typing-box.tsx:23-25`**

```typescript
const onResize = useCallback(() => {
  messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messageBoxBottomRef]);

useResizeObserver({ ref, onResize });
```

**問題：**

- ❌ **內容增長時也滾動**：打字框每次 resize 都觸發滾動
- ❌ **與第一個機制疊加**：兩個機制同時作用，強化了強制滾動
- ❌ **高頻率觸發**：在串流時可能每秒觸發數次

#### 3. **缺少的滾動狀態追蹤**

**目前程式碼缺少：**

- ❌ 沒有追蹤使用者是否在聊天底部
- ❌ 沒有追蹤使用者是否主動向上滾動
- ❌ 沒有條件判斷來決定是否應該自動滾動

---

## 解決方案探索

根據 2025 年聊天應用的最佳實踐，主要有兩種解決方案：

### 選項 1：Scroll Anchor + Intersection Observer Pattern ⭐ 推薦

這是 2025 年業界標準做法，被多個主流聊天應用採用。

**核心概念：**

- 在聊天容器底部放置一個不可見的「錨點」元素
- 使用 Intersection Observer API 追蹤錨點是否在視窗內
- **只有當錨點可見時**（代表使用者在底部），才自動滾動

**實作要點：**

1. **安裝依賴**

```bash
npm install react-intersection-observer
```

2. **創建 Scroll Anchor Component**

```typescript
// packages/react/src/components/chatbot/scroll-anchor.tsx
import { useInView } from 'react-intersection-observer';
import { useEffect, useRef } from 'react';

interface ScrollAnchorProps {
  trackVisibility?: boolean;
}

export function ScrollAnchor({ trackVisibility = true }: ScrollAnchorProps) {
  const { ref, inView } = useInView({
    trackVisibility,
    delay: 100, // 最小延遲，避免過度更新
  });

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 只有當錨點可見時才滾動
    if (inView && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [inView]);

  return <div ref={ref} style={{ height: 1 }} />;
}
```

3. **修改 ChatbotBody**

```typescript
// 移除原有的 useEffect 滾動邏輯
// 改用 ScrollAnchor 組件
<div className={styles.chatbot_body__content}>
  {messages.map(...)}
  <BotTypingPlaceholder />
  <ScrollAnchor />
</div>
```

**優點：**

- ✅ 自動檢測使用者是否在底部
- ✅ 尊重使用者的滾動意圖
- ✅ 效能優異（使用原生 API）
- ✅ 維護簡單，邏輯清晰

**缺點：**

- ⚠️ 需要額外依賴 `react-intersection-observer`
- ⚠️ 舊版瀏覽器支援度（需要 polyfill）

**參考：**

- [Intuitive Scrolling for Chatbot Message Streaming](https://tuffstuff9.hashnode.dev/intuitive-scrolling-for-chatbot-message-streaming)
- [react-intersection-observer](https://www.npmjs.com/package/react-intersection-observer)

---

### 選項 2：手動計算滾動位置

純手動實作，不依賴外部套件。

**核心概念：**

- 監聽 scroll 事件
- 手動計算 `isAtBottom = scrollTop + clientHeight >= scrollHeight - threshold`
- 只有當 `isAtBottom` 為 true 時才自動滾動

**實作要點：**

1. **創建 useIsAtBottom Hook**

```typescript
// packages/react/src/hooks/use-is-at-bottom.ts
import { useEffect, useState, RefObject } from 'react';

export function useIsAtBottom(ref: RefObject<HTMLElement>, threshold = 50): boolean {
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    function handleScroll(): void {
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      const atBottom = scrollTop + clientHeight >= scrollHeight - threshold;

      setIsAtBottom(atBottom);
    }

    // 初始檢查
    handleScroll();

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [ref, threshold]);

  return isAtBottom;
}
```

2. **修改 ChatbotBody**

```typescript
export function ChatbotBody(): ReactNode {
  const bodyRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useIsAtBottom(bodyRef);

  useEffect(() => {
    // 只有在底部時才滾動
    if (isAtBottom) {
      messageBoxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom, messageBoxBottomRef]);

  return (
    <div ref={bodyRef} className={styles.chatbot_body}>
      ...
    </div>
  );
}
```

**優點：**

- ✅ 無外部依賴
- ✅ 完全控制滾動邏輯
- ✅ 容易客製化（如 threshold）

**缺點：**

- ❌ 需要手動處理 scroll 事件（效能考量）
- ❌ 需要手動計算邊界條件
- ❌ 程式碼較複雜，維護成本高

---

### 選項 3：使用現成套件

**react-scroll-to-bottom** 或 **react-scrollable-feed**

**優點：**

- ✅ 開箱即用
- ✅ 已處理各種邊界情況

**缺點：**

- ❌ 可能過度設計（我們只需要一個功能）
- ❌ 依賴外部套件的更新維護

---

## 建議的修復方案

### 🎯 階段 1：快速修復（選項 2）

如果不想引入新依賴，可先使用**手動計算滾動位置**的方式：

1. **創建 `use-is-at-bottom.ts` hook**
2. **修改 `chatbot-body.tsx`** 添加條件判斷
3. **修改 `bot-typing-box.tsx`** 同樣添加條件判斷
4. **測試驗證**
   - 測試 AI 串流時能否向上滾動
   - 測試在底部時是否正常自動滾動
   - 測試快速傳送多條訊息的情況

**預估工時：** 2-3 小時（含測試）

---

### 🎯 階段 2：最佳解決方案（選項 1）⭐

長期來看，推薦使用 **Scroll Anchor + Intersection Observer** 方案：

1. **安裝 `react-intersection-observer`**
2. **創建 `ScrollAnchor` 組件**
3. **重構 `chatbot-body.tsx`**
   - 移除原有的 useEffect 滾動邏輯
   - 使用 ScrollAnchor 組件
4. **重構 `bot-typing-box.tsx`**
   - 移除 resize 時的滾動邏輯
5. **添加「回到底部」按鈕**（可選，增強 UX）
   - 當使用者向上滾動時顯示
   - 點擊後平滑滾動到底部
6. **測試驗證**
   - 測試各種滾動場景
   - 測試不同瀏覽器（Chrome, Safari, Firefox）
   - 測試行動裝置（iOS, Android）

**預估工時：** 4-6 小時（含測試）

---

## 影響範圍

**需要修改的檔案：**

### 必要修改

- ✏️ `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx:15-17`

  - 移除或修改無條件滾動邏輯
  - 添加條件判斷

- ✏️ `packages/react/src/components/templates/text-template/bot-typing-box.tsx:23-25`
  - 移除或修改 resize 滾動邏輯
  - 添加條件判斷

### 新增檔案（選項 1）

- ➕ `packages/react/src/components/chatbot/scroll-anchor.tsx`
  - 新增 ScrollAnchor 組件

### 新增檔案（選項 2）

- ➕ `packages/react/src/hooks/use-is-at-bottom.ts`
  - 新增 useIsAtBottom hook

### 可選增強

- ✏️ `packages/react/src/components/chatbot/chatbot-body/chatbot-body.tsx`
  - 添加「回到底部」按鈕 UI
- ✏️ `packages/react/src/components/chatbot/chatbot-body/chatbot-body.module.scss`
  - 添加按鈕樣式

---

## 測試重點

### 功能測試

- ✅ AI 串流時，使用者能否向上滾動
- ✅ 在底部時，新訊息是否自動滾動
- ✅ 快速傳送多條訊息時的行為
- ✅ 長訊息（超過一個螢幕高度）的滾動行為
- ✅ 圖片、卡片等不同模板的滾動行為

### 瀏覽器相容性

- 🌐 Chrome (latest)
- 🌐 Safari (latest)
- 🌐 Firefox (latest)
- 📱 iOS Safari (14+)
- 📱 Android Chrome (latest)

### 效能測試

- ⚡ 高頻率訊息更新時的 CPU 使用率
- ⚡ scroll 事件處理的效能
- ⚡ 記憶體洩漏檢查

---

## 參考資料

### 技術文章 (2025)

- [Intuitive Scrolling for Chatbot Message Streaming](https://tuffstuff9.hashnode.dev/intuitive-scrolling-for-chatbot-message-streaming) - 專門討論聊天機器人串流時的滾動控制
- [Streaming Chat Scroll to Bottom with React](https://davelage.com/posts/chat-scroll-react/) - React 實作範例
- [Stack Overflow: React auto scroll to bottom on a chat container](https://stackoverflow.com/questions/55118437/react-auto-scroll-to-bottom-on-a-chat-container)

### 套件文件

- [react-intersection-observer](https://www.npmjs.com/package/react-intersection-observer)
- [react-scroll-to-bottom](https://www.npmjs.com/package/react-scroll-to-bottom)
- [react-scrollable-feed](https://www.npmjs.com/package/react-scrollable-feed)

### MDN 文件

- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Element.scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)

---

## 優先級

- **Priority:** 🔴 Critical
- **Severity:** High - 嚴重影響使用者體驗，無法查看歷史訊息
- **Effort:** Medium - 需要重構滾動邏輯，但範圍明確
- **Risk:** Low - 變更範圍小，測試容易驗證
- **User Impact:** 極高 - 所有使用者在 AI 回應時都會遇到

---

**建立日期：** 2025-01-21
**最後更新：** 2025-01-21
**負責人：** TBD
