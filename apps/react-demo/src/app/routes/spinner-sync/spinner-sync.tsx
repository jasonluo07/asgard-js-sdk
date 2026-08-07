import { ReactNode, useState } from 'react';
import { Subagent, Task } from '@asgard-js/core';
import { SubagentList, TaskList } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './spinner-sync.module.scss';

// BUG-007 — spinners used to run on per-component CSS animations, each counting from its own
// element's mount, so rows that appeared at different times drifted out of phase and their arc gaps
// pointed every which way. The reported case was a research run fanning out to dozens of subagents:
// they start in waves, so a tall list ends up with a different phase on every row and the whole
// panel reads as something wriggling.
//
// Two triggers are reproduced here, both of which mount spinners at different moments:
//   - a wave of subagents appended to a list that is already running (SubagentList keys on
//     `parentToolUseId`, so existing rows are not remounted — only the new ones are)
//   - whole panel groups added later, each with its own SubagentList + TaskList

const WORK = [
  'Search angle: platform governance disputes',
  'Search angle: regulator filings and enforcement',
  'Search angle: funding round controversies',
  'Search angle: board-level disagreements',
  'Verify: accounting restatement claim',
  'Verify: deferred prosecution claim',
  'Verify: copyright verdict claim',
  'Verify: fundraising misconduct claim',
  '驗證目標：投資統計報告數字',
  '驗證目標：最高法院判決要旨',
  '交叉比對：公開年報與新聞稿',
  '交叉比對：主管機關裁罰紀錄',
];

const CHILD_TOOLS: Subagent['tools'] = [
  { toolsetName: '', toolName: 'WebSearch', parameter: { query: 'governance' }, status: 'completed' },
  { toolsetName: '', toolName: 'WebFetch', parameter: { url: 'https://example.com/filing' }, status: 'running' },
];

/**
 * One wave of subagents, all still running — `seq` keeps ids unique across waves.
 *
 * Only the first of each wave carries a running child tool: that second line covers the tool glyph
 * (a separate spinner call site) while keeping the list as compact as a real fan-out looks.
 */
function wave(seq: number, size: number): Subagent[] {
  return Array.from({ length: size }, (_, i) => ({
    parentToolUseId: `agent-${seq}-${i}`,
    agentId: `sa-${seq}-${i}`,
    subagentType: 'general-purpose',
    description: WORK[(seq * size + i) % WORK.length],
    status: 'running' as const,
    tools: i === 0 ? CHILD_TOOLS : [],
  }));
}

const RUNNING_TASKS: Task[] = [
  { id: '1', subject: 'Read the inventory sheet', status: 'completed' },
  { id: '2', subject: 'Net requirement', activeForm: 'Computing net requirement', status: 'in_progress' },
  { id: '3', subject: 'Draft the reply', status: 'pending' },
];

const WAVE_SIZE = 6;

export function SpinnerSyncRoute(): ReactNode {
  const [subagents, setSubagents] = useState<Subagent[]>(() => wave(0, WAVE_SIZE));
  const [groups, setGroups] = useState(1);

  const addWave = (): void => setSubagents(prev => [...prev, ...wave(prev.length / WAVE_SIZE, WAVE_SIZE)]);

  return (
    <DemoWrapper
      title="Spinner phase sync (BUG-007)"
      description="Subagents arrive in waves and whole panels appear later. Every spinner on screen — however long after the others it showed up — must point its arc gap the same way."
    >
      <div className={styles.controls}>
        <button type="button" className={styles.add} onClick={addWave}>
          再啟動 {WAVE_SIZE} 個子代理（目前 {subagents.length}）
        </button>
        <button type="button" className={styles.add} onClick={(): void => setGroups(n => n + 1)}>
          再開一組面板（目前 {groups}）
        </button>
      </div>

      <div className={styles.groups}>
        {Array.from({ length: groups }, (_, index) => (
          <div key={index} className={styles.group}>
            <div className={styles.groupLabel}>group {index + 1}</div>
            <SubagentList subagents={subagents} />
            <TaskList tasks={RUNNING_TASKS} />
          </div>
        ))}
      </div>
    </DemoWrapper>
  );
}
