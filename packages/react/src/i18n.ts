// F-005 — the SDK's first i18n mechanism: a tiny catalog + `t()` with an en-US fallback. Introduced
// for the synthesized tool-call labels (F-004); later tickets add their own keys (F-006 group summary,
// F-008 expanded titles, F-010 task check list). Missing key or locale → en-US fallback → the key itself.

export type Locale = 'en-US' | 'ja-JP' | 'zh-TW';

const FALLBACK_LOCALE: Locale = 'en-US';

type Vars = Record<string, string | number>;

const MESSAGES: Record<Locale, Record<string, string>> = {
  'en-US': {
    'tool.read': 'Read {file}',
    'tool.write': 'Wrote {file}',
    'tool.edit': 'Edited {file}',
    'tool.skill': 'Ran skill {skill}',
    'tool.webfetch': 'Fetched {host}',
    'tool.websearch': 'Searched “{query}”',
    'summary.steps': '{n} steps',
    'summary.skills': ' · Used {s} skills',
    'summary.files': ' · Processed {f} files',
    'expand.initial': 'Initial',
    'expand.result': 'Result',
    'task.title': 'Tasks',
    'task.pending': 'To do',
    'task.in_progress': 'In progress',
    'task.completed': 'Done',
    'subagent.title': 'Subagents',
    'subagent.running': 'Running',
    'subagent.completed': 'Done',
    'subagent.failed': 'Failed',
    'subagent.cancelled': 'Cancelled',
    'subagent.activeTool': 'Running: {tool}',
    'subagent.toolCount': '{n} tools',
    'thinking.streaming': 'Thinking…',
    'thinking.summary': 'Thought for a moment',
    'thinking.showMore': 'Show more',
    'thinking.showLess': 'Show less',
  },
  'ja-JP': {
    'tool.read': '{file} を読み込み',
    'tool.write': '{file} を作成',
    'tool.edit': '{file} を編集',
    'tool.skill': 'スキル {skill} を実行',
    'tool.webfetch': '{host} を取得',
    'tool.websearch': '「{query}」を検索',
    'summary.steps': '{n} ステップ',
    'summary.skills': ' · スキル {s} 件',
    'summary.files': ' · ファイル {f} 件',
    'expand.initial': '入力',
    'expand.result': '結果',
    'task.title': 'タスク',
    'task.pending': '未着手',
    'task.in_progress': '進行中',
    'task.completed': '完了',
    'subagent.title': 'サブエージェント',
    'subagent.running': '実行中',
    'subagent.completed': '完了',
    'subagent.failed': '失敗',
    'subagent.cancelled': 'キャンセル',
    'subagent.activeTool': '実行中:{tool}',
    'subagent.toolCount': 'ツール {n} 個',
    'thinking.streaming': '考え中…',
    'thinking.summary': '少し考えました',
    'thinking.showMore': 'もっと見る',
    'thinking.showLess': '折りたたむ',
  },
  'zh-TW': {
    'tool.read': '讀取 {file}',
    'tool.write': '寫入 {file}',
    'tool.edit': '編輯 {file}',
    'tool.skill': '執行 skill {skill}',
    'tool.webfetch': '擷取 {host}',
    'tool.websearch': '搜尋「{query}」',
    'summary.steps': '{n} 個步驟',
    'summary.skills': ' · 使用 {s} 個 skill',
    'summary.files': ' · 處理 {f} 個檔案',
    'expand.initial': '輸入',
    'expand.result': '結果',
    'task.title': '任務清單',
    'task.pending': '待處理',
    'task.in_progress': '進行中',
    'task.completed': '已完成',
    'subagent.title': '子代理',
    'subagent.running': '進行中',
    'subagent.completed': '已完成',
    'subagent.failed': '失敗',
    'subagent.cancelled': '已取消',
    'subagent.activeTool': '執行中:{tool}',
    'subagent.toolCount': '{n} 個工具',
    'thinking.streaming': '思考中…',
    'thinking.summary': '已思考片刻',
    'thinking.showMore': '顯示更多',
    'thinking.showLess': '顯示較少',
  },
};

/** Localized message with `{var}` interpolation. Missing key/locale falls back to en-US, then the key. */
export function t(locale: Locale, key: string, vars?: Vars): string {
  const template = MESSAGES[locale]?.[key] ?? MESSAGES[FALLBACK_LOCALE][key] ?? key;

  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? `{${name}}`));
}
