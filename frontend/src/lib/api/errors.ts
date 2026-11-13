import axios from 'axios';

/** Why a request failed, in terms the UI can act on. */
export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'unexpected_response'
  | 'unknown';

/** Field name to the messages the server attached to it. */
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

interface ApiErrorInit {
  kind: ApiErrorKind;
  message: string;
  status?: number | null;
  fieldErrors?: FieldErrors;
  cause?: unknown;
}

/**
 * The only error type the rest of the app sees from the API layer.
 * `message` is always safe to show to a user.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly fieldErrors: FieldErrors;

  constructor({ kind, message, status = null, fieldErrors = {}, cause }: ApiErrorInit) {
    super(message, { cause });
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Could not reach the server. Check your connection and try again.',
  timeout: 'The server took too long to respond. Try again.',
  cancelled: 'The request was cancelled.',
  unauthorized: 'Your session has expired. Sign in again.',
  forbidden: 'You do not have permission to do that.',
  not_found: 'That record no longer exists.',
  validation: 'Some of the details are not valid. Check the form and try again.',
  conflict: 'That conflicts with an existing record.',
  rate_limited: 'Too many requests. Wait a moment and try again.',
  server: 'The server ran into a problem. Try again shortly.',
  unexpected_response: 'The server sent a response this app does not understand.',
  unknown: 'Something went wrong. Try again.',
};

/** Longest server-supplied message that is shown verbatim. */
const MAX_SERVER_MESSAGE_LENGTH = 300;

/** Maps an HTTP status (real, or carried in a legacy body `code`) to a kind. */
export function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 408) return 'timeout';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readServerMessage(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const { message } = body;
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_SERVER_MESSAGE_LENGTH
    ? `${trimmed.slice(0, MAX_SERVER_MESSAGE_LENGTH)}…`
    : trimmed;
}

/** Reads per-field messages from `errors` (Laravel) or `error` (the Go API). */
function readFieldErrors(body: unknown): FieldErrors {
  if (!isRecord(body)) return {};
  const source = isRecord(body.errors) ? body.errors : isRecord(body.error) ? body.error : null;
  if (!source) return {};

  const fieldErrors: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(source)) {
    const messages = (Array.isArray(value) ? value : [value]).filter(
      (item): item is string => typeof item === 'string' && item.trim() !== '',
    );
    if (messages.length > 0) fieldErrors[field] = messages;
  }
  return fieldErrors;
}

/** Builds the error for a response the server marked as failed. */
export function errorFromResponse(status: number, body: unknown, cause?: unknown): ApiError {
  const kind = kindForStatus(status);
  // A 4xx message is written for the caller. A 5xx body can carry stack
  // traces or SQL, so it is never surfaced.
  const serverMessage = kind === 'server' ? null : readServerMessage(body);
  return new ApiError({
    kind,
    status,
    message: serverMessage ?? FALLBACK_MESSAGES[kind],
    fieldErrors: readFieldErrors(body),
    cause,
  });
}

/** Builds an error for a 2xx response whose body is not the documented shape. */
export function unexpectedResponse(detail: string): ApiError {
  return new ApiError({
    kind: 'unexpected_response',
    message: FALLBACK_MESSAGES.unexpected_response,
    cause: new Error(detail),
  });
}

/** Converts anything thrown while making a request into an {@link ApiError}. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isCancel(error)) {
    return new ApiError({ kind: 'cancelled', message: FALLBACK_MESSAGES.cancelled, cause: error });
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      return errorFromResponse(error.response.status, error.response.data, error);
    }
    const kind: ApiErrorKind =
      error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 'timeout' : 'network';
    return new ApiError({ kind, message: FALLBACK_MESSAGES[kind], cause: error });
  }

  return new ApiError({ kind: 'unknown', message: FALLBACK_MESSAGES.unknown, cause: error });
}

/** A message that is safe to show for any thrown value. */
export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}
