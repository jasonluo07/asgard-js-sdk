import { Channel, Subagent, Task } from '@asgard-js/core';
import { useCallback, useSyncExternalStore } from 'react';

// F-013 — React adapters for the framework-agnostic derived-state stores on `Channel`. Each hook
// bridges the channel's slice `Observable` + snapshot accessor into `useSyncExternalStore`, so a
// component that renders the Task / Subagent list *outside* the Chatbot re-renders only when that
// slice changes (not on every high-frequency message delta). A null channel yields a stable `[]`.

const EMPTY_TASKS: Task[] = [];
const EMPTY_SUBAGENTS: Subagent[] = [];

/** Subscribe to a `Channel`'s current Task Check List (F-010 / F-013). Re-renders only on list change. */
export function useTaskList(channel: Channel | null): Task[] {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (!channel) return () => undefined;

      const subscription = channel.tasks$.subscribe(() => onStoreChange());

      return () => subscription.unsubscribe();
    },
    [channel],
  );

  const getSnapshot = useCallback((): Task[] => channel?.getTasks() ?? EMPTY_TASKS, [channel]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Subscribe to a `Channel`'s current Subagent list (F-012 / F-013). Re-renders only on list change. */
export function useSubagents(channel: Channel | null): Subagent[] {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (!channel) return () => undefined;

      const subscription = channel.subagents$.subscribe(() => onStoreChange());

      return () => subscription.unsubscribe();
    },
    [channel],
  );

  const getSnapshot = useCallback((): Subagent[] => channel?.getSubagents() ?? EMPTY_SUBAGENTS, [channel]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
