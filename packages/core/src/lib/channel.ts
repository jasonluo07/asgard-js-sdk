import { BehaviorSubject, combineLatest, distinctUntilChanged, map, Observable, Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  ChannelConfig,
  ChannelStates,
  FetchSseOptions,
  FetchSsePayload,
  IAsgardServiceClient,
  LaunchedSandbox,
  ObserverOrNext,
  SandboxPhase,
  Subagent,
  SseResponse,
  Task,
  ToolCallConsentAnswer,
} from '../types';
import { FetchSseAction, EventType } from '../constants/enum';
import Conversation from './conversation';
import { createDerivedStores, DerivedStores } from './derived-stores';
import { reconcileLaunched } from './launched-sandboxes';

export default class Channel {
  private client: IAsgardServiceClient;

  public customChannelId: string;
  public customMessageId?: string;

  private isConnecting$: BehaviorSubject<boolean>;
  private conversation$: BehaviorSubject<Conversation>;
  private channelTitleSubject: BehaviorSubject<string | null>;
  private sandboxPhaseSubject: BehaviorSubject<SandboxPhase>;
  private launchedSandboxesSubject: BehaviorSubject<LaunchedSandbox[]>;
  // Sandboxes hinted live by an `asgard.sandbox.launch` frame but not yet confirmed by metadata (F-019).
  // Never merged into the live list directly — cleared once metadata confirms (or held until it does).
  private pendingLaunches: string[] = [];
  private derivedStores: DerivedStores;
  private statesObserver?: ObserverOrNext<ChannelStates>;
  private statesSubscription?: Subscription;

  /** Reactive Task Check List store (F-013): emits only when the list changes; replays the snapshot. */
  public readonly tasks$: Observable<Task[]>;
  /** Reactive Subagent list store (F-013): emits only when the list changes; replays the snapshot. */
  public readonly subagents$: Observable<Subagent[]>;
  /** Reactive channel title store (F-016): seeded from metadata, updated by `title.update`; replay-safe. */
  public readonly channelTitle$: Observable<string | null>;
  /** Reactive sandbox cold-start phase store (F-018): per-slice, derived from the last sandbox event; replay-safe. */
  public readonly sandboxPhase$: Observable<SandboxPhase>;
  /** Reactive live-sandbox list store (F-019): authoritative from `/channel/metadata`, per-slice; replay-safe. */
  public readonly launchedSandboxes$: Observable<LaunchedSandbox[]>;
  private currentUserMessageId?: string;
  // The most-recently-sent user message id. Unlike currentUserMessageId (which
  // is cleared once a traceId is attached), this is kept across the SSE
  // lifecycle so RESPONSE_TOOL_CALL_CONSENT — fired after run.done — can echo
  // back the message id the bot is waiting on.
  private lastSentMessageId?: string;
  // The in-flight SSE run's subscription. Held so a user-initiated stop-generation can abort the
  // connection (unsubscribe → create-sse-observable teardown → AbortController.abort()). Cleared on
  // every terminal (complete / error) and on stop.
  private currentRun?: Subscription;

  private constructor(config: ChannelConfig) {
    if (!config.client) {
      throw new Error('client must be required');
    }

    if (!config.customChannelId) {
      throw new Error('customChannelId must be required');
    }

    this.client = config.client;
    this.customChannelId = config.customChannelId;
    this.customMessageId = config.customMessageId;

    this.isConnecting$ = new BehaviorSubject(false);
    this.conversation$ = new BehaviorSubject(config.conversation);
    this.channelTitleSubject = new BehaviorSubject<string | null>(config.channelTitle ?? null);
    this.sandboxPhaseSubject = new BehaviorSubject<SandboxPhase>('idle');
    this.launchedSandboxesSubject = new BehaviorSubject<LaunchedSandbox[]>(
      reconcileLaunched(config.launchedSandboxes ?? []),
    );
    this.derivedStores = createDerivedStores(this.conversation$);
    this.tasks$ = this.derivedStores.tasks$;
    this.subagents$ = this.derivedStores.subagents$;
    // Emit only when the title actually changes (ignore duplicate `title.update`s with the same value).
    this.channelTitle$ = this.channelTitleSubject.pipe(distinctUntilChanged());
    // Per-slice: emit only when the phase actually changes, so unrelated high-frequency message
    // deltas never re-notify the HUD (UC-031, same performance rule as the F-013 derived stores).
    this.sandboxPhase$ = this.sandboxPhaseSubject.pipe(distinctUntilChanged());
    // Per-slice: only `applyLaunchedSandboxes` / `dropSandbox` push here (never the conversation stream),
    // so high-frequency message deltas never re-emit the live-sandbox list (UC-032 ALT2).
    this.launchedSandboxes$ = this.launchedSandboxesSubject.pipe(distinctUntilChanged());
    this.statesObserver = config.statesObserver;
  }

