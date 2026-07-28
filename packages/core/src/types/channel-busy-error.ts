import { RunKind } from './channel';

/**
 * Thrown by `Channel.sendMessage()` when a run is already in flight on that channel (F-023 AC6 /
 * UC-045). Because runs execute in the background on the server, dispatching a second one would leave
 * two concurrent runs writing to the same transcript. The SDK's own composer already gates every send
 * entrance, so this only surfaces for programmatic sends — a rejection rather than a silent drop, so
 * the caller can tell the message never left.
 */
export class ChannelBusyError extends Error {
  /** Which run is holding the channel. */
  public readonly runKind: RunKind;

  constructor(runKind: RunKind) {
    super(`Cannot send a message while a "${runKind}" run is in flight on this channel.`);
    this.name = 'ChannelBusyError';
    this.runKind = runKind;
  }
}

export function isChannelBusyError(error: unknown): error is ChannelBusyError {
  return error instanceof ChannelBusyError;
}
