// F-005 — the SDK's first i18n mechanism: a tiny catalog + `t()` with an en-US fallback. Introduced
// for the synthesized tool-call labels (F-004); later tickets add their own keys (F-006 group summary,
// F-008 expanded titles). Missing key or locale → en-US fallback → the key itself.

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
  },
};

/** Localized message with `{var}` interpolation. Missing key/locale falls back to en-US, then the key. */
export function t(locale: Locale, key: string, vars?: Vars): string {
  const template = MESSAGES[locale]?.[key] ?? MESSAGES[FALLBACK_LOCALE][key] ?? key;

  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? `{${name}}`));
}