  /** Current Task Check List snapshot (F-013) — for framework-agnostic `getSnapshot()` bridging. */
  public getTasks(): Task[] {
    return this.derivedStores.getTasks();
  }

  /** Current Subagent list snapshot (F-013) — for framework-agnostic `getSnapshot()` bridging. */
  public getSubagents(): Subagent[] {
    return this.derivedStores.getSubagents();
  }

  /** Current channel title snapshot (F-016) — for framework-agnostic `getSnapshot()` bridging. */
  public getChannelTitle(): string | null {
    return this.channelTitleSubject.value;
  }

  /** Current sandbox phase snapshot (F-018) — for framework-agnostic `getSnapshot()` bridging. */
  public getSandboxPhase(): SandboxPhase {
    return this.sandboxPhaseSubject.value;
  }

  /** Current live-sandbox snapshot (F-019) — for framework-agnostic `getSnapshot()` bridging. */
  public getLaunchedSandboxes(): LaunchedSandbox[] {
    return this.launchedSandboxesSubject.value;
  }

  /** Names hinted by `sandbox.launch` but not yet confirmed live by metadata (F-019) — "starting" placeholders. */
  public getPendingLaunches(): string[] {
    return this.pendingLaunches;
  }

  /**
   * Authoritatively replace the live-sandbox list from a fresh `/channel/metadata` snapshot (F-019). This
   * is the only sanctioned way to change "who is live": it reconciles the list and clears any pending
   * launch whose name now appears (promoted to live). metadata (heartbeat-backed) is the sole authority.
   */
  public applyLaunchedSandboxes(list: readonly LaunchedSandbox[]): void {
    const next = reconcileLaunched(list);
    this.pendingLaunches = this.pendingLaunches.filter(name => !next.some(sandbox => sandbox.sandboxName === name));
    this.launchedSandboxesSubject.next(next);
  }

  /**
   * Optimistically drop one sandbox (F-019) — e.g. its fs calls keep failing or it is known to be
   * recycled. The next `/channel/metadata` refetch reconciles the authoritative truth.
   */
  public dropSandbox(sandboxName: string): void {
    const current = this.launchedSandboxesSubject.value;
    const next = current.filter(sandbox => sandbox.sandboxName !== sandboxName);
    if (next.length !== current.length) this.launchedSandboxesSubject.next(next);
  }

  /**
   * Record an `asgard.sandbox.launch` hint (F-019): the event is not trusted to add a live sandbox (it may
   * not be Ready / heartbeat-visible yet), so the name is held as pending and a metadata refetch is
   * scheduled. `applyLaunchedSandboxes` promotes it to live once metadata confirms.
   */
  public noteSandboxLaunch(sandboxName: string): void {
    if (!this.pendingLaunches.includes(sandboxName)) {
      this.pendingLaunches = [...this.pendingLaunches, sandboxName];
    }

    void this.refetchMetadata();
  }

  /**
   * Re-fetch `/channel/metadata` and authoritatively apply its `launchedSandboxes` (F-019). Called on a
   * launch hint, and by the react adapter on `visibilitychange` / polling. A client without metadata
   * support is a no-op.
   */
  public async refetchMetadata(): Promise<void> {
    if (!this.client.channelMetadata) return;

    const metadata = await this.client.channelMetadata(this.customChannelId);
    if (metadata) this.applyLaunchedSandboxes(metadata.launchedSandboxes);
  }

  /** Seed / override the channel title (F-016) — used by the join-restore metadata seed (F-015). */
  public setChannelTitle(title: string | null): void {
    this.channelTitleSubject.next(title);
  }

  public static create(config: ChannelConfig): Channel {
    const channel = new Channel(config);
    channel.subscribe();

    return channel;
  }

  public static async reset(
    config: ChannelConfig,
    payload?: Pick<FetchSsePayload, 'text' | 'payload'>,
    options?: FetchSseOptions,
    onChannelCreated?: (channel: Channel) => void,
  ): Promise<Channel> {
    const channel = new Channel(config);

    try {
      channel.subscribe();

      // Expose the channel before the RESET_CHANNEL run finishes. The backend
      // can emit a tool_call.consent *during* this run (before run.done), so a
      // reply submitted while the modal is up must reach a non-null channel —
      // otherwise the consent answer is silently dropped.
      onChannelCreated?.(channel);

      await channel.resetChannel(payload, options);

      return channel;
    } catch (error) {
      channel.close();

      throw error;
    }
  }

