import { NextRequest } from 'next/server';

interface SseResponse {
  eventType: string;
  requestId: string;
  eventId: string;
  namespace: string;
  botProviderName: string;
  customChannelId: string;
  fact: {
    runInit?: Record<string, never> | null;
    runDone?: Record<string, never> | null;
    runError?: null;
    processStart?: null;
    processComplete?: null;
    messageStart?: {
      message: {
        messageId: string;
        replyToCustomMessageId: string;
        text: string;
        payload: null;
        isDebug: boolean;
        idx: null;
        template: {
          type: string;
          text: string;
        };
      };
    } | null;
    messageDelta?: {
      message: {
        messageId: string;
        replyToCustomMessageId: string;
        text: string;
        payload: null;
        isDebug: boolean;
        idx: number;
        template: null;
      };
    } | null;
    messageComplete?: {
      message: {
        messageId: string;
        replyToCustomMessageId: string;
        text: string;
        payload: null;
        isDebug: boolean;
        idx: null;
        template: {
          type: string;
          text: string;
        };
      };
    } | null;
    toolCallStart?: null;
    toolCallComplete?: null;
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function createBaseResponse(
  eventType: string,
  customChannelId: string
): Omit<SseResponse, 'fact'> {
  return {
    eventType,
    requestId: generateId(),
    eventId: Date.now().toString(),
    namespace: 'proj-mock-demo',
    botProviderName: 'bp-mock-demo',
    customChannelId,
  };
}

export async function POST(request: NextRequest) {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const body = await request.json();
  const { customChannelId, customMessageId, text } = body;

  // 設定 SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  const encoder = new TextEncoder();
  const messageId = `msg-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: SseResponse) => {
        const message = `event:${event}\ndata:${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const sendWithDelay = (
        delay: number,
        event: string,
        data: SseResponse
      ) => {
        setTimeout(() => {
          send(event, data);
        }, delay);
      };

      // 1. 發送 run.init
      send('asgard.run.init', {
        ...createBaseResponse('asgard.run.init', customChannelId),
        fact: {
          runInit: {} as Record<string, never>,
          runDone: null,
          runError: null,
          processStart: null,
          processComplete: null,
          messageStart: null,
          messageDelta: null,
          messageComplete: null,
          toolCallStart: null,
          toolCallComplete: null,
        },
      });

      // 2. 發送 message.start (延遲 100ms)
      sendWithDelay(100, 'asgard.message.start', {
        ...createBaseResponse('asgard.message.start', customChannelId),
        fact: {
          runInit: null,
          runDone: null,
          runError: null,
          processStart: null,
          processComplete: null,
          messageStart: {
            message: {
              messageId,
              replyToCustomMessageId: customMessageId,
              text: '',
              payload: null,
              isDebug: false,
              idx: null,
              template: {
                type: 'TEXT',
                text: '',
              },
            },
          },
          messageDelta: null,
          messageComplete: null,
          toolCallStart: null,
          toolCallComplete: null,
        },
      });

      // 3. 模擬打字效果 - 分段發送 message.delta
      const responseText = `你好！這是模擬 API 的回應。你剛才說：「${text}」\n\n這個模擬 API 會：\n- 模擬真實的 SSE 事件流\n- 包含完整的 Asgard 訊息格式\n- 提供打字動畫效果`;
      let idx = 0;

      const words = responseText.split('');

      words.forEach((char, index) => {
        sendWithDelay(200 + index * 50, 'asgard.message.delta', {
          ...createBaseResponse('asgard.message.delta', customChannelId),
          fact: {
            runInit: null,
            runDone: null,
            runError: null,
            processStart: null,
            processComplete: null,
            messageStart: null,
            messageDelta: {
              message: {
                messageId,
                replyToCustomMessageId: customMessageId,
                text: char,
                payload: null,
                isDebug: false,
                idx: idx++,
                template: null,
              },
            },
            messageComplete: null,
            toolCallStart: null,
            toolCallComplete: null,
          },
        });
      });

      // 4. 發送 message.complete (在所有 delta 完成後)
      const completeDelay = 200 + words.length * 50 + 100;
      sendWithDelay(completeDelay, 'asgard.message.complete', {
        ...createBaseResponse('asgard.message.complete', customChannelId),
        fact: {
          runInit: null,
          runDone: null,
          runError: null,
          processStart: null,
          processComplete: null,
          messageStart: null,
          messageDelta: null,
          messageComplete: {
            message: {
              messageId,
              replyToCustomMessageId: customMessageId,
              text: responseText,
              payload: null,
              isDebug: false,
              idx: null,
              template: {
                type: 'TEXT',
                text: responseText,
              },
            },
          },
          toolCallStart: null,
          toolCallComplete: null,
        },
      });

      // 5. 發送 run.done (最後)
      sendWithDelay(completeDelay + 100, 'asgard.run.done', {
        ...createBaseResponse('asgard.run.done', customChannelId),
        fact: {
          runInit: null,
          runDone: {} as Record<string, never>,
          runError: null,
          processStart: null,
          processComplete: null,
          messageStart: null,
          messageDelta: null,
          messageComplete: null,
          toolCallStart: null,
          toolCallComplete: null,
        },
      });

      // 6. 關閉連接 (最後)
      setTimeout(() => {
        controller.close();
      }, completeDelay + 200);
    },
  });

  return new Response(stream, { headers });
}

// 處理 OPTIONS 請求 (CORS preflight)
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}