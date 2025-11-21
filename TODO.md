# TODO - Asgard JS SDK

## 🔴 Critical: 虛擬鍵盤顯示時的佈局閃爍問題

### 問題描述

當使用者在行動裝置上點擊輸入框時，虛擬鍵盤彈出會導致 Chatbot 容器出現明顯的佈局錯位與閃爍現象。

### 問題重現步驟

1. 在 iOS Safari 或 Android Chrome 上開啟全螢幕 Chatbot
2. 點擊輸入框以喚起虛擬鍵盤
3. 觀察畫面變化

### 實際行為（Bug）

**階段 1 - 鍵盤彈出瞬間 (0-100ms)**
- ⚠️ Chatbot 容器開始被向上推移
- ⚠️ 視窗高度開始縮小

**階段 2 - 鍵盤完全顯示 (100-300ms)**
- ❌ **整個 Chatbot 被推出可視範圍**
- ❌ 頂部內容（標題欄、聊天記錄）幾乎完全消失在螢幕上方
- ❌ 只能看到一小部分或完全看不到聊天內容
- ❌ 輸入框位置正確，但容器高度計算錯誤

**階段 3 - 延遲修正 (~1000ms 後)**
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

根據 2025 年的網路查證，這是一個已知的**瀏覽器 Viewport 處理時序問題**：

#### 1. **iOS Safari 的特殊行為**
- 📱 **Layout Viewport 不變**：Safari 在鍵盤顯示時不會改變 Layout Viewport 的大小
- 👁️ **Visual Viewport 縮小**：只有 Visual Viewport 會縮小以適應鍵盤
- 🔕 **不觸發 window resize**：由於 `window.innerHeight` 不變，`window.resize` 事件不會觸發
- ⏱️ **已知延遲 Bug**：Safari 的 `visualViewport.resize` 事件會延遲約 1 frame

參考：
- [Fixing iOS Safari Viewport Shift Issues (2025)](https://blog.ni18.in/fixing-ios-safari-viewport-shift-issues/)
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
  setTimeout(updateViewportSize, 1000);  // ⚠️ 問題：1000ms 太長
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
    isOnScreenKeyboardOpen ? { height } : {}  // ⚠️ height 值可能不準確
  );
}, [height, isOnScreenKeyboardOpen, theme]);
```

- ❌ **條件式設定高度**：只在 `isOnScreenKeyboardOpen` 為 true 時才設定高度
- ❌ **初始狀態錯誤**：鍵盤彈出瞬間，`height` 可能還是舊值

**檔案：`packages/react/src/components/chatbot/chatbot-container/chatbot-container.module.scss`**

```scss
&.screen_keyboard_open {
  padding: env(safe-area-inset-top) env(safe-area-inset-right) 0
    env(safe-area-inset-left);
}
```

- ⚠️ **workaround 正確但不足**：移除 `padding-bottom` 是正確的做法
- ❌ **無法解決高度問題**：只解決了 padding，沒有解決容器高度計算錯誤

---

## 解決方案探索

根據 2025 年的最佳實踐，有以下幾種方案：

### 選項 1：使用 CSS Dynamic Viewport Height (dvh) ⭐ 推薦
**優點：**
- ✅ 純 CSS 解決方案，無需 JavaScript
- ✅ 自動適應 Visual Viewport 變化
- ✅ 無延遲、無閃爍
- ✅ 瀏覽器原生支援（Chrome 108+, Safari 15.4+）

**實作：**
```scss
.full_screen {
  height: 100dvh; // 取代 calc(var(--vh, 1vh) * 100)
}
```

**缺點：**
- ⚠️ 需要測試舊版瀏覽器相容性
- ⚠️ 可能需要保留 fallback

參考：[Fix mobile keyboard overlap with dvh](https://www.franciscomoretti.com/blog/fix-mobile-keyboard-overlap-with-visualviewport)

### 選項 2：優化 visualViewport 監聽機制
**優點：**
- ✅ 更精確的時序控制
- ✅ 可同時處理高度和 padding

**實作要點：**
1. 使用 `requestAnimationFrame` 避免多次重複觸發
2. 縮短延遲時間從 1000ms 改為 100-200ms（或移除延遲）
3. 監聽 `visualViewport.resize` 並立即更新 React 狀態

```typescript
useEffect(() => {
  let rafId: number;

  function handleResize(): void {
    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      setViewportSize([window.innerWidth, height]);
    });
  }

  window.visualViewport?.addEventListener('resize', handleResize);
  return () => {
    window.visualViewport?.removeEventListener('resize', handleResize);
    if (rafId) cancelAnimationFrame(rafId);
  };
}, []);
```

參考：[Dealing with the Visual Viewport](https://rdavis.io/articles/dealing-with-the-visual-viewport)

### 選項 3：使用 VirtualKeyboard API
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

### 選項 4：viewport meta tag 設定
**實作：**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">
```

