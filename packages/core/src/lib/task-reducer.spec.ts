import { describe, it, expect } from 'vitest';
import { isTaskTool, reduceTaskEvents, TaskToolEvent } from './task-reducer';

// F-010 — Task Check List accumulation. `reduceTaskEvents` is a pure, replay-safe fold: id / status
// come from the `tool_call.complete` sidecar (never the result string); any prefix folds to the same
// snapshot. `isTaskTool` routes native TaskCreate / TaskUpdate out of the tool-call group.

function create(id: string, params: Record<string, unknown>): TaskToolEvent {
  return { toolName: 'TaskCreate', parameter: params, sidecar: { task: { id } } };
}

function update(id: string, to: string, opts?: { viaParameter?: boolean }): TaskToolEvent {
  return opts?.viaParameter
    ? { toolName: 'TaskUpdate', parameter: { taskId: id, status: to } } // no sidecar → parameter fallback
    : { toolName: 'TaskUpdate', parameter: { taskId: id }, sidecar: { statusChange: { to } } };
}

describe('isTaskTool (F-010)', () => {
  it('is true only for native TaskCreate / TaskUpdate (toolsetName === "")', () => {
    expect(isTaskTool({ toolsetName: '', toolName: 'TaskCreate' })).toBe(true);
    expect(isTaskTool({ toolsetName: '', toolName: 'TaskUpdate' })).toBe(true);
  });

  it('is false for non-task native tools and any platform / general tool', () => {
    expect(isTaskTool({ toolsetName: '', toolName: 'Read' })).toBe(false);
    expect(isTaskTool({ toolsetName: '', toolName: 'Bash' })).toBe(false);
    // A platform DB tool literally named TaskCreate must not be mistaken for the native list tool.
    expect(isTaskTool({ toolsetName: 'db', toolName: 'TaskCreate' })).toBe(false);
  });
});

describe('reduceTaskEvents (F-010)', () => {
  it('TaskCreate starts a task as pending, taking subject/activeForm/description from parameter', () => {
    const tasks = reduceTaskEvents([
      create('1', { subject: '查詢庫存', activeForm: '查詢庫存中', description: '細節' }),
    ]);
    expect(tasks).toEqual([
      { id: '1', subject: '查詢庫存', activeForm: '查詢庫存中', description: '細節', status: 'pending' },
    ]);
  });

  it('TaskUpdate moves status via the authoritative sidecar.statusChange.to', () => {
    const tasks = reduceTaskEvents([create('1', { subject: 'a' }), update('1', 'in_progress')]);
    expect(tasks[0].status).toBe('in_progress');
  });

  it('falls back to parameter.status when the sidecar has no statusChange', () => {
    const tasks = reduceTaskEvents([create('1', { subject: 'a' }), update('1', 'completed', { viaParameter: true })]);
    expect(tasks[0].status).toBe('completed');
  });

  it('skips a TaskCreate with no authoritative sidecar id (never guesses)', () => {
    const tasks = reduceTaskEvents([{ toolName: 'TaskCreate', parameter: { subject: 'a' } }]);
    expect(tasks).toEqual([]);
  });

  it('ignores a TaskUpdate that arrives before its TaskCreate', () => {
    const tasks = reduceTaskEvents([update('1', 'completed'), create('1', { subject: 'a' })]);
    expect(tasks).toEqual([
      { id: '1', subject: 'a', activeForm: undefined, description: undefined, status: 'pending' },
    ]);
  });

  it('preserves create-arrival order regardless of update order', () => {
    const tasks = reduceTaskEvents([
      create('1', { subject: 'first' }),
      create('2', { subject: 'second' }),
      update('2', 'in_progress'),
      update('1', 'in_progress'),
    ]);
    expect(tasks.map(t => t.id)).toEqual(['1', '2']);
  });

  it('keeps the existing status when the same id is re-created (create is idempotent on status)', () => {
    const tasks = reduceTaskEvents([
      create('1', { subject: 'a' }),
      update('1', 'in_progress'),
      create('1', { subject: 'a-renamed' }),
    ]);
    expect(tasks[0]).toMatchObject({ subject: 'a-renamed', status: 'in_progress' });
  });

  // 附錄 A: the new-example8 9-event stream → all three completed; every prefix folds correctly.
  const stream: TaskToolEvent[] = [
    create('1', { subject: '查詢 Bolzen 用料需求' }),
    update('1', 'in_progress'),
    create('2', { subject: '查詢 SWRCH35K 庫存' }),
    update('1', 'completed'),
    update('2', 'in_progress'),
    create('3', { subject: '計算短缺量' }),
    update('2', 'completed'),
    update('3', 'in_progress'),
    update('3', 'completed'),
  ];

  it('replay-safe: the full stream folds to three completed tasks in create order', () => {
    const tasks = reduceTaskEvents(stream);
    expect(tasks.map(t => `${t.id}:${t.status}`)).toEqual(['1:completed', '2:completed', '3:completed']);
  });

  it('replay-safe: the prefix after event 6 is a valid mid-run snapshot (1 completed, 1 in_progress, 1 pending)', () => {
    const tasks = reduceTaskEvents(stream.slice(0, 6));
    expect(tasks.map(t => `${t.id}:${t.status}`)).toEqual(['1:completed', '2:in_progress', '3:pending']);
  });

  it('replay-safe: an empty prefix folds to an empty list', () => {
    expect(reduceTaskEvents([])).toEqual([]);
  });

  it('unknown status is preserved as-is (never crashes; enum pending EXT-002)', () => {
    const tasks = reduceTaskEvents([create('1', { subject: 'a' }), update('1', 'cancelled')]);
    expect(tasks[0].status).toBe('cancelled');
  });
});
