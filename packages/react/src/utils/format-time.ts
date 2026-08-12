/**
 * @deprecated No longer used by the SDK — nothing renders a message timestamp any more (#422). Kept so
 * existing callers keep compiling.
 */
export function formatTime(time: Date): string {
  return time.toLocaleTimeString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
