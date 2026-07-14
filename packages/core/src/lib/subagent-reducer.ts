// Subagent list accumulation (F-012) — the framework-agnostic data-layer SoT.
//
// An `Agent` tool-call spawns a subagent, but it is only the "launch" viewpoint and lacks the
// subagent's detail. So the react layer:
//   1. routes the `Agent` tool-call (isAgentTool) and every child tool-call (parentToolUseId !== "")
//      out of the main tool-call group;
//   2. folds the `Agent` tool-call + `subagent.{start,complete}` + child tool-calls into one current
//      subagent list with `reduceSubagents`, presented by `<SubagentList>`.
//
// Two correctness rules (verified against asgard-sdk-go + the new-example11 dump):
//   - A subagent's status is driven by `subagent.start` → `subagent.complete`, NOT the `Agent`
//     tool_call.complete — async subagents complete the `Agent` tool early (result.status =
//     "async_launched") while the subagent is still running.
//   - Correlation key = `parentToolUseId` (= the `Agent` tool-call's `toolUseId`).
import { Subagent, SubagentStatus, SubagentToolCall } from '../types/subagent';

/** The spawning `Agent` tool-call (native builtin). `true` → route out of the tool-call group. */
export function isAgentTool(call: { toolsetName: string; toolName: string }): boolean {
  return call.toolsetName === '' && call.toolName === 'Agent';
}

/** Whether a tool-call belongs to a subagent (child). The main group keeps only `parentToolUseId === ""`. */
export function isSubagentChildTool(parentToolUseId?: string): boolean {
  return !!parentToolUseId;
}

/** The subagent-related SSE events, adapted from their facts by the react layer, in arrival order. */
export type SubagentEvent =
  | { kind: 'agentStart'; toolUseId: string; description?: string }
  | { kind: 'subagentStart'; parentToolUseId: string; agentId?: string; subagentType?: string; description?: string }
  | {
      kind: 'toolStart';
      parentToolUseId: string;
      toolUseId: string;
      toolsetName: string;
      toolName: string;
      parameter?: Record<string, unknown>;
      reason?: string;
    }
  | { kind: 'toolComplete'; parentToolUseId: string; toolUseId: string; isError?: boolean }
  | { kind: 'subagentComplete'; parentToolUseId: string; status: SubagentStatus; summary?: string };

interface Meta {
  agentId?: string;
  subagentType?: string;
  description?: string;
  status: SubagentStatus;
  summary?: string;
}

/**
 * Fold the subagent event stream into the current list (in first-seen order). Pure and replay-safe:
 * status goes terminal only via `subagentComplete` (agentStart / subagentStart never change it), so a
 * replay never knocks a completed subagent back to running.
 */
export function reduceSubagents(events: SubagentEvent[]): Subagent[] {
  const order: string[] = [];
  const meta = new Map<string, Meta>();
  const tools = new Map<string, Map<string, SubagentToolCall>>(); // parentToolUseId -> (toolUseId -> tool)

  const ensure = (id: string): Meta => {
    if (!meta.has(id)) {
      order.push(id);
      meta.set(id, { status: 'running' });
      tools.set(id, new Map());
    }

    return meta.get(id) as Meta;
  };

  for (const event of events) {
    switch (event.kind) {
      case 'agentStart': {
        const m = ensure(event.toolUseId);

        if (event.description && !m.description) m.description = event.description;

        break;
      }

      case 'subagentStart': {
        const m = ensure(event.parentToolUseId);

        m.agentId = event.agentId ?? m.agentId;
        m.subagentType = event.subagentType ?? m.subagentType;
        m.description = event.description ?? m.description;

        break; // never touch status (only subagentComplete goes terminal)
      }

      case 'toolStart': {
        ensure(event.parentToolUseId);
        (tools.get(event.parentToolUseId) as Map<string, SubagentToolCall>).set(event.toolUseId, {
          toolsetName: event.toolsetName,
          toolName: event.toolName,
          parameter: event.parameter ?? {},
          reason: event.reason,
          status: 'running',
        });

        break;
      }

      case 'toolComplete': {
        const tool = tools.get(event.parentToolUseId)?.get(event.toolUseId);

        if (tool) tool.status = event.isError ? 'error' : 'completed';

        break;
      }

      case 'subagentComplete': {
        const m = ensure(event.parentToolUseId);

        m.status = event.status;
        m.summary = event.summary;

        break;
      }
    }
  }

  return order.map(id => ({
    parentToolUseId: id,
    ...(meta.get(id) as Meta),
    tools: Array.from((tools.get(id) as Map<string, SubagentToolCall>).values()),
  }));
}
