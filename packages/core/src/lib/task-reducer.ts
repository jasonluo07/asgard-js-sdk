// Task Check List accumulation (F-010) — the framework-agnostic data-layer SoT.
//
// `TaskCreate` / `TaskUpdate` are native built-in tool-calls (`toolsetName === ""`, `reason === ""`),
// but their meaning is "an incremental edit to one list", not "a tool call". So the react layer:
//   1. routes them out of the tool-call group via `isTaskTool`;
//   2. folds them into one current list with `reduceTaskEvents`, presented by `<TaskList>`.
//
// Authority (replay-safe): id / status transitions come from the `tool_call.complete` result sidecar,
// never parsed from the human-readable `toolCallResult` string. `parameter` supplies subject /
// activeForm / description / the target status fallback.
import { Task, TaskStatus } from '../types/task';

const TASK_TOOLS = new Set(['TaskCreate', 'TaskUpdate']);

/** Native built-in check. `true` → route out of the tool-call group, feed to `reduceTaskEvents`. */
export function isTaskTool(call: { toolsetName: string; toolName: string }): boolean {
  return call.toolsetName === '' && TASK_TOOLS.has(call.toolName);
}

/**
 * A completed task tool-call — the fields `reduceTaskEvents` needs, mirroring a completed
 * `ConversationToolCallMessage` (or the raw `tool_call.complete` fact).
 */
export interface TaskToolEvent {
  toolName: string;
  parameter: Record<string, unknown>;
  /** `toolUseResultSidecar`: `TaskCreate` → authoritative id; `TaskUpdate` → `statusChange.to`. */
  sidecar?: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Fold the `TaskCreate` / `TaskUpdate` complete-event stream into the current list (in create-arrival
 * order). Pure and replay-safe: any prefix of the same stream folds to the same snapshot.
 */
export function reduceTaskEvents(events: TaskToolEvent[]): Task[] {
  const order: string[] = [];
  const byId = new Map<string, Task>();

  for (const event of events) {
    const parameter = event.parameter ?? {};
    const sidecar = event.sidecar ?? {};

    if (event.toolName === 'TaskCreate') {
      const task = asRecord(sidecar.task);
      const id = asString(task?.id);

      if (!id) continue; // no authoritative id → skip (never guess from the result string)

      if (!byId.has(id)) order.push(id);

      byId.set(id, {
        id,
        subject: asString(parameter.subject) || asString(task?.subject) || '',
        activeForm: asString(parameter.activeForm),
        description: asString(parameter.description),
        status: byId.get(id)?.status ?? 'pending', // initial status = pending (keep existing on repeat)
      });
    } else if (event.toolName === 'TaskUpdate') {
      const statusChange = asRecord(sidecar.statusChange);
      const id = asString(parameter.taskId) || asString(sidecar.taskId);
      // sidecar authoritative, parameter.status fallback.
      const to = (asString(statusChange?.to) || asString(parameter.status)) as TaskStatus | undefined;

      if (!id || !to) continue;

      const prev = byId.get(id);

      if (prev) byId.set(id, { ...prev, status: to });
      // update arriving before its create (shouldn't happen in order) → ignore.
    }
  }

  return order.map(id => byId.get(id) as Task);
}
