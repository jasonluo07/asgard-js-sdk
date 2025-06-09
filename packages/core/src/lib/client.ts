import {
  ClientConfig,
  IAsgardServiceClient,
  FetchSsePayload,
  FetchSseOptions,
  SseResponse,
  SseEvents,
} from 'src/types';
import { createSseObservable } from './create-sse-observable';
import { concatMap, delay, of, retry, Subject, takeUntil } from 'rxjs';
import { EventType } from 'src/constants/enum';
import { EventEmitter } from './event-emitter';

export default class AsgardServiceClient implements IAsgardServiceClient {
  private apiKey?: string;
  private endpoint: string;
  private debugMode?: boolean;
  private destroy$ = new Subject<void>();
  private sseEmitter = new EventEmitter<SseEvents>();
  private transformSsePayload?: (payload: FetchSsePayload) => FetchSsePayload;

  constructor(config: ClientConfig) {
    if (!config.endpoint) {
      throw new Error('endpoint must be required');
    }

    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.debugMode = config.debugMode;
    this.transformSsePayload = config.transformSsePayload;
  }

  on<K extends keyof SseEvents>(event: K, listener: SseEvents[K]): void {
    this.sseEmitter.remove(event);
    this.sseEmitter.on(event, listener);
  }

  handleEvent(response: SseResponse<EventType>): void {
    switch (response.eventType) {
      case EventType.INIT:
        this.sseEmitter.emit(
          EventType.INIT,
          response as SseResponse<EventType.INIT>
        );

        break;
      case EventType.PROCESS_START:
      case EventType.PROCESS_COMPLETE:
        this.sseEmitter.emit(
          EventType.PROCESS,
          response as Parameters<SseEvents[EventType.PROCESS]>[0]
        );

        break;
      case EventType.MESSAGE_START:
      case EventType.MESSAGE_DELTA:
      case EventType.MESSAGE_COMPLETE:
        this.sseEmitter.emit(
          EventType.MESSAGE,
          response as Parameters<SseEvents[EventType.MESSAGE]>[0]
        );

        break;
      case EventType.TOOL_CALL_START:
      case EventType.TOOL_CALL_COMPLETE:
        this.sseEmitter.emit(
          EventType.TOOL_CALL,
          response as Parameters<SseEvents[EventType.TOOL_CALL]>[0]
        );

        break;
      case EventType.DONE:
        this.sseEmitter.emit(
          EventType.DONE,
          response as SseResponse<EventType.DONE>
        );

        break;
      case EventType.ERROR:
        this.sseEmitter.emit(
          EventType.ERROR,
          response as SseResponse<EventType.ERROR>
        );

        break;
      default:
        break;
    }
  }

  fetchSse(payload: FetchSsePayload, options?: FetchSseOptions): void {
    options?.onSseStart?.();

    createSseObservable({
      apiKey: this.apiKey,
      endpoint: this.endpoint,
      debugMode: this.debugMode,
      payload: this.transformSsePayload?.(payload) ?? payload,
    })
      .pipe(
        concatMap((event) => of(event).pipe(delay(options?.delayTime ?? 50))),
        takeUntil(this.destroy$),
        retry(3)
      )
      .subscribe({
        next: (response) => {
          options?.onSseMessage?.(response);
          this.handleEvent(response);
        },
        error: (error) => {
          options?.onSseError?.(error);
        },
        complete: () => {
          options?.onSseCompleted?.();
        },
      });
  }

  close(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
