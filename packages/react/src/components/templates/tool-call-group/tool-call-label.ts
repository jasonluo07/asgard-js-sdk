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
