import { ConversationMessage } from '@asgard-js/core';

interface ExportOptions {
  customChannelId?: string;
  botName?: string;
}

export function exportConversationToMarkdown(
  messages: Map<string, ConversationMessage>,
  options?: ExportOptions
): string {
  const { customChannelId, botName = 'AI 助理' } = options ?? {};

  const sortedMessages = Array.from(messages.values()).sort(
    (a, b) => a.time.getTime() - b.time.getTime()
  );

  const exportTime = new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  let markdown = '# 對話紀錄\n\n';
  markdown += `**匯出時間**: ${exportTime}\n\n`;

  if (customChannelId) {
    markdown += `**Channel ID**: ${customChannelId}\n\n`;
  }

  markdown += '---\n\n';

  sortedMessages.forEach((message, index) => {
    const timeStr = message.time.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    if (message.type === 'user') {
      markdown += `**使用者** | ${timeStr}`;

      if (message.traceId) {
        markdown += ` | X-Trace-Id: \`${message.traceId}\``;
      }

      markdown += '\n\n';

      markdown += `${message.text}\n\n`;

      if (message.blobIds && message.blobIds.length > 0) {
        markdown += `*附件: ${message.blobIds.length} 個檔案*\n\n`;
      }
    } else if (message.type === 'bot') {
      markdown += `**${botName}** | ${timeStr}`;

      if (message.traceId) {
        markdown += ` | X-Trace-Id: \`${message.traceId}\``;
      }

      markdown += '\n\n';

      const text = message.message.text || message.typingText || '';
      markdown += `${text}\n\n`;
    } else if (message.type === 'error') {
      markdown += `**錯誤訊息** | ${timeStr}`;

      if (message.traceId) {
        markdown += ` | X-Trace-Id: \`${message.traceId}\``;
      }

      markdown += '\n\n';

      markdown += `**錯誤代碼**: ${message.error.code}\n\n`;
      markdown += `**錯誤訊息**: ${message.error.message}\n\n`;
    }

    // 在每個訊息之間加入分隔線（除了最後一個）
    if (index < sortedMessages.length - 1) {
      markdown += '---\n\n';
    }
  });

  return markdown;
}

export function downloadMarkdown(content: string, filename?: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const defaultFilename = `conversation_${new Date().getTime()}.md`;
  link.href = url;
  link.download = filename ?? defaultFilename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
