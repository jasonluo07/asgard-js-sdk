# Derived-state stores — rendering the Task / Subagent lists outside the Chatbot (F-013)

The SDK synthesizes two **derived states** from the conversation stream:

- **Task Check List** — accumulated from `TaskCreate` / `TaskUpdate` (F-010).
- **Subagent list** — accumulated from the `Agent` tool-call + `subagent.{start,complete}` + child tool-calls (F-012).

By default these render inside the `<Chatbot>` (docked above the input). If you want to render them **elsewhere in your own UI** — a sidebar, a header, a separate panel — the SDK exposes them as a **framework-agnostic reactive store**.

## Why a store, not a delta event

The contract is **"current immutable snapshot + change notification"**, not a fire-and-forget `taskListChanged` event. A store means:

- A **late subscriber** immediately gets the full current list (no need to replay past events).
- **Accumulation stays in the SDK** — you never re-implement the reducer or handle a dropped delta.
- The value is **immutable** and only changes identity when the list actually changes.

## The contract (on `Channel`)

```ts
channel.tasks$: Observable<Task[]>;          // emits only when the Task list changes
channel.subagents$: Observable<Subagent[]>;  // emits only when the Subagent list changes
channel.getTasks(): Task[];                   // current snapshot
channel.getSubagents(): Subagent[];           // current snapshot
```

The slices are `BehaviorSubject`s piped through `distinctUntilChanged` on structural equality. **This is the key performance property**: `conversation` changes on every streaming message delta (high frequency), but `tasks$` / `subagents$` emit **only when that slice actually changes** — so a component that just draws the list is not re-rendered on every delta.

The whole snapshot is also on `ChannelStates` (`{ isConnecting, conversation, tasks, subagents }`) for consumers that already use `statesObserver`; but prefer the per-slice stores if you only care about one list, to avoid re-rendering on unrelated `conversation` updates.

## React

```tsx
import { useTaskList, useSubagents } from '@asgard-js/react';

function TaskSidebar({ channel }: { channel: Channel | null }) {
  const tasks = useTaskList(channel); // re-renders only when tasks change
  const subagents = useSubagents(channel); // re-renders only when subagents change

  if (tasks.length === 0) return null;
  return (
    <ul>
      {tasks.map(t => (
        <li key={t.id}>{t.subject}</li>
      ))}
    </ul>
  );
}
```

Both hooks are `useSyncExternalStore(subscribe, getSnapshot)` under the hood; a `null` channel yields a stable `[]`.

## Vue 3

```ts
import { shallowRef, onMounted, onUnmounted } from 'vue';

const tasks = shallowRef(channel.getTasks());
let sub;
onMounted(() => {
  sub = channel.tasks$.subscribe(v => (tasks.value = v));
});
onUnmounted(() => sub?.unsubscribe());
```

## Svelte

The RxJS `Observable` is already a valid Svelte store contract (`{ subscribe }`), so auto-subscription works directly:

```svelte
<script>
  export let channel;
  $: tasks$ = channel.tasks$;
</script>

{#each $tasks$ as task (task.id)}
  <li>{task.subject}</li>
{/each}
```

## Angular / RxJS

```ts
tasks$ = this.channel.tasks$; // in the template: *ngFor="let t of tasks$ | async"
```

## Vanilla / Redux / Zustand

```ts
const unsubscribe = channel.tasks$.subscribe(tasks => {
  // e.g. store.setState({ tasks }) or render(tasks)
});
// later: unsubscribe();
```

## Getting the `Channel`

The stores live on the `Channel` instance. Obtain it however you manage the channel — e.g. via the `<Chatbot>` imperative ref, or by creating and owning a `Channel` yourself (`Channel.create(...)`). The channel is torn down (and its store subscriptions cleaned up) by `channel.close()`.
