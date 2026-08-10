/**
 * Thrown by `Channel.sendMessage()` when the channel is parked on a tool-call consent prompt. The
 * server holds such a channel in a pause that only a consent reply resumes — a plain turn is rejected
 * ("use RespondToolCallConsent"). The pause is invisible to the run-in-flight guard: the consent frame
 * arrives *before* the run terminal, so by the time the prompt is on screen the run has already ended
 * and the channel looks idle. Refusing here keeps a doomed send from pushing an optimistic bubble and
 * a backend error into the thread. Answer with `replyToolCallConsents()` first.
 */
export class ChannelAwaitingConsentError extends Error {
  /** The paused batch's process id, as carried by the pending consent prompt. */
  public readonly processId: string;

  constructor(processId: string) {
    super('Cannot send a message while this channel is awaiting a tool-call consent response.');
    this.name = 'ChannelAwaitingConsentError';
    this.processId = processId;
  }
}

export function isChannelAwaitingConsentError(error: unknown): error is ChannelAwaitingConsentError {
  return error instanceof ChannelAwaitingConsentError;
}
