import { ReactNode } from 'react';
import { EventType, type ConversationErrorMessage, type ConversationMessage } from '@asgard-js/core';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './error-details.module.scss';

// asgard-js-sdk#412 — the error bubble used to render a fixed "Unexpected error" and drop
// `message.error` entirely, so a user hitting a workspace quota saw nothing actionable and had no way
// to reach the diagnostics.
//
// Rendered through a real `Chatbot` (endpoint `skip`, so no client is created and nothing is sent)
// rather than a bare `HintTemplate`: the bubble's spacing and clamping come from theme tokens that
// only exist inside the chatbot's theme scope, so a bare render would misrepresent the layout.

/** The reported case: a Sandbox denied by asgard-kube-admission's quota webhook. */
const QUOTA_REASON = 'sandbox provision seconds quota exceeded for workspace ws_42: used 3600 / 3600 this period';

/** A long single-line reason — why the summary clamps and the expanded region caps its own height. */
const LONG_REASON =
  'upstream call failed after 3 attempts: dial tcp 10.42.0.17:8080: connect: connection refused; ' +
  'the workflow processor could not reach the tool server, and the run was terminated before any ' +
  'assistant output was produced. Retry once the tool server reports healthy, or contact the service ' +
  'representative if this persists across deploys.';

function errorMessage(
  id: string,
  overrides: Partial<ConversationErrorMessage['error']>,
  traceId?: string,
): ConversationErrorMessage {
  return {
    type: 'error',
    messageId: id,
    eventType: EventType.ERROR,
    error: {
      message: QUOTA_REASON,
      code: 'QUOTA_EXCEED',
      inner: '',
      location: { namespace: '', workflowName: '', processorName: '', processorType: '' },
      ...overrides,
    },
    time: new Date('2026-08-10T12:34:56.000Z'),
    traceId,
  };
}

const CASES: { id: string; label: string; note: string }[] = [
  {
    id: 'err-full',
    label: 'Quota exceeded（回報的案例）',
    note: 'message + code + traceId + 上游原始 inner —— toggle 能展開的全部內容。',
  },
  {
    id: 'err-long',
    label: '超長原因',
    note: '摘要收合成兩行，完整文字留在 title attribute 裡。',
  },
  {
    id: 'err-nomessage',
    label: '沒有 message',
    note: '退回 catalog 字串，而不是渲染出一個空標題。',
  },
  {
    id: 'err-bare',
    label: '沒有超出摘要的東西',
    note: '沒有 code / inner / traceId —— 不顯示 toggle，免得展開後只看到摘要本身。',
  },
];

const INIT_MESSAGES: ConversationMessage[] = [
  errorMessage(
    'err-full',
    { inner: 'admission webhook "sandbox-validator.asgard.io" denied the request' },
    'trace-7f3a2b19c4e05d61',
  ),
  errorMessage('err-long', { message: LONG_REASON, code: 'UPSTREAM_UNAVAILABLE' }, 'trace-longreason'),
  errorMessage('err-nomessage', { message: '   ' }, 'trace-nomessage'),
  errorMessage('err-bare', { code: '', inner: '' }),
];

export function ErrorDetailsRoute(): ReactNode {
  return (
    <DemoWrapper
      title="Error bubble details (#412)"
      description="The run-terminal error bubble renders the backend's own reason, with the full payload dumped as JSON behind a Show more toggle. Every one of these used to read “Unexpected error”."
    >
      <div className={styles.layout}>
        <ol className={styles.cases}>
          {CASES.map(item => (
            <li key={item.id} className={styles.case}>
              <div className={styles.caseLabel}>{item.label}</div>
              <div className={styles.caseNote}>{item.note}</div>
            </li>
          ))}
        </ol>

        <div className={styles.chatbotContainer}>
          <Chatbot
            title="Error bubble"
            config={{ botProviderEndpoint: 'skip' }}
            customChannelId="error-details-demo"
            autoResetChannel={false}
            initMessages={INIT_MESSAGES}
            theme={{ chatbot: { width: '100%', maxWidth: 'none', height: '640px' } }}
          />
        </div>
      </div>
    </DemoWrapper>
  );
}
