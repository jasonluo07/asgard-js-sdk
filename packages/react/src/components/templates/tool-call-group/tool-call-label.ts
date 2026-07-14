import { ConversationToolCallMessage } from '@asgard-js/core';

// F-004 — tool-call label priority + native built-in detection + label synthesis.
// The seven Claude-native built-ins (toolsetName === "" and toolName ∈ NATIVE) carry an empty `reason`,
// so their label is synthesized here; general tools and Asgard-platform built-ins have a non-empty
// `reason` and use it directly. i18n (locale switching) is F-005 — the en-US strings live in EN_LABEL
// so F-005 can lift them into the locale catalog.

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

// en-US synthesis strings, grouped so F-005 can lift them into the i18n catalog (keyed as tool.read etc.).
const EN_LABEL = {
  read: (file: string): string => `Read ${file}`,
  write: (file: string): string => `Wrote ${file}`,
  edit: (file: string): string => `Edited ${file}`,
  skill: (skill: string): string => `Ran skill ${skill}`,
  webfetch: (host: string): string => `Fetched ${host}`,
  websearch: (query: string): string => `Searched “${query}”`,
};

/**
 * Single tool-call display label (pinned spec §1 priority):
 * 1. `reason !== ""` → use `reason` (general tools + Asgard-platform built-ins)
 * 2. `reason === ""` and native seven → synthesize (§3)
 * 3. otherwise → `toolName` fallback
 */
export function synthesizeToolCallLabel(call: ToolCallInput): string {
  if (call.reason) return call.reason;

  if (isNativeBuiltin(call)) {
    const p = call.parameter ?? {};

    switch (call.toolName) {
      case 'Bash':
        // `description` is natural language written in the agent's own language — shown as-is, not i18n'd.
        return str(p.description) || str(p.command) || 'Bash';
      case 'Read':
        return EN_LABEL.read(basename(str(p.file_path)));
      case 'Write':
        return EN_LABEL.write(basename(str(p.file_path)));
      case 'Edit':
        return EN_LABEL.edit(basename(str(p.file_path)));
      case 'Skill':
        return EN_LABEL.skill(str(p.skill));
      case 'WebFetch':
        return EN_LABEL.webfetch(hostOf(str(p.url)));
      case 'WebSearch':
        return EN_LABEL.websearch(str(p.query));
    }
  }

  return call.toolName;
}
