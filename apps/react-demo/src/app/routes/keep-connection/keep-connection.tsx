import { ReactNode, useState } from 'react';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import styles from './keep-connection.module.scss';

/**
 * Isolated verification route for the `keepConnectionOnUnmount` prop.
 *
 * How to verify in DevTools:
 * 1. Mount the chatbot, send a message that produces a long stream.
 * 2. While it is still streaming, click "Unmount chatbot".
 * 3. In the Network panel watch the `message/sse` request:
 *    - keepConnectionOnUnmount = true  -> request stays open and finishes (no cancel).
 *    - keepConnectionOnUnmount = false -> request is cancelled immediately on unmount.
 */
export function KeepConnection(): ReactNode {
  const [mounted, setMounted] = useState(false);
  const [keepConnection, setKeepConnection] = useState(true);

  return (
    <div className={styles.keepConnection}>
      <header className={styles.header}>
        <h1>Keep Connection On Unmount</h1>
        <p>
          Verify that an in-flight SSE run is kept alive when the chatbot unmounts (instead of being aborted) so the
          round can finish on the backend.
        </p>
      </header>

      <div className={styles.controls}>
        <label className={styles.toggle}>
          <input type="checkbox" checked={keepConnection} onChange={e => setKeepConnection(e.target.checked)} />
          keepConnectionOnUnmount = <strong>{String(keepConnection)}</strong>
        </label>

        <button className={styles.button} onClick={() => setMounted(m => !m)}>
          {mounted ? 'Unmount chatbot' : 'Mount chatbot'}
        </button>
      </div>

      <ol className={styles.steps}>
        <li>Mount the chatbot and send a message that produces a long stream.</li>
        <li>While it is still streaming, click "Unmount chatbot".</li>
        <li>
          Watch the <code>message/sse</code> request in the Network panel: with the flag on it keeps running to
          completion; with it off it is cancelled on unmount.
        </li>
      </ol>

      {mounted && (
        <div className={styles.chatbotContainer}>
          <Chatbot
            title="Keep Connection Bot"
            config={{
              botProviderEndpoint: import.meta.env.VITE_MARKDOWN_BOT_PROVIDER_ENDPOINT,
            }}
            customChannelId="keep-connection-demo"
            keepConnectionOnUnmount={keepConnection}
            theme={{
              chatbot: {
                width: '380px',
                height: '550px',
                borderRadius: '16px',
              },
            }}
            onClose={() => setMounted(false)}
          />
        </div>
      )}
    </div>
  );
}
