import { describe, it, expect } from 'vitest';
import { isAgentTool, isSubagentChildTool, reduceSubagents, SubagentEvent } from './subagent-reducer';

// F-012 — Subagent list accumulation. `reduceSubagents` folds the Agent tool-call + `subagent.*` +
// child tool-calls into the current list, keyed by `parentToolUseId`. The critical rule: status is
// terminal only via `subagentComplete` — the async `Agent` tool-call completion (which the adapter
// never feeds as a subagentComplete) must never mark the subagent done.

describe('isAgentTool / isSubagentChildTool (F-012)', () => {
  it('isAgentTool is true only for the native Agent tool', () => {
    expect(isAgentTool({ toolsetName: '', toolName: 'Agent' })).toBe(true);
    expect(isAgentTool({ toolsetName: '', toolName: 'Read' })).toBe(false);
    expect(isAgentTool({ toolsetName: 'db', toolName: 'Agent' })).toBe(false);
  });

  it('isSubagentChildTool is true when parentToolUseId is non-empty', () => {
    expect(isSubagentChildTool('X')).toBe(true);
    expect(isSubagentChildTool('')).toBe(false);
    expect(isSubagentChildTool(undefined)).toBe(false);
  });
});

describe('reduceSubagents (F-012)', () => {
  it('agentStart ensures an entry (running) carrying the description', () => {
    const subs = reduceSubagents([{ kind: 'agentStart', toolUseId: 'X', description: '查資料' }]);
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ parentToolUseId: 'X', status: 'running', description: '查資料' });
  });

  it('subagentStart fills agentId / subagentType / description without changing status', () => {
    const subs = reduceSubagents([
      { kind: 'agentStart', toolUseId: 'X' },
      { kind: 'subagentStart', parentToolUseId: 'X', agentId: 'Y', subagentType: 'general-purpose', description: 'd' },
    ]);
    expect(subs[0]).toMatchObject({
      agentId: 'Y',
      subagentType: 'general-purpose',
      description: 'd',
      status: 'running',
    });
  });

  it('child toolStart/toolComplete fold into the subagent tool list with status', () => {
    const subs = reduceSubagents([
      { kind: 'agentStart', toolUseId: 'X' },
      {
        kind: 'toolStart',
        parentToolUseId: 'X',
        toolUseId: 't1',
        toolsetName: '',
        toolName: 'Read',
        parameter: { file_path: '/a' },
      },
      { kind: 'toolStart', parentToolUseId: 'X', toolUseId: 't2', toolsetName: 'db', toolName: 'query' },
      { kind: 'toolComplete', parentToolUseId: 'X', toolUseId: 't1' },
      { kind: 'toolComplete', parentToolUseId: 'X', toolUseId: 't2', isError: true },
    ]);
    expect(subs[0].tools.map(t => `${t.toolName}:${t.status}`)).toEqual(['Read:completed', 'query:error']);
  });

  it('subagentComplete drives the terminal status + summary', () => {
    for (const status of ['completed', 'failed', 'cancelled'] as const) {
      const subs = reduceSubagents([
        { kind: 'agentStart', toolUseId: 'X' },
        { kind: 'subagentComplete', parentToolUseId: 'X', status, summary: 's' },
      ]);
      expect(subs[0]).toMatchObject({ status, summary: 's' });
    }
  });

  it('preserves first-seen order across multiple subagents', () => {
    const subs = reduceSubagents([
      { kind: 'agentStart', toolUseId: 'A' },
      { kind: 'agentStart', toolUseId: 'B' },
      { kind: 'subagentComplete', parentToolUseId: 'B', status: 'completed' },
    ]);
    expect(subs.map(s => s.parentToolUseId)).toEqual(['A', 'B']);
  });

  // 附錄 A: the Agent tool completes early (async_launched) — never fed as subagentComplete — so the
  // subagent stays running even after all its child tools finish, until subagent.complete arrives.
  const timeline: SubagentEvent[] = [
    { kind: 'agentStart', toolUseId: 'X', description: '查詢資料庫' },
    { kind: 'subagentStart', parentToolUseId: 'X', agentId: 'Y', subagentType: 'general-purpose' },
    // (the Agent tool_call.complete with result.status="async_launched" is NOT an event here)
    {
      kind: 'toolStart',
      parentToolUseId: 'X',
      toolUseId: 't1',
      toolsetName: 'db',
      toolName: 'list_database_semantic_models',
    },
    { kind: 'toolComplete', parentToolUseId: 'X', toolUseId: 't1' },
    { kind: 'toolStart', parentToolUseId: 'X', toolUseId: 't2', toolsetName: 'db', toolName: 'execute_database_query' },
    { kind: 'toolComplete', parentToolUseId: 'X', toolUseId: 't2' },
  ];

  it('R4: stays running after child tools finish, with no subagentComplete (async-launched)', () => {
    const subs = reduceSubagents(timeline);
    expect(subs[0].status).toBe('running');
    expect(subs[0].tools).toHaveLength(2);
    expect(subs[0].tools.every(t => t.status === 'completed')).toBe(true);
  });

  it('R4: goes completed only once subagent.complete arrives', () => {
    const subs = reduceSubagents([
      ...timeline,
      { kind: 'subagentComplete', parentToolUseId: 'X', status: 'completed' },
    ]);
    expect(subs[0].status).toBe('completed');
  });

  it('R5: replay-safe — re-seeing agentStart/subagentStart never reverts a completed subagent', () => {
    const subs = reduceSubagents([
      { kind: 'agentStart', toolUseId: 'X' },
      { kind: 'subagentComplete', parentToolUseId: 'X', status: 'completed' },
      { kind: 'agentStart', toolUseId: 'X' },
      { kind: 'subagentStart', parentToolUseId: 'X', agentId: 'Y' },
    ]);
    expect(subs[0].status).toBe('completed');
  });

  it('R5: any prefix folds to a consistent snapshot', () => {
    expect(reduceSubagents([])).toEqual([]);
    expect(reduceSubagents(timeline.slice(0, 3))[0]).toMatchObject({ status: 'running' });
  });
});
