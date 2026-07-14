// 本地 mock SSE handler,給 Vite dev server 用。
// 攔截 POST `/mock-asgard/message/sse`,回傳一段預設好的 streaming bot reply,
// 不接真實 Asgard backend,純測 SDK 的 send-message + streaming scroll 行為。
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

interface ParsedPayload {
  customChannelId?: string;
  customMessageId?: string;
  text?: string;
  action?: string;
}

function readBody(req: IncomingMessage): Promise<ParsedPayload> {
  return new Promise(resolve => {
    const chunks: Buffer[] = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');

        resolve(JSON.parse(body) as ParsedPayload);
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const NAMESPACE = 'mock-namespace';
const BOT_PROVIDER_NAME = 'mock-bot-provider';

// 預設的長回覆 (~28 個 deltas),夠 overflow 一個高度 600px 的 chatbot,
// 讓 scroll follow-bottom 行為在 streaming 過程中可被觀察。
const REPLY_CHUNKS = [
  '收到 ',
  '你的訊息了！',
  '我來回覆',
  '一段較長',
  '的內容，',
  '主要是為了',
  '測試 chatbot ',
  '在 streaming ',
  '過程中,',
  '滾動是否能',
  '一直貼著底部。',
  '\n\n首先，',
  '當 bot 訊息一邊到達、',
  '一邊渲染時，',
  'ResizeObserver ',
  '會持續 fire，',
  '觸發 programmaticScrollToBottom，',
  '視窗應該',
  '持續貼底。',
  '\n\n其次，',
  '使用者送出訊息',
  '的瞬間，',
  'scrollToBottom ',
  '會 snap 到底，',
  '並重置 ',
  'isFollowingLatest=true。',
  '\n\n最後一段',
  '是收尾，完整訊息會在 ',
  'message.complete ',
  '時被換成 final template。',
];

function writeEvent(res: ServerResponse, event: object): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

interface CommonHeader {
  requestId: string;
  namespace: string;
  botProviderName: string;
  customChannelId: string;
}

function emptyFact(): Record<string, unknown> {
  return {
    runInit: null,
    runDone: null,
    runError: null,
    messageStart: null,
    messageDelta: null,
    messageComplete: null,
    toolCallStart: null,
    toolCallComplete: null,
    toolCallConsent: null,
  };
}

export async function handleMockSse(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();

    return;
  }

  const payload = await readBody(req);
  const requestId = randomUUID();
  const customChannelId = payload.customChannelId ?? 'mock-channel';

  // F-011 adversarial-order demo — scoped to its own channel so the other routes' happy-flow mock below
  // is untouched. The route sends a keyword message; the mock replays a pathological frame order.
  if (customChannelId === 'stream-robustness-demo') {
    await handleStreamRobustnessMock(res, payload);

    return;
  }

  const replyToCustomMessageId = payload.customMessageId ?? '';
  const messageId = randomUUID();
  const fullText = REPLY_CHUNKS.join('');

  const header: CommonHeader = {
    requestId,
    namespace: NAMESPACE,
    botProviderName: BOT_PROVIDER_NAME,
    customChannelId,
  };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  // 1. run.init
  writeEvent(res, { ...header, eventType: 'asgard.run.init', fact: { ...emptyFact(), runInit: {} } });
  await sleep(40);

  // 2. message.start (空 text,bot 訊息進入 isTyping 狀態)
  writeEvent(res, {
    ...header,
    eventType: 'asgard.message.start',
    fact: {
      ...emptyFact(),
      messageStart: {
        message: {
          messageId,
          replyToCustomMessageId,
          text: '',
          payload: null,
          isDebug: false,
          idx: null,
          template: { type: 'TEXT', text: '' },
        },
      },
    },
  });

  // 3. message.delta * N — 每 60ms 一筆,模擬真實 LLM streaming
  let idx = 0;

  for (const chunk of REPLY_CHUNKS) {
    await sleep(60);
    writeEvent(res, {
      ...header,
      eventType: 'asgard.message.delta',
      fact: {
        ...emptyFact(),
        messageDelta: {
          message: {
            messageId,
            replyToCustomMessageId,
            text: chunk,
            payload: null,
            isDebug: false,
            idx: idx++,
            template: null,
          },
        },
      },
    });
  }

  await sleep(40);

  // 4. message.complete (final 文字 + template)
  writeEvent(res, {
    ...header,
    eventType: 'asgard.message.complete',
    fact: {
      ...emptyFact(),
      messageComplete: {
        message: {
          messageId,
          replyToCustomMessageId,
          text: fullText,
          payload: null,
          isDebug: false,
          idx: null,
          template: { type: 'TEXT', text: fullText },
        },
      },
    },
  });

  // 5. run.done
  writeEvent(res, { ...header, eventType: 'asgard.run.done', fact: { ...emptyFact(), runDone: {} } });

  res.end();
}

// ---------------------------------------------------------------------------------------------------
// F-011 — message stream assembly robustness demo. Each button on the /stream-robustness route sends a
// keyword message; this handler replays one adversarial frame order for a single messageId so the SDK's
// reducer + renderer can be observed surviving it (no dropped text, no stuck typing, no blanked message).
// ---------------------------------------------------------------------------------------------------

const TEXT_TEMPLATE = (text: string): Record<string, unknown> => ({ type: 'TEXT', text });

function messageFrame(
  header: CommonHeader,
  eventType: 'asgard.message.start' | 'asgard.message.delta' | 'asgard.message.complete',
  messageId: string,
  replyToCustomMessageId: string,
  text: string,
  template: Record<string, unknown> | null,
): object {
  const factKey =
    eventType === 'asgard.message.start'
      ? 'messageStart'
      : eventType === 'asgard.message.delta'
      ? 'messageDelta'
      : 'messageComplete';

  return {
    ...header,
    eventType,
    fact: {
      ...emptyFact(),
      [factKey]: {
        message: { messageId, replyToCustomMessageId, text, payload: null, isDebug: false, idx: null, template },
      },
    },
  };
}

async function handleStreamRobustnessMock(res: ServerResponse, payload: ParsedPayload): Promise<void> {
  const header: CommonHeader = {
    requestId: randomUUID(),
    namespace: NAMESPACE,
    botProviderName: BOT_PROVIDER_NAME,
    customChannelId: 'stream-robustness-demo',
  };
  const replyTo = payload.customMessageId ?? '';
  const text = payload.text ?? '';
  const messageId = randomUUID();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  writeEvent(res, { ...header, eventType: 'asgard.run.init', fact: { ...emptyFact(), runInit: {} } });
  await sleep(40);

  const emit = async (
    eventType: 'asgard.message.start' | 'asgard.message.delta' | 'asgard.message.complete',
    frameText: string,
    template: Record<string, unknown> | null,
  ): Promise<void> => {
    writeEvent(res, messageFrame(header, eventType, messageId, replyTo, frameText, template));
    await sleep(140);
  };

  if (/delta-before-start/.test(text)) {
    // R2 — delta arrives with no start; the reducer lazy-creates and accumulates (never drops).
    await emit('asgard.message.delta', '缺 start，直接來 delta：', null);
    await emit('asgard.message.delta', '文字被 lazy-init 累加，不丟棄。', null);
    const full = '缺 start，直接來 delta：文字被 lazy-init 累加，不丟棄。';
    await emit('asgard.message.complete', full, TEXT_TEMPLATE(full));
  } else if (/start-after-complete/.test(text)) {
    // R3 — a completed message must not regress; the late start + delta are ignored.
    const done = '已完成的權威答案 —— 終態不該被遲到的 start / delta 打回。';
    await emit('asgard.message.complete', done, TEXT_TEMPLATE(done));
    await emit('asgard.message.start', '', TEXT_TEMPLATE(''));
    await emit('asgard.message.delta', '（這段遲到的 delta 應被忽略，不覆蓋終態）', null);
  } else if (/dup-complete/.test(text)) {
    // R3/R4 — duplicate complete stays idempotent (one message, terminal preserved).
    const dup = '重複 complete → 冪等，仍只有一則完成訊息。';
    await emit('asgard.message.complete', dup, TEXT_TEMPLATE(dup));
    await emit('asgard.message.complete', dup, TEXT_TEMPLATE(dup));
  } else if (/no-template/.test(text)) {
    // R5 — a complete with no template renders its plain text (not an empty bubble).
    await emit('asgard.message.complete', 'complete 沒有 template → 前端 fallback 顯示純文字，不是空白 <div/>。', null);
  } else {
    // R1 — complete-only (default): materialize the terminal from a single frame.
    const only = '只有 complete（無 start / delta）也能直接呈現完成訊息，不經 typing 泡泡。';
    await emit('asgard.message.complete', only, TEXT_TEMPLATE(only));
  }

  writeEvent(res, { ...header, eventType: 'asgard.run.done', fact: { ...emptyFact(), runDone: {} } });
  res.end();
}