  /**
   * Join an **existing** channel without resetting it (F-015). Seeds the title from `config.channelTitle`
   * (the `GET /channel/metadata` value) at construction, then replays the server transcript via GET
   * `rejoinSse` and holds `isConnecting` until the run reaches a terminal. Never sends `RESET_CHANNEL`,
   * so the channel's history / session / title are preserved — this is the fix for the mount-time
   * "join an existing channel and wipe its history" data-loss bug.
   */
  public static async restore(
    config: ChannelConfig,
    options?: FetchSseOptions,
    onChannelCreated?: (channel: Channel) => void,
  ): Promise<Channel> {
    const channel = new Channel(config);

    try {
      channel.subscribe();

      // Adopt the channel before the replay finishes — a RUNNING restore can stream a tool_call.consent
      // before its terminal, and a reply submitted then must reach a non-null channel (same rationale as
      // reset).
      onChannelCreated?.(channel);

      await channel.rejoinChannel(options);

      return channel;
    } catch (error) {
      channel.close();

      throw error;
    }
  }

  private subscribe(): void {
    this.statesSubscription = combineLatest([
      this.isConnecting$,
      this.conversation$,
      this.derivedStores.tasks$,
      this.derivedStores.subagents$,
      this.channelTitle$,
      this.sandboxPhase$,
      this.launchedSandboxes$,
    ])
      .pipe(
        map(([isConnecting, conversation, tasks, subagents, channelTitle, sandboxPhase, launchedSandboxes]) => ({
          isConnecting,
          conversation,
          tasks,
          subagents,
          channelTitle,
          sandboxPhase,
          launchedSandboxes,
        })),
      )
      .subscribe(this.statesObserver);
  }

