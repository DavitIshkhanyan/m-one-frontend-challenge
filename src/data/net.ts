export type RequestErrorKind = 'network' | 'http' | 'parse';

/**
 * The three failures worth telling a user apart:
 *
 *   network - we never reached the server (offline, DNS, CORS, refused)
 *   http    - we reached it and it said no
 *   parse   - we reached it, it said yes, and sent something unusable
 *
 * They get different copy in the UI because they suggest different actions:
 * a network failure is worth retrying immediately, a 500 is worth retrying
 * later, and a parse failure will not fix itself by retrying at all.
 */
export class RequestError extends Error {
  readonly kind: RequestErrorKind;
  readonly status: number | undefined;

  constructor(
    kind: RequestErrorKind,
    message: string,
    status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'RequestError';
    this.kind = kind;
    this.status = status;
  }
}

/** True for the DOMException thrown when an AbortSignal fires mid-flight. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Coerce anything thrown into a RequestError so callers have one shape to
 * render. Abort errors are deliberately NOT handled here — they are not
 * failures and must never reach error state. See useUsersQuery.
 */
export function toRequestError(error: unknown): RequestError {
  if (error instanceof RequestError) return error;
  return new RequestError('network', 'Something went wrong while loading.', undefined, {
    cause: error,
  });
}

export async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, { signal });
  } catch (cause) {
    // Let aborts propagate untouched; they are cancellation, not failure.
    if (isAbortError(cause)) throw cause;
    throw new RequestError('network', 'Could not reach the server.', undefined, { cause });
  }

  if (!response.ok) {
    throw new RequestError('http', `The server responded with ${response.status}.`, response.status);
  }

  try {
    return (await response.json()) as unknown;
  } catch (cause) {
    if (isAbortError(cause)) throw cause;
    throw new RequestError('parse', 'The server sent a response we could not read.', undefined, {
      cause,
    });
  }
}
