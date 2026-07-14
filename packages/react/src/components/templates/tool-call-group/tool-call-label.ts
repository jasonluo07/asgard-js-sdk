import { ConversationToolCallMessage } from '@asgard-js/core';
import { Locale, t } from '../../../i18n';

// F-004 — tool-call label priority + native built-in detection + label synthesis.
// The seven Claude-native built-ins (toolsetName === "" and toolName ∈ NATIVE) carry an empty `reason`,
// so their label is synthesized here; general tools and Asgard-platform built-ins have a non-empty
// `reason` and use it directly. F-005 — the synthesized text is localized through the i18n catalog
// (`t(locale, 'tool.…', vars)`); Bash's `description` is agent-written NL and is shown as-is, never i18n'd.

const NATIVE_TOOLS = new Set(['Bash', 'Read', 'Write', 'Edit', 'Skill', 'WebFetch', 'WebSearch']);

export type ToolCallVariant = 'bash' | 'read' | 'write' | 'edit' | 'skill' | 'webfetch' | 'websearch' | 'generic';

const VARIANT_BY_TOOL: Record<string, ToolCallVariant> = {
  Bash: 'bash',
  Read: 'read',
  Write: 'write',
  Edit: 'edit',
  Skill: 'skill',
  WebFetch: 'webfetch',
  WebSearch: 'websearch',
};

type ToolCallInput = Pick<ConversationToolCallMessage, 'toolsetName' | 'toolName' | 'reason' | 'parameter'>;

/** native Claude built-in: `toolsetName === ""` AND `toolName` ∈ the seven. Gating on both avoids
 * misclassifying Asgard-platform tools (DB / download) that also have an empty `toolsetName`. */
function isNativeBuiltin(call: ToolCallInput): boolean {
  return call.toolsetName === '' && NATIVE_TOOLS.has(call.toolName);
}

/** The left identity icon key. native → its own variant; everything else → `generic`. */
export function getToolCallVariant(call: ToolCallInput): ToolCallVariant {
  return isNativeBuiltin(call) ? VARIANT_BY_TOOL[call.toolName] : 'generic';
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const basename = (path: string): string => path.split('/').filter(Boolean).pop() ?? path;
const hostOf = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/**
 * Single tool-call display label (pinned spec §1 priority):
 * 1. `reason !== ""` → use `reason` (general tools + Asgard-platform built-ins)
 * 2. `reason === ""` and native seven → synthesize (§3), localized via `t(locale, …)`
 * 3. otherwise → `toolName` fallback
 */
export function synthesizeToolCallLabel(call: ToolCallInput, locale: Locale): string {
  if (call.reason) return call.reason;

  if (isNativeBuiltin(call)) {
    const p = call.parameter ?? {};

    switch (call.toolName) {
      case 'Bash':
        // `description` is natural language written in the agent's own language — shown as-is, not i18n'd.
        return str(p.description) || str(p.command) || 'Bash';
      case 'Read':
        return t(locale, 'tool.read', { file: basename(str(p.file_path)) });
      case 'Write':
        return t(locale, 'tool.write', { file: basename(str(p.file_path)) });
      case 'Edit':
        return t(locale, 'tool.edit', { file: basename(str(p.file_path)) });
      case 'Skill':
        return t(locale, 'tool.skill', { skill: str(p.skill) });
      case 'WebFetch':
        return t(locale, 'tool.webfetch', { host: hostOf(str(p.url)) });
      case 'WebSearch':
        return t(locale, 'tool.websearch', { query: str(p.query) });
    }
  }

  return call.toolName;
}

/**
 * Localized group summary (pinned spec §5): `{n} steps · Used {s} skills · Processed {f} files`.
 * `n` = calls in the group; `s` = native Skill calls; `f` = native Read + Write + Edit calls.
 * The `skills` / `files` segments are omitted when their count is 0.
 */
export function groupSummary(calls: ToolCallInput[], locale: Locale): string {
  const n = calls.length;
  const s = calls.filter(c => isNativeBuiltin(c) && c.toolName === 'Skill').length;
  const f = calls.filter(
    c => isNativeBuiltin(c) && (c.toolName === 'Read' || c.toolName === 'Write' || c.toolName === 'Edit'),
  ).length;

  let summary = t(locale, 'summary.steps', { n });

  if (s > 0) summary += t(locale, 'summary.skills', { s });

  if (f > 0) summary += t(locale, 'summary.files', { f });

  return summary;
}

export interface ToolCallDiff {
  added: number;
  removed: number;
}

// Line-level LCS: `added` = lines in `newStr` not on a common subsequence, `removed` = the same for
// `oldStr`. An estimate — without the file's actual content a `replace_all` can't be sized exactly, so
// it is counted as a single hit (pinned spec §6).
function lineDiff(oldStr: string, newStr: string): ToolCallDiff {
  const a = oldStr.split('\n');
  const b = newStr.split('\n');
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lcs = dp[0][0];

  return { added: n - lcs, removed: m - lcs };
}

/**
 * Right-side `+/-` line diff for native Write / Edit (pinned spec §6):
 * Write (create/override) → `+{content line count}`, no removals; Edit → a line-level LCS estimate over
 * `old_string` ↔ `new_string`. Every other tool → `null` (no diff).
 */
export function toolDiff(call: ToolCallInput): ToolCallDiff | null {
  if (!isNativeBuiltin(call)) return null;

  const p = call.parameter ?? {};

  if (call.toolName === 'Write') {
    const content = str(p.content);

    return { added: content ? content.split('\n').length : 0, removed: 0 };
  }

  if (call.toolName === 'Edit') return lineDiff(str(p.old_string), str(p.new_string));

  return null;
}
