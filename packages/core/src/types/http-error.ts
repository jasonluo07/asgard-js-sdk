export class HttpError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  /**
   * The decoded error payload, when the response carried one.
   *
   * Consumers branch on this — `asgard-ai-data-insight-web` reads `reason_code` off it to raise its
   * credit-limit dialog on a `429` — so **always pass it when constructing from a real response**,
   * even though the parameter is optional.
   */
  public readonly body: unknown;

  // `body` is optional because every construction site derives it from a response whose text or JSON
  // may fail to parse, yielding `undefined` or `null`. An absent body is therefore a normal outcome
  // rather than a caller mistake, and a test raising a status-only error need not pass a filler value.
  constructor(status: number, statusText: string, body?: unknown) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
