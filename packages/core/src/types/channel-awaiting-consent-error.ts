/**
 * Thrown by `Channel.sendMessage()` and `Channel.nudge()` when the channel is parked on a tool-call
 * consent prompt. The server holds such a channel in a pause that only a consent reply resumes — every
 * other turn is rejected ("use RespondToolCallConsent"), a nudge included: it takes the same
 * `PostUserMessage` path as a plain message. The pause is invisible to the run-in-flight guard, because
 * the consent frame arrives *before* the run terminal — by the time the prompt is on screen the run has
 * already ended and the channel looks idle. Refusing here keeps a doomed turn from pushing an
 * optimistic bubble and a backend error into the thread. Answer with `replyToolCallConsents()` first.
 */
export class ChannelAwaitingConsentError extends Error {
  /**
   * The paused batch's process id, as carried by the pending consent prompt.
   *
   * **Empty string on a rejoin.** A prompt recovered after a reload is reconstructed by the backend
   * from its durable pause state, and that path deliberately leaves the process id blank (clients are
   * meant to detect a consent pause from the prompt's presence, not from this id). Treat it as a
   * diagnostic hint, never as a key.
   */
  public readonly processId: string;

  constructor(processId: string) {
    super('Cannot send this turn while the channel is awaiting a tool-call consent response.');
    this.name = 'ChannelAwaitingConsentError';
    this.processId = processId;
  }
}

export function isChannelAwaitingConsentError(error: unknown): error is ChannelAwaitingConsentError {
  return error instanceof ChannelAwaitingConsentError;
}
