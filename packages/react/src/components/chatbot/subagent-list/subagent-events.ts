import { ConversationMessage, isAgentTool, isSubagentChildTool, SubagentEvent } from '@asgard-js/core';

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// F-012 — adapt the ordered conversation messages into the `SubagentEvent[]` that `reduceSubagents`
// folds. The conversation Map preserves first-insertion order, so iterating its values yields arrival
// order. A completed child tool emits toolStart + toolComplete back-to-back (its final status is what
// the panel shows); an in-progress child emits only toolStart (→ running).
export function conversationToSubagentEvents(messages: ConversationMessage[]): SubagentEvent[] {
  const events: SubagentEvent[] = [];

  for (const message of messages) {
    if (message.type === 'tool-call' && isAgentTool(message)) {
      events.push({
        kind: 'agentStart',
        toolUseId: message.toolUseId ?? message.messageId,
        description: str(message.parameter.description),
      });
      continue;
    }

    if (message.type === 'tool-call' && isSubagentChildTool(message.parentToolUseId)) {
      const toolUseId = message.toolUseId ?? message.messageId;

      events.push({
        kind: 'toolStart',
        parentToolUseId: message.parentToolUseId as string,
        toolUseId,
        toolsetName: message.toolsetName,
        toolName: message.toolName,
        parameter: message.parameter,
        reason: message.reason,
      });

      if (message.isComplete) {
        events.push({
          kind: 'toolComplete',
          parentToolUseId: message.parentToolUseId as string,
          toolUseId,
          isError: message.isError,
        });
      }

      continue;
    }

    if (message.type === 'subagent' && message.kind === 'start') {
      events.push({
        kind: 'subagentStart',
        parentToolUseId: message.parentToolUseId,
        agentId: message.agentId,
        subagentType: message.subagentType,
        description: message.description,
      });
      continue;
    }

    if (message.type === 'subagent' && message.kind === 'complete' && message.status) {
      events.push({
        kind: 'subagentComplete',
        parentToolUseId: message.parentToolUseId,
        status: message.status,
        summary: message.summary,
      });
    }
  }

  return events;
}
