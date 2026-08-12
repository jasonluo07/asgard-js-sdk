import { ReactNode, useState } from 'react';
import {
  ConversationMessage,
  ConversationToolCallMessage,
  ConversationThinkingMessage,
  EventType,
} from '@asgard-js/core';
import { Chatbot, Locale } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './tool-call-grouping.module.scss';

// F-006 — grouping + dynamic group summary. Two tool-call groups split by an interleaved thinking block:
//  - group 1: Bash + Read + Write + Edit + Skill → "5 steps · Used 1 skills · Processed 3 files"
//  - group 2: WebFetch + WebSearch → "2 steps" (skills / files segments hidden, s=0 / f=0)
// The thinking block between them breaks the group and keeps the thinking×tool-call timeline order.
// Both groups share one processId, as a real run does — group identity comes from the leading tool
// call's messageId, so splitting a run into several groups needs no distinct processIds.
const PROCESS_ID = 'grp';

function toolCall(seq: number, toolName: string, parameter: Record<string, unknown>): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `${PROCESS_ID}-${seq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: PROCESS_ID,
    callSeq: seq,
    toolName,
    reason: '',
    toolsetName: '',
    parameter,
    result: { output: 'ok' },
    isComplete: true,
    time: new Date(),
  };
}

const THINKING: ConversationThinkingMessage = {
  type: 'thinking',
  messageId: 'grp-think',
  text: '檔案都處理完了，接著需要查一下外部資料再決定下一步。',
  isThinking: false,
  time: new Date(),
};

const CALLS: ConversationMessage[] = [
  // Group 1 — n=5, s=1 (Skill), f=3 (Read/Write/Edit)
  toolCall(1, 'Bash', { command: 'ls', description: '列出檔案' }),
  toolCall(2, 'Read', { file_path: '/app/src/index.ts' }),
  toolCall(3, 'Write', { file_path: '/app/src/new.ts', content: 'x' }),
  toolCall(4, 'Edit', { file_path: '/app/src/app.tsx', old_string: 'a', new_string: 'b' }),
  toolCall(5, 'Skill', { skill: 'local-plugin:shortage-calc' }),
  // interleaved thinking → breaks the group
  THINKING,
  // Group 2 — n=2, s=0, f=0
  toolCall(6, 'WebFetch', { url: 'https://docs.asgard-ai.com/guide' }),
  toolCall(7, 'WebSearch', { query: 'RxJS retry backoff' }),
];

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en-US', label: 'en-US' },
  { value: 'ja-JP', label: 'ja-JP' },
  { value: 'zh-TW', label: 'zh-TW' },
];

const config = { botProviderEndpoint: 'skip' };

export function ToolCallGrouping(): ReactNode {
  const [locale, setLocale] = useState<Locale>('en-US');

  return (
    <DemoWrapper
      title="Tool-Call Grouping + Group Summary (F-006)"
      description="兩組 tool-call 被中間的 thinking block 斷開。每組上方是動態 summary「{n} steps · Used {s} skills · Processed {f} files」（localized，s/f=0 時該段隱藏），取代舊的靜態「Answer preparation steps」。group 1 = 5 steps · 1 skill · 3 files；group 2 = 2 steps（無 skill/file 段）。切 locale 看三語。"
    >
      <div className={styles.controls}>
        <div className={styles.controls__title}>locale</div>
        {LOCALES.map(l => (
          <button
            key={l.value}
            type="button"
            className={locale === l.value ? `${styles.button} ${styles['button--active']}` : styles.button}
            onClick={() => setLocale(l.value)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          title="Grouping Demo"
          config={config}
          customChannelId="tool-call-grouping-demo"
          locale={locale}
          initMessages={CALLS}
        />
      </div>
    </DemoWrapper>
  );
}
