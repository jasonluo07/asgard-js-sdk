# BUILD-037 Rebuild the service client when a StrictMode remount disposes it

## Meta

- Task ID: `BUILD-037`
- Status: `done`
- Issue: `https://github.com/asgard-ai-platform/asgard-sdk-pm/issues/48`
- Complexity: `S`
- Branch: `fix/48-strictmode-client-detach`

---

## Brief

`useAsgardServiceClient` builds the client during **render** but disposes it in the **unmount cleanup**,
which also clears the ref — and nothing ever builds it back:

```ts
if (!clientRef.current && !isPreviewMode) {
  clientRef.current = new AsgardServiceClient(config);   // render
}
useEffect(() => {
  return () => {
    keepConnectionOnUnmountRef.current ? clientRef.current.detach(...) : clientRef.current.close();
    clientRef.current = null;
  };
}, []);                                                   // setup restores nothing
```

React runs `setup → cleanup → setup` on the same element — StrictMode does it on every dev mount, and
any remount reusing the hook instance does it too. After the cleanup, the second setup leaves the ref
null while the consumer still holds the **disposed** instance returned by the earlier render.

The consequence is severe and completely silent, because `AsgardServiceClient.runSse`
(`packages/core/src/lib/client.ts:288-301`) guards on `detached`:

```ts
next: r => { if (this.detached) return; ... }              // every frame dropped
complete: () => { if (!this.detached) onSseCompleted?.() } // settleRun() never runs
```

So a rejoin replays the entire transcript into a client that throws it away, and the run never
settles. That is **one** defect producing **both** reported symptoms — blank conversation _and_ a
permanently disabled composer — with nothing logged to the console.

**Why only long transcripts:** `runSse` pipes frames through `concatMap + delay(50)`. A 20-event
replay takes ~1000 ms to drain and reliably straddles the StrictMode unmount; a 6-event one drains in
~300 ms and slips through. That timing dependence is why the bug reads as intermittent, and why a
small test channel shows nothing wrong.

**Already exists:** `use-channel.spec.ts` (the `renderHook` + jsdom pattern to mirror),
`@testing-library/react` with `StrictMode` as a wrapper.

---

## Coverage

| File                                                         | Change                                                                                                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/react/src/hooks/use-asgard-service-client.ts`      | Effect setup rebuilds the client when the cleanup disposed it; the instance is held in state so a rebuild re-renders consumers; listener effects key off `client` |
| `packages/react/src/hooks/use-asgard-service-client.spec.ts` | New spec: 3 cases under a `StrictMode` wrapper                                                                                                                    |

React package only — no core change, no public API change, no new type.

---

## Requirements

| R#  | Condition                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------- |
| R1  | After a StrictMode remount the hook never returns an instance it disposed                                |
| R2  | The hook still returns a client at all after the remount (rebuilding must not degrade into `null`)       |
| R3  | Preview mode (`botProviderEndpoint: 'skip'`) still creates no client                                     |
| R4  | Listener registrations follow the live instance, so callbacks are not left attached to a disposed client |
| R5  | Re-registration cannot double-fire a callback (a rebuilt instance carries its own empty emitter)         |

---

## Implementation Tasks

- [x] T1 Reproduce against the real product and isolate the variable (StrictMode on/off, same channel, same version)
- [x] T2 Write the failing test first (`disposed.has(client)` was `true` before the fix)
- [x] T3 Rebuild in effect setup; hold the instance in state; key listener effects off `client`
- [x] T4 Static checks + full test suite
- [x] T5 End-to-end verification in Mimir against the real dev backend, with StrictMode **on**

---

## Execution Log / Change Log

- 2026-08-03: Implemented. `npx tsc --build` clean (exit 0); `npm run format:check` clean;
  `npm run test:packages` green — core 165, react 61 (3 new; the R1 case failed before the fix with
  `expected true to be false`).
  - `npm run typecheck:packages` / `lint:packages` hit the Nx Cloud `401 … not connected` error in this
    environment; ran `tsc --build` and `nx lint core --skip-nx-cache` directly instead. Note that the
    lint/format failures seen first time round came from `packages/*/out-tsc` — `tsc --build` artifacts
    that prettier and eslint are not configured to ignore. Unrelated pre-existing wrinkle, left alone.
- End-to-end (Mimir on `localhost:8342`, real dev backend, channel `2082709251955888128` — 20 events
  including `tool_call.complete`, matching the shape reported on the issue):
  - **Before** (published `0.3.36`, StrictMode on): conversation blank; with real typed text the Send
    button stayed `disabled: true`.
  - **Control** (same `0.3.36`, StrictMode **off** via a temporary `next.config.ts` edit, since
    reverted): transcript rendered and Send became `disabled: false` — isolating StrictMode as the
    single variable.
  - **After** (`0.3.39-local` packed from this branch, StrictMode back **on**): transcript renders in
    full including 3 tool-call groups, and Send is `disabled: false`. Mimir's `node_modules` was
    restored to the published build afterwards.
  - Screenshots: `.github/screenshots/48-before-strictmode-blank-transcript.jpg`,
    `.github/screenshots/48-after-strictmode-transcript-restored.jpg`

### Leads ruled out (recorded so they are not re-investigated)

BUILD-036's scope note left `run.init` arriving second-to-last as the open lead, and the issue thread
argued the backend held the rejoin connection open. Both are wrong, and each was closed with evidence:

- **Backend does not hold the connection.** `asgard-core` closes GET `/message/sse` on the run
  terminal (`channel_sse.go` passes `stopOnTerminal=true`; commit `0ef4ed2b`, 2026-07-09). The Go SDK
  streamer cancels on a terminal without reconnecting (`streamer.go:290-292`), so
  `RejoinMessageV3`'s relay ends too. Measured against dev: `response.text()` resolved at ~350 ms
  (`closedBy: "eof"`) on three channels. A `channel.ts` patch built on the opposite assumption was
  written and discarded.
- **Not the SSE wire.** Raw bytes are well-formed (`id:` / `event:` / `data:`), every `data:` line
  parses as JSON, and no `content-encoding` is set.
- **Not `run.init` ordering, and not the composer being a controlled input.** With the fix in place the
  same frame order renders fine. (The issue's "setting `.value` didn't help" observation is genuinely
  inconclusive — that bypasses React's `onChange` — but real typed input confirmed the symptom was
  nonetheless real.)

### Scope note

Mimir is still on **`0.3.36`** and therefore does not yet have BUILD-036 either. Both fixes land for it
only once it upgrades — track that separately from this task.
