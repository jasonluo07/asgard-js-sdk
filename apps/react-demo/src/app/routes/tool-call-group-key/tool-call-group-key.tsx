import { ReactNode } from 'react';
import {
  ConversationMessage,
  ConversationToolCallMessage,
  ConversationThinkingMessage,
  EventType,
} from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './tool-call-group-key.module.scss';

// Regression fixture for the tool-call group key.
//
// A run emits ONE processId. Interleave text or thinking between tool calls and groupMessages
// flushes a group and starts another, so a single run routinely renders several thread groups that
// all carry that same processId — exactly what the agent-hub backend produces. Keying the group on
// processId therefore hands React duplicate keys.
//
// This fixture pins that shape: both groups share `run-1`, split by a thinking block.
//
// Expected: no "Encountered two children with the same key" warning in the console, and both groups
// render with their own summary.
const PROCESS_ID = 'run-1';

function toolCall(callSeq: number, toolName: string, parameter: Record<string, unknown>): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    // messageId mirrors the core contract: `${processId}-${callSeq}`.
    messageId: `${PROCESS_ID}-${callSeq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: PROCESS_ID,
    callSeq,
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
  messageId: `${PROCESS_ID}-think`,
  text: '短缺量算出來了，接著查一下在途採購單再決定要不要改替代料號。',
  isThinking: false,
  time: new Date(),
};

const MESSAGES: ConversationMessage[] = [
  // Group 1 — same run
  toolCall(1, 'Bash', { command: 'shortage-calc', description: '計算線材短缺量' }),
  toolCall(2, 'Read', { file_path: '/app/data/inventory.csv' }),
  // interleaved thinking → flushes group 1, group 2 starts (still the same processId)
  THINKING,
  // Group 2 — same run, same processId → collides when the key is derived from processId
  toolCall(3, 'WebFetch', { url: 'https://erp.internal/purchase-orders' }),
  toolCall(4, 'WebSearch', { query: 'SWRCH38K 替代料號 前置天數' }),
];

const config = { botProviderEndpoint: 'skip' };

export function ToolCallGroupKey(): ReactNode {
  return (
    <DemoWrapper
      title="Tool-Call Group Key — same processId across groups"
      description="同一個 run（processId `run-1`）產生兩組 thread tool-call group，中間被 thinking block 斷開 —— 這正是真實後端的形狀。group key 若取自 processId，兩組就會撞 key，console 會噴 'Encountered two children with the same key, tool-call-group-run-1'。取自開頭那筆 tool call 的 messageId（`${processId}-${callSeq}`）則每組唯一。開 DevTools console 檢查是否乾淨。"
    >
      <div className={styles.chatbotContainer}>
        <Chatbot
          title="Group Key Regression"
          config={config}
          customChannelId="tool-call-group-key-demo"
          initMessages={MESSAGES}
        />
      </div>
    </DemoWrapper>
  );
}
