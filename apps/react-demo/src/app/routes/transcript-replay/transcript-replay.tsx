import { ReactNode, useState } from 'react';
import { AsgardServiceClient, Conversation, ConversationMessage } from '@asgard-js/core';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './transcript-replay.module.scss';

// F-014 — rejoinSse isn't wired into <Chatbot> yet (that is F-015), so this demo drives the kernel
// directly: build a client, call client.rejoinSse() (real GET /message/sse), and fold the replayed
// events through a Conversation to show the assembled history.
const client = new AsgardServiceClient({
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
});

export function TranscriptReplay(): ReactNode {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [status, setStatus] = useState('尚未 rejoin');

  const rejoin = (withOptimistic: boolean): void => {
    let conv = new Conversation({ messages: new Map() });

    if (withOptimistic) {
      conv = conv.pushMessage({
        type: 'user',
        messageId: 'c-opt-1',
        text: '（optimistic 泡泡）我剛剛問的問題',
      });
    }

    const flush = (): void => setMessages([...(conv.messages?.values() ?? [])]);
    flush();
    setStatus('GET rejoin 中…');

    client.rejoinSse?.('existing-transcript-demo', {
      onSseMessage: event => {
        conv = conv.onMessage(event);
        flush();
      },
      onSseCompleted: () => setStatus('rejoin 完成 —— conversation = 後端權威歷史'),
      onSseError: () => setStatus('rejoin 失敗'),
    });
  };

  return (
    <DemoWrapper
      title="Transcript Replay Kernel (F-014)"
      description="按鈕直接呼叫 client.rejoinSse('existing-…')，走真 GET /message/sse 冷啟動重播。mock 吐收合歷史（message.user + *.complete，皆帶 id: cursor、無 start/delta），core reducer 組進 conversation。「先放 optimistic 泡泡」會先塞一個 customMessageId=c-opt-1 的 user 泡泡；重播帶同一 customMessageId → 以 id 去重、不重複顯示（第一則 user 只出現一次）。"
    >
      <div className={styles.controls}>
        <button type="button" className={styles.button} onClick={() => rejoin(false)}>
          冷啟動 GET rejoin（空 conversation）
        </button>
        <button type="button" className={styles.button} onClick={() => rejoin(true)}>
          先放 optimistic 泡泡 → rejoin（驗去重）
        </button>
        <span className={styles.status}>{status}</span>
      </div>

      <div className={styles.list}>
        {messages.length === 0 ? (
          <div className={styles.empty}>（尚無訊息，按上方按鈕）</div>
        ) : (
          messages.map(m => (
            <div key={m.messageId} className={styles.row} data-role={m.type}>
              <span className={styles.role}>{m.type}</span>
              <span className={styles.text}>{m.type === 'user' ? m.text : m.type === 'bot' ? m.message.text : ''}</span>
              <span className={styles.meta}>
                {m.messageId}
                {m.type === 'user' && m.customMessageId ? ` · cmid=${m.customMessageId}` : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </DemoWrapper>
  );
}