  /**
   * Resolves payload by executing it if it's a function, otherwise returns as-is.
   */
  private resolvePayload(
    payload: Record<string, unknown> | (() => Record<string, unknown>) | undefined,
  ): Record<string, unknown> | undefined {
    if (typeof payload === 'function') {
      try {
        return payload();
      } catch (error) {
        throw new Error(
          `Failed to resolve payload function: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return payload;
  }

  /**
   * Advance the sandbox phase store from an incoming event's type (F-018). Only sandbox / run-boundary
   * events move it; every other event is a no-op, so `distinctUntilChanged` suppresses re-emission on
   * high-frequency message deltas.
   */
  private updateSandboxPhase(eventType: EventType): void {
    switch (eventType) {
      case EventType.SANDBOX_LAUNCH:
        this.sandboxPhaseSubject.next('launching');

        break;
      case EventType.SANDBOX_READY:
        this.sandboxPhaseSubject.next('ready');

        break;
      case EventType.INIT:
      case EventType.ERROR:
        this.sandboxPhaseSubject.next('idle');

        break;
      default:
        break;
    }
  }

  /**
   * The SSE run handlers shared by every run kind (POST send/reset and GET rejoin): fold each frame
   * through the conversation reducer, keep the title store in sync, attach the traceId to the pending
   * user bubble, and settle the run promise (releasing `isConnecting`) on completion / error.
   */
  private buildRunHandlers(
    options: FetchSseOptions | undefined,
    resolve: () => void,
    reject: (err: unknown) => void,
  ): FetchSseOptions {
    return {
      onSseStart: options?.onSseStart,
      onSseMessage: (response: SseResponse<EventType>): void => {
        options?.onSseMessage?.(response);

        // F-016 — the channel title is run-level state, not a message; keep it out of the conversation
        // (it is ephemeral and must survive rejoin replays, which don't carry this event).
        if (response.eventType === EventType.CHANNEL_TITLE_UPDATE) {
          this.channelTitleSubject.next(
            (response as SseResponse<EventType.CHANNEL_TITLE_UPDATE>).fact.channelTitleUpdate.title,
          );
        }

        // F-018 — sandbox cold-start phase, derived from the last sandbox event. Run-level (not a
        // conversation message); folds identically on live and on rejoin replay (replay-safe). Reset to
        // idle on run init (fresh run re-arms) and error (collapse); `done` is left to the react latch so
        // the ready-beat / fade-out can finish (happy path: `done` arrives after `ready`).
        this.updateSandboxPhase(response.eventType);

        // F-019 — a `sandbox.launch` frame is only a hint: record the name as pending and schedule a
        // metadata refetch (the authority on "who is live"). Never merge it into the live list directly.
        if (response.eventType === EventType.SANDBOX_LAUNCH) {
          this.noteSandboxLaunch((response as SseResponse<EventType.SANDBOX_LAUNCH>).fact.sandboxLaunch.sandboxName);
        }

        if (this.currentUserMessageId && response.traceId) {
          const messages = new Map(this.conversation$.value.messages);
          const userMessage = messages.get(this.currentUserMessageId);

          if (userMessage && userMessage.type === 'user') {
            messages.set(this.currentUserMessageId, {
              ...userMessage,
              traceId: response.traceId,
            });
            this.conversation$.next(new Conversation({ messages }));
          }

          this.currentUserMessageId = undefined;
        }

        this.conversation$.next(this.conversation$.value.onMessage(response));
      },
      onSseError: (err: unknown): void => {
        options?.onSseError?.(err);
        this.isConnecting$.next(false);
        this.currentUserMessageId = undefined;
        this.currentRun = undefined;
        reject(err);
      },
      onSseCompleted: (): void => {
        options?.onSseCompleted?.();
        this.isConnecting$.next(false);
        this.currentUserMessageId = undefined;
        this.currentRun = undefined;
        resolve();
      },
    };
  }

  private fetchSse(payload: FetchSsePayload, options?: FetchSseOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isConnecting$.next(true);
      this.currentRun = this.client.fetchSse(payload, this.buildRunHandlers(options, resolve, reject));
    });
  }

  /**
   * Join-restore transport (F-015): replay the server transcript via GET `rejoinSse` (F-014) and, if a
   * run is still live, keep listening until its terminal — holding `isConnecting` the whole time so the
   * input stays gated (F-003). A client without GET-replay support settles immediately (nothing to
   * restore), so the input is released rather than stuck.
   */
  private rejoinChannel(options?: FetchSseOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client.rejoinSse) {
        resolve();

        return;
      }

      this.isConnecting$.next(true);
      this.currentRun = this.client.rejoinSse(this.customChannelId, this.buildRunHandlers(options, resolve, reject));
    });
  }

  private resetChannel(payload?: Pick<FetchSsePayload, 'text' | 'payload'>, options?: FetchSseOptions): Promise<void> {
    return this.fetchSse(
      {
        action: FetchSseAction.RESET_CHANNEL,
        customChannelId: this.customChannelId,
        customMessageId: this.customMessageId,
        text: payload?.text || '',
        payload: this.resolvePayload(payload?.payload),
      },
      options,
    );
  }

  public sendMessage(
    payload: Pick<FetchSsePayload, 'customMessageId' | 'text' | 'payload' | 'blobIds'> & {
      filePreviewUrls?: string[];
      documentNames?: string[];
    },
    options?: FetchSseOptions,
  ): Promise<void> {
    const text = payload.text.trim();
    const messageId = payload.customMessageId ?? uuidv4();

    this.currentUserMessageId = messageId;
    this.lastSentMessageId = messageId;

    this.conversation$.next(
      this.conversation$.value.pushMessage({
        type: 'user',
        messageId,
        text,
        blobIds: payload.blobIds,
        filePreviewUrls: payload.filePreviewUrls,
        documentNames: payload.documentNames,
        time: new Date(),
      }),
    );

    return this.fetchSse(
      {
        action: FetchSseAction.NONE,
        customChannelId: this.customChannelId,
        customMessageId: messageId,
        payload: this.resolvePayload(payload?.payload),
        text,
        blobIds: payload?.blobIds,
      },
      options,
    );
  }

  public replyToolCallConsents(
    toolCallConsents: ToolCallConsentAnswer[],
    options?: FetchSseOptions,
    payload?: FetchSsePayload['payload'],
  ): Promise<void> {
    this.conversation$.next(this.conversation$.value.clearPendingConsent());

    return this.fetchSse(
      {
        action: FetchSseAction.RESPONSE_TOOL_CALL_CONSENT,
        customChannelId: this.customChannelId,
        customMessageId: this.lastSentMessageId ?? this.customMessageId,
        payload: this.resolvePayload(payload),
        text: '',
        toolCallConsents,
      },
      options,
    );
  }

  /**
   * User-initiated stop-generation: abort the in-flight SSE run (if any) and release the input.
   * Unsubscribing tears down the SSE observable → AbortController.abort() cuts the HTTP stream. The
   * partial assistant message already received stays in the conversation (frozen, not deleted). A no-op
   * when nothing is running.
   */
  public stopGeneration(): void {
    if (!this.currentRun) return;

    this.currentRun.unsubscribe();
    this.currentRun = undefined;
    this.isConnecting$.next(false);
    this.currentUserMessageId = undefined;
    // F-020 AC10: converge any tool-call still in flight to `cancelled` — its `tool_call.complete` frame
    // will never arrive now that the run is aborted, so it must not linger as `running`.
    this.conversation$.next(this.conversation$.value.cancelInFlightToolCalls());
  }

  public close(): void {
    this.currentRun?.unsubscribe();
    this.currentRun = undefined;
    this.isConnecting$.complete();
    this.conversation$.complete();
    this.channelTitleSubject.complete();
    this.sandboxPhaseSubject.complete();
    this.launchedSandboxesSubject.complete();
    this.derivedStores.teardown();
    this.statesSubscription?.unsubscribe();
  }
}