**缺點：**
- ❌ **iOS Safari 不支援 `interactive-widget`**（截至 2024-2025）
- ✅ Chrome 和 Firefox 有效

---

## 建議的修復方案

### 🎯 階段 1：快速修復（最小變動）
1. **縮短延遲時間**
   - 將 `use-viewport-size.ts` 的 `setTimeout` 從 1000ms 改為 100-200ms
   - 或改用 `requestAnimationFrame`

2. **測試驗證**
   - iOS Safari (最新版 + iOS 18 beta)
   - Android Chrome
   - 各種裝置尺寸

### 🎯 階段 2：根本解決（推薦）
1. **採用 dvh 單位**
   - 在 `chatbot-container.module.scss` 使用 `100dvh`
   - 保留 fallback 以支援舊瀏覽器

2. **優化 viewport 監聽**
   - 使用 `requestAnimationFrame` 避免重複計算
   - 只監聽 `visualViewport.resize`（移除 `window.resize`）

3. **移除不必要的延遲**
   - 檢查是否仍需要 `effectTwice` 的雙次更新機制

### 🎯 階段 3：長期優化
1. **考慮 VirtualKeyboard API**
   - 為支援的瀏覽器提供更好的體驗
   - 漸進增強策略

2. **添加單元測試**
   - 模擬 viewport resize 事件
   - 測試不同時序下的狀態更新

---

## 影響範圍

**檔案：**
- ✏️ `packages/react/src/hooks/use-viewport-size.ts` - 需要修改
- ✏️ `packages/react/src/components/chatbot/chatbot-container/chatbot-container.module.scss` - 可選修改
- ✏️ `packages/react/src/components/chatbot/chatbot-container/chatbot-full-screen-container.tsx` - 可能需要調整

**測試重點：**
- 📱 iOS Safari (14+)
- 📱 iOS Safari iOS 18 beta
- 📱 Android Chrome (latest)
- 📱 不同螢幕尺寸 (iPhone SE ~ iPad)
- ⌨️ 虛擬鍵盤開啟/關閉流暢度
- ⌨️ 快速連續操作的穩定性

---

## 參考資料

### 官方文檔
- [Visual Viewport API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [VirtualKeyboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)
- [CSS env() - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/env)

### 技術文章 (2025)
- [Fixing iOS Safari Viewport Shift Issues](https://blog.ni18.in/fixing-ios-safari-viewport-shift-issues/)
- [Fix mobile keyboard overlap with dvh](https://www.franciscomoretti.com/blog/fix-mobile-keyboard-overlap-with-visualviewport)
- [Dealing with the Visual Viewport](https://rdavis.io/articles/dealing-with-the-visual-viewport)
- [Safe-area-inset-bottom does not update for keyboard](https://webventures.rejh.nl/blog/2025/safe-area-inset-bottom-does-not-update/)

### GitHub Issues
- [Difficult to react to changes in visualViewport](https://github.com/WICG/visual-viewport/issues/44)
- [Stack Overflow: React visualViewport useEffect](https://stackoverflow.com/questions/72658864/window-visualviewport-height-doenst-update-useeffect-when-a-dependency)

---

## 優先級

- **Priority:** 🔴 Critical
- **Severity:** High - 嚴重影響行動裝置使用者體驗
- **Effort:** Medium - 需要仔細測試多種裝置和瀏覽器
- **Risk:** Low-Medium - 變更核心佈局邏輯，需充分測試

---

**建立日期：** 2025-01-21
**最後更新：** 2025-01-21
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

export function useIsAtBottom(
  ref: RefObject<HTMLElement>,
  threshold = 50
): boolean {
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

  return <div ref={bodyRef} className={styles.chatbot_body}>...</div>;
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
