import { ReactNode, useState } from 'react';
import { Subagent, Task } from '@asgard-js/core';
import { SubagentList, TaskList } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './spinner-sync.module.scss';

// BUG-007 — spinners used to run on per-component CSS animations, each counting from its own
// element's mount, so panels that appeared at different times drifted out of phase and their arc
// gaps pointed every which way. Adding groups one click at a time is exactly that trigger: every
// group mounts seconds apart, yet all their spinners must stay in lockstep.

const RUNNING_TASKS: Task[] = [
  { id: '1', subject: 'Read the inventory sheet', status: 'completed' },
  { id: '2', subject: 'Net requirement', activeForm: 'Computing net requirement', status: 'in_progress' },
  { id: '3', subject: 'Draft the reply', status: 'pending' },
];

const RUNNING_SUBAGENTS: Subagent[] = [
  {
    parentToolUseId: 'agent-1',
    agentId: 'sa-1',
    subagentType: 'general-purpose',
    description: 'Cross-check the BOM against stock',
    status: 'running',
    tools: [
      { toolsetName: '', toolName: 'Read', parameter: { file_path: '/app/bom.md' }, status: 'completed' },
      { toolsetName: '', toolName: 'Grep', parameter: { pattern: 'flange' }, status: 'running' },
    ],
  },
];

export function SpinnerSyncRoute(): ReactNode {
  const [groups, setGroups] = useState(1);

  return (
    <DemoWrapper
      title="Spinner phase sync (BUG-007)"
      description="Each click mounts another group of panels. Every spinner on screen — however long after the others it appeared — must point its arc gap the same way."
    >
      <button type="button" className={styles.add} onClick={(): void => setGroups(n => n + 1)}>
        Add a group ({groups} on screen)
      </button>

      <div className={styles.groups}>
        {Array.from({ length: groups }, (_, index) => (
          <div key={index} className={styles.group}>
            <div className={styles.groupLabel}>group {index + 1}</div>
            <SubagentList subagents={RUNNING_SUBAGENTS} />
            <TaskList tasks={RUNNING_TASKS} />
          </div>
        ))}
      </div>
    </DemoWrapper>
  );
}
