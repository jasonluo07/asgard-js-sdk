#!/usr/bin/env node

const https = require('https');
const http = require('http');

async function testSSE() {
  console.log('Testing SSE endpoint...\n');

  const postData = JSON.stringify({
    customChannelId: 'test-channel-123',
    customMessageId: 'test-msg-456',
    text: 'Test message'
  });

  const options = {
    hostname: 'localhost',
    port: 4300,
    path: '/api/mock-sse/message/sse',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    console.log('\n--- SSE Stream Data ---\n');

    let buffer = '';

    res.on('data', (chunk) => {
      buffer += chunk.toString();

      // 處理完整的 SSE 事件
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];

        if (line.startsWith('event:')) {
          console.log(`\x1b[36m${line}\x1b[0m`); // 青色顯示事件
        } else if (line.startsWith('data:')) {
          try {
            const jsonData = JSON.parse(line.substring(5));
            console.log(`\x1b[32mdata:\x1b[0m ${JSON.stringify(jsonData, null, 2).substring(0, 200)}...`);
          } catch (e) {
            console.log(line);
          }
        } else if (line === '') {
          console.log(); // 空行
        }
      }

      // 保留未處理完的部分
      buffer = lines[lines.length - 1];
    });

    res.on('end', () => {
      console.log('\n--- Stream Closed ---');
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  // 發送請求
  req.write(postData);
  req.end();
}

// 執行測試
testSSE();