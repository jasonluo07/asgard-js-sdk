# 全螢幕 Modal 的頁面滾動鎖定

## 問題

當 Chatbot 在手機上開啟全螢幕模式時，背景頁面仍可以滾動，影響用戶體驗。

## 錯誤解法

直接操作 `document.body.style.overflow = 'hidden'`：

```tsx
// ❌ 不建議的做法
useEffect(() => {
  if (isFullscreen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, [isFullscreen]);
```

**問題**：
- 頁面會跳動（scrollbar 突然消失）
- position:fixed 元素位置錯誤
- 觸控事件仍可能觸發滾動

## 正確解法

使用 `react-remove-scroll` 套件：

```bash
npm install react-remove-scroll
```

```tsx
import { RemoveScroll } from 'react-remove-scroll';

// ✅ 正確的做法
{isOpen && customChannelId && (
  <RemoveScroll enabled={isMobile && isOpen}>
    <div className={isMobile ? "" : "absolute bottom-16 right-0"}>
      <Chatbot
        fullScreen={isMobile}
        // ... 其他 props
      />
    </div>
  </RemoveScroll>
)}
```

**優勢**：
- 自動補償 scrollbar 寬度
- 正確處理 position:fixed 元素
- 支援觸控裝置
- React 友善的實作

## 原理

RemoveScroll 透過以下機制實現滾動鎖定：

1. **事件捕獲**：攔截外部滾動事件
2. **CSS 控制**：智慧調整樣式與補償
3. **滾動隔離**：只允許包裝元素內滾動