import { Fragment, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ConversationMessage,
  ConversationToolCallMessage,
  deriveSubagents,
  deriveTasks,
  isAgentTool,
  isSubagentChildTool,
  isTaskTool,
} from '@asgard-js/core';
import { useAsgardContext } from '../../../context/asgard-service-context';
import styles from './chatbot-body.module.scss';
import { ConversationMessageRenderer } from './conversation-message-renderer';
import {
  ToolCallGroupTemplate,
  ToolCallItemData,
  ToolCallStatus,
  synthesizeToolCallLabel,
  getToolCallVariant,
  groupSummary,
  toolDiff,
} from '../../templates';
import { DEFAULT_CONTENT_MAX_WIDTH, useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { Locale } from '../../../i18n';
import clsx from 'clsx';
import { useResizeObserver } from '../../../hooks';
import { SubagentList } from '../subagent-list';
import { TaskList } from '../task-list';

// Helper type for grouped messages
type MessageGroup =
  | { type: 'message'; message: ConversationMessage }
  | { type: 'tool-call-group'; toolCalls: ConversationToolCallMessage[] };

// Group consecutive tool-call messages together
function groupMessages(messages: ConversationMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentToolCallGroup: ConversationToolCallMessage[] = [];

  for (const message of messages) {
    // Subagent lifecycle events are run-level chrome shown only in the docked SubagentList (F-012),
    // never in the thread.
    if (message.type === 'subagent') {
      continue;
    }

    // Route run-level chrome out of the main tool-call group: task tools go to the TaskList (F-010);
    // the `Agent` spawn marker and every subagent child tool go to the SubagentList (F-012). The main
    // group keeps only `parentToolUseId === "" && toolName ∉ {Agent, TaskCreate, TaskUpdate}`.
    if (
      message.type === 'tool-call' &&
      (isTaskTool(message) || isAgentTool(message) || isSubagentChildTool(message.parentToolUseId))
    ) {
      continue;
    }

    if (message.type === 'tool-call') {
      currentToolCallGroup.push(message);
    } else {
      // Flush any pending tool-call group
      if (currentToolCallGroup.length > 0) {
        groups.push({ type: 'tool-call-group', toolCalls: currentToolCallGroup });
        currentToolCallGroup = [];
      }

      groups.push({ type: 'message', message });
    }
  }

  // Flush remaining tool-call group
  if (currentToolCallGroup.length > 0) {
    groups.push({ type: 'tool-call-group', toolCalls: currentToolCallGroup });
  }

  return groups;
}

// Convert tool-call message to ToolCallItemData
function toolCallToItemData(toolCall: ConversationToolCallMessage, locale: Locale): ToolCallItemData {
  let status: ToolCallStatus = 'pending';
  if (toolCall.isCancelled) {
    // F-020 AC10 — a stop-generation force-settled this call before its terminal frame; show it as
    // cancelled rather than a success `completed` or a lingering `pending` spinner.
    status = 'cancelled';
  } else if (toolCall.isComplete) {
    // F-009 — drive the error status from the backend `isError` flag (covers native / platform /
    // general uniformly); keep the legacy `result.error` heuristic as a fallback for old data.
    status = toolCall.isError || toolCall.result?.error ? 'error' : 'completed';
  }

  return {
    id: toolCall.messageId,
    // F-004 — priority reason → synthesize (native) → toolName; F-005 — synthesis localized by `locale`.
    label: synthesizeToolCallLabel(toolCall, locale),
    variant: getToolCallVariant(toolCall),
    // F-007 — right-side `+/-` line diff for Write / Edit.
    diff: toolDiff(toolCall),
    status,
    initial: {
      toolsetName: toolCall.toolsetName,
      toolName: toolCall.toolName,
      parameter: toolCall.parameter,
    },
    result: toolCall.result,
  };
}

/** 判斷「是否在底部」的閾值 */
const BOTTOM_THRESHOLD = 50;

/**
 * @param hideRunChrome When true, the built-in docked strip below is not rendered — the consumer takes
 *   over placing and styling the run-chrome, deriving it from the same `conversation` with
 *   `deriveTasks` / `deriveSubagents`.
 */
export function ChatbotBody({ hideRunChrome = false }: { hideRunChrome?: boolean } = {}): ReactNode {
  const { chatbot } = useAsgardThemeContext();
  const { renderToolCallGroup, locale = 'en-US' } = useAsgardTemplateContext();

  const {
    messages,
    conversation,
    messageBoxBottomRef,
    scrollContainerRef,
    isFollowingLatest,
    setFollowingLatest,
    scrollToBottom,
    programmaticScrollToBottom,
  } = useAsgardContext();

  const lastMessageCountRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef<boolean>(false);

  // 初次有 messages 時，在 browser paint 之前同步把 chat 滾到底，避免：
  // 1. 看到「先頂部 → 然後跳/滾到底」的閃爍
  // 2. ResizeObserver + 'smooth' scroll 的 race condition — smooth 動畫期間
  //    fire 的 'scroll' events 會被下方 handleScroll 誤判為使用者滾走，把
  //    isFollowingLatest 設成 false，後續 async 內容（例如圖片載入）造成的
  //    layout 增高就不再被追，scroll 停在半路。
  // useLayoutEffect 在 commit DOM 之後、瀏覽器 paint 之前同步執行；
  // 此時 scroll 事件監聽器（下方 useEffect）尚未掛上，所以直接設 scrollTop
  // 不會觸發 handleScroll，也就不會錯誤更新 isFollowingLatest。
  useLayoutEffect(() => {
    if (didInitialScrollRef.current) return;

    if (!messages || messages.size === 0) return;

    const container = scrollContainerRef.current;

    if (!container) return;

    container.scrollTop = container.scrollHeight;
    didInitialScrollRef.current = true;
  }, [messages, scrollContainerRef]);

  // 監聽滾動事件，根據距離底部的距離判斷是否跟隨
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    function handleScroll(): void {
      if (!scrollContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // 距離底部 <= 50px → 跟隨，> 50px → 不跟隨
      setFollowingLatest(distanceFromBottom <= BOTTOM_THRESHOLD);
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return (): void => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef, setFollowingLatest]);

  // 當使用者發送新訊息時，強制滾動到底部並恢復跟隨
  useEffect(() => {
    const currentMessageCount = messages?.size ?? 0;
    const hasNewMessage = currentMessageCount > lastMessageCountRef.current;

    lastMessageCountRef.current = currentMessageCount;

    if (hasNewMessage && messages && messages.size > 0) {
      const messagesArray = Array.from(messages.values());
      const lastMessage = messagesArray[messagesArray.length - 1];

      if (lastMessage?.type === 'user') {
        scrollToBottom('smooth');
      }
    }
  }, [messages, scrollToBottom]);

  // 監聽內容區域高度變化來自動滾動（DOM-based）
  // 這比監聽 React 狀態更可靠，因為直接響應實際的 DOM 變化
  const onContentResize = useCallback(() => {
    if (!isFollowingLatest) return;

    programmaticScrollToBottom('smooth');
  }, [isFollowingLatest, programmaticScrollToBottom]);

  useResizeObserver({ ref: contentRef, onResize: onContentResize });

  // F-010 / F-012 — the Task / Subagent live-state panels, derived from the conversation store. They
  // render in a fixed strip below the scroll box (see the JSX), pinned above the thread↔composer seam.
  const tasks = useMemo(() => (conversation ? deriveTasks(conversation) : []), [conversation]);
  const subagents = useMemo(() => (conversation ? deriveSubagents(conversation) : []), [conversation]);

  const contentStyles = useMemo(
    () => ({
      maxWidth: chatbot?.contentMaxWidth ?? DEFAULT_CONTENT_MAX_WIDTH,
    }),
    [chatbot],
  );

  // BUG-003 `R9` capped the docked strip at 50% of the body and let it scroll itself, which keeps a long
  // checklist from starving the thread — but leaves nothing on screen saying "there is more below". The
  // strip's own 12px bottom padding scrolls away with the content, and overlay scrollbars (the macOS
  // default) are invisible at rest, so a row clipped at the strip's edge reads as occluded by the composer
  // rather than scrollable. Track whether anything is still below the fold so the wrapper can fade its
  // bottom edge; the fade goes away as soon as the strip is scrolled to the end.
  const dockedRef = useRef<HTMLDivElement>(null);
  const [isDockedOverflowing, setDockedOverflowing] = useState<boolean>(false);
  const hasDockedStrip = !hideRunChrome && (subagents.length > 0 || tasks.length > 0);

  useEffect(() => {
    const strip = dockedRef.current;

    if (!strip) {
      setDockedOverflowing(false);

      return;
    }

    const sync = (): void => {
      setDockedOverflowing(strip.scrollHeight - strip.scrollTop - strip.clientHeight > 1);
    };

    sync();
    strip.addEventListener('scroll', sync, { passive: true });

    // The panels grow and collapse *inside* the strip without resizing its own box (it is already at the
    // cap), so watch the content element too — the strip alone would report no change.
    const observer = new ResizeObserver(sync);

    observer.observe(strip);

    if (strip.firstElementChild) observer.observe(strip.firstElementChild);

    return (): void => {
      strip.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [hasDockedStrip, subagents.length, tasks.length]);

  // Grouped once per render so each tool-call group can tell whether later content has sealed it
  // (anything after it → the assistant moved on → the finished group may auto-collapse).
  const messageGroups = groupMessages(Array.from(messages?.values() ?? []));

  return (
    <div className={styles.chatbot_body_wrapper} data-docked-overflow={isDockedOverflowing || undefined}>
      <div
        ref={scrollContainerRef}
        className={clsx('asgard-chatbot-body', styles.chatbot_body)}
        style={chatbot?.body?.style}
        data-scrollable="true"
      >
        <div ref={contentRef} className={styles.chatbot_body__content} style={contentStyles}>
          {messageGroups.map((group, index) => {
            if (group.type === 'tool-call-group') {
              const items = group.toolCalls.map(tc => toolCallToItemData(tc, locale));
              const firstToolCall = group.toolCalls[0];
              // Key off the leading tool call's messageId (`${processId}-${callSeq}`), not processId:
              // one run emits a fresh group every time text/thinking interleaves between tool calls, so
              // every group in that run shares the same processId and the keys collide.
              const key = `tool-call-group-${firstToolCall?.messageId || index}`;
              // F-006 — dynamic localized group summary, replacing the static 'Answer preparation steps'.
              const summary = groupSummary(group.toolCalls, locale);
              // Sealed once any later group/message follows → the assistant has moved on, so the group may
              // auto-collapse. While it is the last group (still being built) it stays open — no per-tool flicker.
              const sealed = index < messageGroups.length - 1;

              const renderDefaultContent = (overrides?: { title?: string }): ReactNode => (
                <ToolCallGroupTemplate
                  items={items}
                  time={firstToolCall?.time}
                  title={overrides?.title ?? summary}
                  sealed={sealed}
                  locale={locale}
                />
              );

              if (renderToolCallGroup) {
                const custom = renderToolCallGroup({
                  items,
                  time: firstToolCall?.time,
                  renderDefaultContent,
                });
                if (custom === null) return null;

                return <Fragment key={key}>{custom}</Fragment>;
              }

              return <Fragment key={key}>{renderDefaultContent()}</Fragment>;
            }

            return (
              <ConversationMessageRenderer
                key={group.message.messageId || `${group.message.type}-${index}-${group.message.time.getTime()}`}
                message={group.message}
              />
            );
          })}
        </div>
        {/* Scroll sentinel — kept outside the padded/gapped content so it adds no trailing space
            (video/audio templates scrollIntoView it to reach the bottom). */}
        <div ref={messageBoxBottomRef} />
      </div>
      {/* Subagent (F-012) + Task (F-010) live-state panels, docked in a fixed strip *outside* the scroll
          box above — between the thread and the composer, pinned above the seam, exactly where both
          features' AC place them. BUG-003: they used to sit at the tail of the scroll flow, so every
          streamed chunk (thread growth + auto-scroll follow) shoved them around; out here they neither
          scroll nor feed the thread's auto-scroll ResizeObserver. Rendered only when populated, so an
          empty strip never adds a gap and a lone last message keeps its clearance to the footer. */}
      {hasDockedStrip && (
        // `data-scrollable` — the strip scrolls itself once it hits its 50% cap, and ChatbotContainer's
        // wheel/touch handler preventDefaults on anything without this marker.
        <div ref={dockedRef} className={styles.chatbot_body__docked} data-scrollable="true">
          <div className={styles.chatbot_body__docked_content} style={contentStyles}>
            <SubagentList subagents={subagents} locale={locale} />
            <TaskList tasks={tasks} locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
