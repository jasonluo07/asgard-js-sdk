import { ReactNode, useState } from 'react';
import { ConversationMessage, ConversationToolCallMessage, EventType } from '@asgard-js/core';
import { Chatbot, Locale } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './tool-call-i18n.module.scss';

// F-005 — a scoped scenario with a locale switcher. The same tool-calls (via initMessages) re-render
// their synthesized labels in the selected language; Bash's `description` stays as-is in every locale.
function toolCall(callSeq: number, toolName: string, parameter: Record<string, unknown>): ConversationToolCallMessage {
  return {
    type: 'tool-call',
    messageId: `i18n-proc-${callSeq}`,
    eventType: EventType.TOOL_CALL_COMPLETE,
    processId: 'i18n-proc',
    callSeq,
    toolName,
    reason: '',
    toolsetName: '',
    parameter,
    result: { output: 'ok' },
    isComplete: true,
  };
}

const CALLS: ConversationMessage[] = [
  toolCall(1, 'Bash', { command: 'npm run build', description: '建置整個專案（Bash 的 description，不該被翻譯）' }),
  toolCall(2, 'Read', { file_path: '/Users/dev/app/src/index.ts' }),
  toolCall(3, 'Write', { file_path: '/Users/dev/app/src/new-file.ts', content: 'x' }),
  toolCall(4, 'Edit', { file_path: '/Users/dev/app/src/app.tsx', old_string: 'a', new_string: 'b' }),
  toolCall(5, 'Skill', { skill: 'local-plugin:shortage-calc' }),
  toolCall(6, 'WebFetch', { url: 'https://docs.asgard-ai.com/guide' }),
  toolCall(7, 'WebSearch', { query: 'RxJS retry backoff' }),
];

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en-US', label: 'English (en-US)' },
  { value: 'ja-JP', label: '日本語 (ja-JP)' },
  { value: 'zh-TW', label: '繁體中文 (zh-TW)' },
];

const config = { botProviderEndpoint: 'skip' };

export function ToolCallI18n(): ReactNode {
  const [locale, setLocale] = useState<Locale>('en-US');

  return (
    <DemoWrapper
      title="Tool-Call i18n Locale (F-005)"
      description="切換 locale，同一組 tool-call 的合成 label 會即時換語言（Read→讀取／読み込み…）。Bash 的第一列（用 description）在任何語言都不變 —— description 是 agent 當下寫的自然語言，不經 i18n。"
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
        <div className={styles.controls__hint}>目前：{locale}</div>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          title="Tool-Call i18n Demo"
          config={config}
          customChannelId="tool-call-i18n-demo"
          locale={locale}
          initMessages={CALLS}
        />
      </div>
    </DemoWrapper>
  );
}
