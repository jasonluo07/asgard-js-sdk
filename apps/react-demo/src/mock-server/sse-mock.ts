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

// Split text into small pieces for typewriter-style delta streaming (code-point aware so CJK / emoji
// never split mid-character).
function chunkText(text: string, size = 3): string[] {
  const chars = Array.from(text);
  const out: string[] = [];
  for (let i = 0; i < chars.length; i += size) out.push(chars.slice(i, i + size).join(''));

  return out;
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
  // F-014 — GET /message/sse is the transcript cold-start rejoin: replay the collapsed history
  // (message.user + self-sufficient *.complete), each frame carrying an `id:` cursor.
  if (req.method === 'GET') {
    await handleMockTranscriptRejoin(req, res);

    return;
  }

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

  // F-002 Last-Event-ID resume demo — scoped channel. A fresh run drops the socket mid-stream; the
  // library reconnects with `Last-Event-ID` and the mock resumes from that cursor. A `no-cursor` keyword
  // fails before 200 → surfaced as an error, never re-POSTed.
  if (customChannelId === 'stream-resume-demo') {
    await handleStreamResumeMock(req, res, payload);

    return;
  }

  // F-001 thinking demo — scoped channel. Streams an extended-thinking sequence
  // (thinking.start → delta×N → complete) then the visible answer, so the ThinkingBlock's
  // streaming (auto-scroll window) and completed ("Thought for a moment" + show more) states show.
  if (customChannelId === 'thinking-demo') {
    await handleThinkingMock(res, payload);

    return;
  }

  // F-003 run-indicator demo — scoped channel. Streams a multi-message run with inter-message gaps
  // and a complete→done tail, so the seam indicator can be seen staying lit the whole run (bound to
  // the connection, not per-message) — no flicker, no disappearance in the gaps.
  if (customChannelId === 'run-indicator-demo') {
    await handleRunIndicatorMock(res, payload);

    return;
  }

  // All-features showcase — scoped channel. One run streams every roadmap feature through the real
  // <Chatbot> at once: run indicator (F-003), channel title update (F-016/017), thinking (F-001),
  // tool-call variants + grouping + diff + isError + expand (F-004/006/007/008/009), the docked Task
  // (F-010) and Subagent (F-012) panels, and the assembled answer (F-011). Auto-plays on the mount
  // RESET_CHANNEL; a later plain send gets a short reply so the page stays interactive.
  if (customChannelId === 'all-features-demo') {
    await handleAllFeaturesMock(res, payload);

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

// ---------------------------------------------------------------------------------------------------
// F-001 — extended-thinking demo. Streams a reasoning sequence (thinking.start → delta×N → complete)
// long enough to overflow the streaming window (shows the bottom-anchored auto-scroll + top mask) and
// to exceed the completed-state preview cap (shows "顯示更多"), then the visible answer below it.
// ---------------------------------------------------------------------------------------------------

const THINKING_CHUNKS = [
  '先拆解使用者的問題：',
  '他想知道各通路上週的成長狀況與排名。',
  '\n我需要幾個步驟：',
  '\n1. 取出上週與前一週各通路的訂單數，',
  '\n2. 按通路分組、算出成長率，',
  '\n3. 由高到低排序，',
  '\n4. 挑出前幾名並簡述原因。',
  '\n\n先確認資料範圍是否足夠，',
  '再決定要不要呼叫分析工具。',
  '看起來 orders 表已涵蓋所需欄位，可以直接彙總計算。',
  '\n\n另外要注意幾個邊界情況：',
  '\n- 上週有跨月，帳務結算日可能落在不同區間；',
  '\n- 部分通路上週才開通，成長率的分母會偏小、要標注；',
  '\n- 退貨與取消的訂單要不要計入，會影響排名。',
  '\n\n綜合以上，先用含退貨淨額、且排除未滿一週的通路來排，最穩健。',
];

const THINKING_ANSWER =
  '根據上週資料，成長最快的是行動 App（+38%），其次是 LINE 官方帳號（+21%）、官網（+9%）。行動 App 的成長主要來自推播導流的回購。';

function thinkingFrame(
  header: CommonHeader,
  eventType: 'asgard.message.thinking.start' | 'asgard.message.thinking.delta' | 'asgard.message.thinking.complete',
  messageId: string,
  replyToCustomMessageId: string,
  text: string,
): object {
  const factKey =
    eventType === 'asgard.message.thinking.start'
      ? 'messageThinkingStart'
      : eventType === 'asgard.message.thinking.delta'
      ? 'messageThinkingDelta'
      : 'messageThinkingComplete';

  return {
    ...header,
    eventType,
    fact: {
      ...emptyFact(),
      [factKey]: {
        message: { messageId, replyToCustomMessageId, text, payload: null, isDebug: false, idx: null, template: null },
      },
    },
  };
}

async function handleThinkingMock(res: ServerResponse, payload: ParsedPayload): Promise<void> {
  const header: CommonHeader = {
    requestId: randomUUID(),
    namespace: NAMESPACE,
    botProviderName: BOT_PROVIDER_NAME,
    customChannelId: 'thinking-demo',
  };
  const replyTo = payload.customMessageId ?? '';
  const thinkingId = randomUUID();
  const answerId = randomUUID();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  writeEvent(res, { ...header, eventType: 'asgard.run.init', fact: { ...emptyFact(), runInit: {} } });
  await sleep(40);

  // Extended-thinking: start (empty) → delta×N (streams into the auto-scroll window) → complete (full).
  writeEvent(res, thinkingFrame(header, 'asgard.message.thinking.start', thinkingId, replyTo, ''));
  await sleep(80);

  for (const chunk of THINKING_CHUNKS) {
    await sleep(90);
    writeEvent(res, thinkingFrame(header, 'asgard.message.thinking.delta', thinkingId, replyTo, chunk));
  }

  await sleep(80);
  writeEvent(
    res,
    thinkingFrame(header, 'asgard.message.thinking.complete', thinkingId, replyTo, THINKING_CHUNKS.join('')),
  );

  // The visible answer follows the thinking block.
  await sleep(160);
  writeEvent(res, messageFrame(header, 'asgard.message.start', answerId, replyTo, '', TEXT_TEMPLATE('')));
  await sleep(120);
  writeEvent(
    res,
    messageFrame(header, 'asgard.message.complete', answerId, replyTo, THINKING_ANSWER, TEXT_TEMPLATE(THINKING_ANSWER)),
  );

  writeEvent(res, { ...header, eventType: 'asgard.run.done', fact: { ...emptyFact(), runDone: {} } });
  res.end();
}

// ---------------------------------------------------------------------------------------------------
// F-003 — run-indicator demo. One connection, two messages with a deliberate gap between them and a
// complete→done tail. `isConnecting` stays true for the whole run, so the seam indicator must stay lit
// continuously — no flicker per message, no disappearance in the gap (where the old placeholder blanked).
// ---------------------------------------------------------------------------------------------------

async function handleRunIndicatorMock(res: ServerResponse, payload: ParsedPayload): Promise<void> {
  const header: CommonHeader = {
    requestId: randomUUID(),
    namespace: NAMESPACE,
    botProviderName: BOT_PROVIDER_NAME,
    customChannelId: 'run-indicator-demo',
  };
  const replyTo = payload.customMessageId ?? '';
  const msgA = randomUUID();
  const msgB = randomUUID();
  const msgC = randomUUID();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  writeEvent(res, { ...header, eventType: 'asgard.run.init', fact: { ...emptyFact(), runInit: {} } });
  await sleep(40);

  const streamMessage = async (id: string, chunks: string[]): Promise<void> => {
    writeEvent(res, messageFrame(header, 'asgard.message.start', id, replyTo, '', TEXT_TEMPLATE('')));
    for (const chunk of chunks) {
      await sleep(200);
      writeEvent(res, messageFrame(header, 'asgard.message.delta', id, replyTo, chunk, null));
    }

    const full = chunks.join('');
    await sleep(120);
    writeEvent(res, messageFrame(header, 'asgard.message.complete', id, replyTo, full, TEXT_TEMPLATE(full)));
  };

  // A long, three-message run (~14s) so the seam indicator can be watched staying lit the whole time.
  // Message A.
  await streamMessage(msgA, [
    '先回覆第一段。',
    '這則訊息串流完成後，',
    '會有一段明顯的等待空檔，',
    '你可以盯著交界的進度線 —— ',
    '它不該在這裡消失。',
  ]);

  // Inter-message gap — no events for ~2.6s. The old per-message placeholder used to disappear here;
  // the seam indicator (bound to the connection) must stay lit.
  await sleep(2600);

  // Message B.
  await streamMessage(msgB, [
    '接著送出第二段回覆。',
    '整段 run 期間，',
    '交界的進度線都持續掃動，',
    '跨訊息、跨空檔都不閃爍。',
  ]);

  // Second gap.
  await sleep(2600);

  // Message C.
  await streamMessage(msgC, ['最後再補一段。', 'complete 之後連線還會保持一下，', '進度線要續亮到 run.done 才熄。']);

  // Complete→done tail — the connection lingers after the last message.complete (R4).
  await sleep(2200);

  writeEvent(res, { ...header, eventType: 'asgard.run.done', fact: { ...emptyFact(), runDone: {} } });
  res.end();
}

// ---------------------------------------------------------------------------------------------------
// F-002 — Last-Event-ID resume demo. A fresh run streams `id:`-tagged deltas then drops the socket
// mid-stream; @microsoft/fetch-event-source reconnects with `Last-Event-ID` and this handler resumes
// from that cursor (transparent — no gap, no dup). A `no-cursor` keyword fails before 200 so the SDK
// surfaces the error without re-POSTing it (UC-004).
// ---------------------------------------------------------------------------------------------------

const RESUME_CHUNKS = [
  '這則訊息會串到一半',
  '被伺服器切斷連線，',
  '接著 fetch-event-source ',
  '帶著 Last-Event-ID ',
  '自動重連，',
  '後端從 cursor 續傳、不重新派送，',
  '所以內容接續、',
  '不缺漏、不重複 —— ',
  '斷線對使用者透明。',
];

// Delta frame carrying a resume cursor (`id:` line written by writeCursorEvent).
function resumeDelta(header: CommonHeader, messageId: string, replyTo: string, text: string, idx: number): object {
  return {
    ...header,
    eventType: 'asgard.message.delta',
    fact: {
      ...emptyFact(),
      messageDelta: {
        message: {
          messageId,
          replyToCustomMessageId: replyTo,
          text,
          payload: null,
          isDebug: false,
          idx,
          template: null,
        },
      },
    },
  };
}

function writeCursorEvent(res: ServerResponse, event: object, id: string): void {
  res.write(`id: ${id}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function handleStreamResumeMock(
  req: IncomingMessage,
  res: ServerResponse,
  payload: ParsedPayload,
): Promise<void> {
  const text = payload.text ?? '';
  const replyTo = payload.customMessageId ?? '';
  const lastEventId = typeof req.headers['last-event-id'] === 'string' ? req.headers['last-event-id'] : undefined;

  // UC-004 — no cursor: fail before 200. With the RxJS retry(3) removed, this surfaces as HttpError and
  // is NOT re-POSTed (an empty-cursor POST would be re-dispatched by the backend as a duplicate run).
  if (!lastEventId && /no-cursor|fail/.test(text)) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('simulated pre-200 failure (UC-004): no cursor, not re-dispatched');

    return;
  }

  const header: CommonHeader = {
    requestId: randomUUID(),
    namespace: NAMESPACE,
    botProviderName: BOT_PROVIDER_NAME,
    customChannelId: 'stream-resume-demo',
  };
  // messageId derived from customMessageId: stable across a run + its reconnect (the library replays the
  // same POST body), but distinct per user click. The cursor is `${messageId}:${idx}`.
  const messageId = `resume-${replyTo || 'init'}`;
  const fullText = RESUME_CHUNKS.join('');
  const sseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };

  const complete = (): void => {
    writeEvent(res, {
      ...header,
      eventType: 'asgard.message.complete',
      fact: {
        ...emptyFact(),
        messageComplete: {
          message: {
            messageId,
            replyToCustomMessageId: replyTo,
            text: fullText,
            payload: null,
            isDebug: false,
            idx: null,
            template: { type: 'TEXT', text: fullText },
          },
        },
      },
    });
    writeEvent(res, { ...header, eventType: 'asgard.run.done', fact: { ...emptyFact(), runDone: {} } });
    res.end();
  };

  // UC-003 resume — the reconnect carries `Last-Event-ID: ${messageId}:${idx}`; continue from idx+1.
  if (lastEventId) {
    res.writeHead(200, sseHeaders);
    const resumeFrom = Number(lastEventId.slice(lastEventId.lastIndexOf(':') + 1)) + 1;
    for (let i = resumeFrom; i < RESUME_CHUNKS.length; i++) {
      await sleep(90);
      writeCursorEvent(res, resumeDelta(header, messageId, replyTo, RESUME_CHUNKS[i], i), `${messageId}:${i}`);
    }

    await sleep(40);
    complete();

    return;
  }

  // Fresh run — stream `id:`-tagged deltas. A `resume`/`drop` keyword kills the socket mid-stream to
  // force the native reconnect; otherwise the message just completes (baseline).
  res.writeHead(200, sseHeaders);
  writeEvent(res, { ...header, eventType: 'asgard.run.init', fact: { ...emptyFact(), runInit: {} } });
  writeEvent(res, {
    ...header,
    eventType: 'asgard.message.start',
    fact: {
      ...emptyFact(),
      messageStart: {
        message: {
          messageId,
          replyToCustomMessageId: replyTo,
          text: '',
          payload: null,
          isDebug: false,
          idx: null,
          template: { type: 'TEXT', text: '' },
        },
      },
    },
  });

  const shouldDrop = /resume|drop|斷線|續傳/.test(text);
  const dropAt = Math.floor(RESUME_CHUNKS.length / 2);
  for (let i = 0; i < RESUME_CHUNKS.length; i++) {
    await sleep(90);
    writeCursorEvent(res, resumeDelta(header, messageId, replyTo, RESUME_CHUNKS[i], i), `${messageId}:${i}`);

    if (shouldDrop && i === dropAt) {
      // Kill the socket mid-stream → the client reconnects with `Last-Event-ID: resume-msg:${dropAt}`,
      // hitting the resume branch above.
      res.destroy();

      return;
    }
  }

  await sleep(40);
  complete();
}

// ---------------------------------------------------------------------------------------------------
// F-014 — transcript cold-start rejoin. `GET /message/sse?custom_channel_id=…` replays the collapsed
// history: user turns as `message.user` (persist-only, echoing the client's customMessageId for dedup)
// interleaved with self-sufficient assistant `message.complete` frames. Each carries an `id:` cursor.
// ---------------------------------------------------------------------------------------------------

async function handleMockTranscriptRejoin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '', 'http://localhost');
  const customChannelId = url.searchParams.get('custom_channel_id') ?? 'mock-channel';
  const header: CommonHeader = {
    requestId: randomUUID(),
    namespace: NAMESPACE,
    botProviderName: BOT_PROVIDER_NAME,
    customChannelId,
  };

  const userFrame = (messageId: string, text: string, customMessageId: string): object => ({
    ...header,
    eventType: 'asgard.message.user',
    fact: { ...emptyFact(), messageUser: { messageId, text, customMessageId, blobIds: [] } },
  });
  const botComplete = (messageId: string, text: string): object => ({
    ...header,
    eventType: 'asgard.message.complete',
    fact: {
      ...emptyFact(),
      messageComplete: {
        message: {
          messageId,
          replyToCustomMessageId: '',
          text,
          payload: null,
          isDebug: false,
          idx: null,
          template: { type: 'TEXT', text },
        },
      },
    },
  });

  // Collapsed history: two turns. The first user turn echoes customMessageId `c-opt-1` so it de-dups
  // against the demo's optimistic bubble; the second (`c-2`) has no optimistic match.
  const transcript: { event: object; id: string }[] = [
    { event: userFrame('u-backend-1', '（後端歷史）我剛剛問的問題', 'c-opt-1'), id: 'seq:1' },
    { event: botComplete('a-backend-1', '（後端歷史）這是助理對第一題的回答。'), id: 'seq:2' },
    { event: userFrame('u-backend-2', '（後端歷史）第二個問題', 'c-2'), id: 'seq:3' },
    { event: botComplete('a-backend-2', '（後端歷史）這是助理對第二題的回答。'), id: 'seq:4' },
  ];

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  for (const frame of transcript) {
    await sleep(120);
    writeCursorEvent(res, frame.event, frame.id);
  }

  await sleep(40);
  writeEvent(res, { ...header, eventType: 'asgard.run.done', fact: { ...emptyFact(), runDone: {} } });
  res.end();
}

// ---------------------------------------------------------------------------------------------------
// F-015 — channel metadata gate. `GET /channel/metadata?custom_channel_id=…` is the join-init existence
// check: 200 (+ title/runState) = exists → restore; 404 = not exists → per autoResetChannel; other = error.
// Default is 404 so every other demo channel keeps its pre-F-015 mount behavior (404 → RESET_CHANNEL).
// The /join-init route uses the scoped ids below to drive the three branches (+ the error fallback).
// ---------------------------------------------------------------------------------------------------

export async function handleMockChannelMetadata(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '', 'http://localhost');
  const customChannelId = url.searchParams.get('custom_channel_id') ?? '';

  // Non-404 error → the SDK must fall back safely (no wipe, no hang), never treat it as "not exists".
  if (customChannelId === 'join-error-demo') {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('simulated metadata failure (F-015 R6): indeterminate, must not reset');

    return;
  }

  // Exists → restore. The title seeds the channel-title bar (F-016); GET /message/sse replays history.
  if (customChannelId.startsWith('join-existing')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        data: { title: '庫存分析（已存在的頻道）', runState: 'IDLE', lastActivityAt: '2026-07-15T00:00:00Z' },
      }),
    );

    return;
  }

  // Default: channel does not exist.
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('channel not found');
}

// ---------------------------------------------------------------------------------------------------
// All-features showcase — one live run through the real <Chatbot> that exercises every roadmap feature.
// Frame builders for the tool-call / subagent / title events (the other demos use preview initMessages;
// this one streams them so the docked Task/Subagent panels, live title, and run indicator all light up).
// ---------------------------------------------------------------------------------------------------

interface ToolCallShape {
  toolsetName: string;
  toolName: string;
  parameter: Record<string, unknown>;
  reason?: string;
}

function toolStartFrame(
  header: CommonHeader,
  processId: string,
  callSeq: number,
  toolCall: ToolCallShape,
  ids?: { toolUseId?: string; parentToolUseId?: string },
): object {
  return {
    ...header,
    eventType: 'asgard.tool_call.start',
    fact: { ...emptyFact(), toolCallStart: { processId, callSeq, ...ids, toolCall } },
  };
}

function toolCompleteFrame(
  header: CommonHeader,
  processId: string,
  callSeq: number,
  toolCall: ToolCallShape,
  result: Record<string, unknown>,
  opts?: {
    isError?: boolean;
    sidecar?: Record<string, unknown>;
    ids?: { toolUseId?: string; parentToolUseId?: string };
  },
): object {
  return {
    ...header,
    eventType: 'asgard.tool_call.complete',
    fact: {
      ...emptyFact(),
      toolCallComplete: {
        processId,
        callSeq,
        ...opts?.ids,
        toolCall,
        toolCallResult: result,
        ...(opts?.isError != null ? { isError: opts.isError } : {}),
        ...(opts?.sidecar ? { toolUseResultSidecar: opts.sidecar } : {}),
      },
    },
  };
}

function subagentStartFrame(header: CommonHeader, data: Record<string, unknown>): object {
  return { ...header, eventType: 'asgard.subagent.start', fact: { ...emptyFact(), subagentStart: data } };
}

function subagentCompleteFrame(header: CommonHeader, data: Record<string, unknown>): object {
  return { ...header, eventType: 'asgard.subagent.complete', fact: { ...emptyFact(), subagentComplete: data } };
}

function titleUpdateFrame(header: CommonHeader, title: string | null): object {
  return {
    ...header,
    eventType: 'asgard.channel.title.update',
    fact: { ...emptyFact(), channelTitleUpdate: { title } },
  };
}

const SHOWCASE_THINKING = [
  '先確認「上週」的日期區間（系統時區週一到週日），',
  '從 orders 表依通路彙總訂單數與金額、排除測試與取消單，',
  '再看 Bolzen 法蘭螺栓急單的用料需求與 SWRCH35K φ7.0 線材庫存，',
  '算出短缺量並評估標準前置 30 天是否趕得上 7/16 出貨。',
];

const SHOWCASE_ANSWER =
  '## 分析結果\n\n上週通路訂單以**官網**居冠（1,280 筆）。Bolzen 急單需 SWRCH35K φ7.0 線材 **16,000 kg**，' +
  '可用庫存 9,500 kg → **短缺 6,500 kg**，標準前置 30 天趕不上 7/16。已改查替代料號 **SWRCH38K**（前置 15 天），' +
  '報表 `report.html` 已建立、`plan.md` 標題已更新。';

async function handleAllFeaturesMock(res: ServerResponse, payload: ParsedPayload): Promise<void> {
  const header: CommonHeader = {
    requestId: randomUUID(),
    namespace: NAMESPACE,
    botProviderName: BOT_PROVIDER_NAME,
    customChannelId: 'all-features-demo',
  };
  const replyTo = payload.customMessageId ?? '';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  // A later plain send (action=NONE) just gets a short reply so the page stays interactive after the show.
  if (payload.action !== 'RESET_CHANNEL') {
    const mid = randomUUID();
    writeEvent(res, { ...header, eventType: 'asgard.run.init', fact: { ...emptyFact(), runInit: {} } });
    const ack = '這是「全功能展示」頁 —— 重整頁面即可重看整段串流（進房 RESET 會重播全部功能）。';
    await sleep(120);
    writeEvent(res, messageFrame(header, 'asgard.message.complete', mid, replyTo, ack, TEXT_TEMPLATE(ack)));
    writeEvent(res, { ...header, eventType: 'asgard.run.done', fact: { ...emptyFact(), runDone: {} } });
    res.end();

    return;
  }

  // Distinct processId per *thread* tool-call group — the group key is `tool-call-group-${processId}`
  // (chatbot-body), so the general and native groups must differ. Task / subagent tools are filtered out
  // of thread groups, so they can share `proc`.
  const proc = 'showcase';
  const gproc = 'showcase-general';
  const nproc = 'showcase-native';
  let seq = 0;
  const next = (): number => seq++;
  const emit = async (frame: object, ms = 220): Promise<void> => {
    writeEvent(res, frame);
    await sleep(ms);
  };

  // run.init → seam indicator lights, input disabled (F-003).
  await emit({ ...header, eventType: 'asgard.run.init', fact: { ...emptyFact(), runInit: {} } });

  // channel title seed via live update (F-016 store → F-017 title bar).
  await emit(titleUpdateFrame(header, 'Bolzen 法蘭螺栓急單備料查詢'), 200);

  // thinking: streams then collapses to "Thought for a moment" (F-001).
  const think = randomUUID();
  await emit(thinkingFrame(header, 'asgard.message.thinking.start', think, replyTo, ''), 400);
  for (const clause of SHOWCASE_THINKING) {
    for (const piece of chunkText(clause, 4)) {
      await emit(thinkingFrame(header, 'asgard.message.thinking.delta', think, replyTo, piece), 55);
    }
  }

  await emit(
    thinkingFrame(header, 'asgard.message.thinking.complete', think, replyTo, SHOWCASE_THINKING.join('')),
    160,
  );

  // General tool-call group (toolsetName set + reason → label from reason; F-004/006/008).
  const gp = 'ag-material-procurement-tools';
  const g1 = next();
  await emit(
    toolStartFrame(header, gproc, g1, {
      toolsetName: gp,
      toolName: 'query_orders',
      reason: '讀取上週訂單資料',
      parameter: { week: 'LAST_WEEK' },
    }),
    900,
  );
  await emit(
    toolCompleteFrame(
      header,
      gproc,
      g1,
      { toolsetName: gp, toolName: 'query_orders', reason: '讀取上週訂單資料', parameter: { week: 'LAST_WEEK' } },
      { rows: 1280 },
    ),
  );
  const g2 = next();
  await emit(
    toolStartFrame(header, gproc, g2, {
      toolsetName: gp,
      toolName: 'aggregate_by_channel',
      reason: '依通路彙總',
      parameter: {},
    }),
    700,
  );
  await emit(
    toolCompleteFrame(
      header,
      gproc,
      g2,
      { toolsetName: gp, toolName: 'aggregate_by_channel', reason: '依通路彙總', parameter: {} },
      { channels: 3 },
    ),
  );

  // A bot text breaks the tool-call group (so the native group below renders as its own group).
  const t1 = randomUUID();
  await emit(
    messageFrame(
      header,
      'asgard.message.complete',
      t1,
      replyTo,
      '已彙總上週各通路訂單，接著查急單用料與庫存。',
      TEXT_TEMPLATE('已彙總上週各通路訂單，接著查急單用料與庫存。'),
    ),
    160,
  );

  // Task Check List panel (F-010) — TaskCreate/TaskUpdate carried on tool_call.complete sidecar (never
  // parsed from the result string). Task tools are filtered out of the thread into the docked TaskList.
  // The reducer only updates an *existing* tool-call message on complete, so a complete-only frame is
  // dropped — emit start (creates the message) then complete (carries the replay-safe sidecar).
  const task = async (
    name: 'TaskCreate' | 'TaskUpdate',
    parameter: Record<string, unknown>,
    sidecar: Record<string, unknown>,
  ): Promise<void> => {
    const cs = next();
    const tc = { toolsetName: '', toolName: name, parameter };
    await emit(toolStartFrame(header, proc, cs, tc), 130);
    await emit(toolCompleteFrame(header, proc, cs, tc, {}, { sidecar }), 180);
  };

  await task(
    'TaskCreate',
    {
      subject: '查詢 Bolzen 急單用料需求',
      activeForm: '查詢 Bolzen 急單用料需求中',
      description: '查料號、強度等級、數量並計算 SWRCH35K φ7.0 總需求。',
    },
    { task: { id: '1' } },
  );
  await task(
    'TaskUpdate',
    { taskId: '1', status: 'in_progress' },
    { statusChange: { from: 'pending', to: 'in_progress' }, taskId: '1' },
  );
  await task(
    'TaskCreate',
    {
      subject: '查詢 SWRCH35K φ7.0 庫存狀態',
      activeForm: '查詢庫存狀態中',
      description: '查現有量、已分配量、可用量。',
    },
    { task: { id: '2' } },
  );
  await task(
    'TaskUpdate',
    { taskId: '1', status: 'completed' },
    { statusChange: { from: 'in_progress', to: 'completed' }, taskId: '1' },
  );
  await task(
    'TaskUpdate',
    { taskId: '2', status: 'in_progress' },
    { statusChange: { from: 'pending', to: 'in_progress' }, taskId: '2' },
  );
  await task(
    'TaskCreate',
    {
      subject: '計算短缺量與補貨時效風險',
      activeForm: '計算短缺量與風險中',
      description: '需求 16,000kg − 可用 9,500kg，評估 30 天前置是否趕上 7/16。',
    },
    { task: { id: '3' } },
  );
  await task(
    'TaskUpdate',
    { taskId: '2', status: 'completed' },
    { statusChange: { from: 'in_progress', to: 'completed' }, taskId: '2' },
  );
  await task(
    'TaskUpdate',
    { taskId: '3', status: 'in_progress' },
    { statusChange: { from: 'pending', to: 'in_progress' }, taskId: '3' },
  );
  await task(
    'TaskUpdate',
    { taskId: '3', status: 'completed' },
    { statusChange: { from: 'in_progress', to: 'completed' }, taskId: '3' },
  );

  // Subagent panel (F-012) — Agent spawn + subagent.start + child tool + subagent.complete (status is
  // driven by subagent.complete, not the Agent tool-call). Agent + child tools filtered into the panel.
  const spawnSubagent = async (
    parent: string,
    agentId: string,
    desc: string,
    childTool: string,
    childReason: string,
    summary: string,
  ): Promise<void> => {
    await emit(
      toolStartFrame(
        header,
        proc,
        next(),
        { toolsetName: '', toolName: 'Agent', parameter: { description: desc } },
        { toolUseId: parent },
      ),
    );
    await emit(
      subagentStartFrame(header, {
        agentId,
        parentToolUseId: parent,
        subagentType: 'general-purpose',
        description: desc,
      }),
      150,
    );
    const cs = next();
    await emit(
      toolStartFrame(
        header,
        proc,
        cs,
        { toolsetName: '', toolName: childTool, reason: childReason, parameter: {} },
        { parentToolUseId: parent },
      ),
      800,
    );
    await emit(
      toolCompleteFrame(
        header,
        proc,
        cs,
        { toolsetName: '', toolName: childTool, reason: childReason, parameter: {} },
        { ok: true },
        { ids: { parentToolUseId: parent } },
      ),
    );
    await emit(
      subagentCompleteFrame(header, {
        agentId,
        parentToolUseId: parent,
        subagentType: 'general-purpose',
        status: 'completed',
        summary,
      }),
      180,
    );
  };

  await spawnSubagent(
    'toolu_A',
    'ae9f13d8',
    '查詢 Bolzen 訂單用料需求',
    'execute_database_query',
    '查詢用料明細',
    '查得 SO-TM-0455，需 16,000 kg',
  );
  await spawnSubagent(
    'toolu_B',
    'a8c6caab',
    '查詢 SWRCH35K φ7.0 庫存狀態',
    'execute_database_query',
    '查詢可用庫存',
    '可用庫存 9,500 kg',
  );

  // Live title update (F-016) — the topic drifts, the title bar fades to the new value.
  await emit(titleUpdateFrame(header, '急單備料：已改查替代料號 SWRCH38K'), 200);

  // Native built-in tool variants (toolsetName === '' && no reason) — icons + labels (F-004), Write/Edit
  // line diff (F-007), a failed call in red via backend isError (F-009), all expandable (F-008).
  const nativeCall = async (
    toolName: string,
    parameter: Record<string, unknown>,
    result: Record<string, unknown> | string,
    isError?: boolean,
    runMs = 700,
  ): Promise<void> => {
    const s = next();
    const tc = { toolsetName: '', toolName, parameter };
    await emit(toolStartFrame(header, nproc, s, tc), runMs); // spinner spins while the tool "runs"
    await emit(
      toolCompleteFrame(
        header,
        nproc,
        s,
        tc,
        typeof result === 'string' ? { result } : result,
        isError != null ? { isError } : undefined,
      ),
      250,
    );
  };

  await nativeCall(
    'Bash',
    { command: 'which weasyprint || which wkhtmltopdf', description: '檢查可用的 PDF 生成工具' },
    'weasyprint ok',
    undefined,
    400,
  );
  await nativeCall(
    'Read',
    { file_path: '/mnt/workspace/orders.md' },
    '1\t上週訂單彙總\n2\t官網 1280 / App 940 / LINE 610',
    undefined,
    400,
  );
  await nativeCall(
    'Write',
    {
      file_path: '/work/report.html',
      content:
        '<!DOCTYPE html>\n<html lang="zh-TW">\n<head><meta charset="UTF-8" /></head>\n<body>\n<h1>短缺分析報告</h1>\n<p>SWRCH35K φ7.0 短缺 6,500 kg</p>\n</body>\n</html>',
    },
    'File created successfully at: /work/report.html',
  );
  await nativeCall(
    'Edit',
    {
      file_path: '/work/plan.md',
      old_string: '### 標題（暫定）\n**Bolzen 急單備料**',
      new_string: '### 標題（已確認）\n**Bolzen 法蘭螺栓急單：替代料號 SWRCH38K 備料計畫**\n（前置 15 天）',
      replace_all: false,
    },
    'The file /work/plan.md has been updated successfully.',
  );
  await nativeCall(
    'Skill',
    { skill: 'local-plugin:shortage-calc', args: 'SWRCH35K φ7.0 目前短缺多少?' },
    'Launching skill: local-plugin:shortage-calc',
  );
  await nativeCall(
    'WebSearch',
    { query: 'SWRCH38K 線材 交期 2026' },
    'Web search results for query: SWRCH38K 交期…',
    undefined,
    1200,
  );
  await nativeCall(
    'WebFetch',
    { url: 'https://example.com/steel-price', prompt: '摘要鋼價走勢' },
    'The server returned HTTP 403 Forbidden.',
    true,
    1300,
  );

  // Assembled final answer (F-011) — start (empty) → typewriter deltas → complete (markdown).
  const ans = randomUUID();
  await emit(messageFrame(header, 'asgard.message.start', ans, replyTo, '', TEXT_TEMPLATE('')), 450);
  for (const piece of chunkText(SHOWCASE_ANSWER, 3)) {
    await emit(messageFrame(header, 'asgard.message.delta', ans, replyTo, piece, null), 45);
  }

  await emit(
    messageFrame(header, 'asgard.message.complete', ans, replyTo, SHOWCASE_ANSWER, TEXT_TEMPLATE(SHOWCASE_ANSWER)),
    120,
  );

  // run.done → indicator off, input released.
  writeEvent(res, { ...header, eventType: 'asgard.run.done', fact: { ...emptyFact(), runDone: {} } });
  res.end();
}
