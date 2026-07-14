// Task Check List types (F-010). `TaskCreate` / `TaskUpdate` native tool-calls are accumulated into
// one current list by `reduceTaskEvents` (see `lib/task-reducer.ts`). This is run-level live state
// (like the running indicator), not a message block. Framework-agnostic — no React / DOM.

/**
 * Observed task states. The backend has only emitted these three; an unknown status must be preserved
 * as-is and rendered neutrally, never crash (full enum pending backend confirmation — EXT-002).
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

/**
 * One item of the Task Check List, folded from the `TaskCreate` / `TaskUpdate` event stream.
 * Not a message block — presented by the docked `<TaskList>` panel (run-level chrome).
 */
export interface Task {
  /** Backend-assigned authoritative id (from `TaskCreate`'s `sidecar.task.id`). */
  id: string;
  /** Noun-form title (`TaskCreate.subject`); shown when not `in_progress`. */
  subject: string;
  /** Present-continuous label (`TaskCreate.activeForm`); preferred while `in_progress`. */
  activeForm?: string;
  /** Full detail (`TaskCreate.description`); shown when the row is expanded. */
  description?: string;
  status: TaskStatus;
}
