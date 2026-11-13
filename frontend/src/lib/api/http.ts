import axios, { type AxiosAdapter, type Method } from 'axios';

import { errorFromResponse, toApiError } from './errors';

export interface RequestOptions {
  /** Aborts the request, e.g. when the component that asked for it unmounts. */
  signal?: AbortSignal;
  /**
   * Send without the session token and without treating a 401 as an expired
   * session. Sign-in uses this: a 401 there means wrong credentials.
   */
  anonymous?: boolean;
}

/** The transport every feature talks through. Returns response bodies, throws `ApiError`. */
export interface HttpClient {
  get(path: string, options?: RequestOptions): Promise<unknown>;
  post(path: string, body?: unknown, options?: RequestOptions): Promise<unknown>;
  put(path: string, body?: unknown, options?: RequestOptions): Promise<unknown>;
  patch(path: string, body?: unknown, options?: RequestOptions): Promise<unknown>;
  delete(path: string, options?: RequestOptions): Promise<unknown>;
}

export interface HttpClientOptions {
  baseUrl: string;
  /** Read on every request so a sign-in or sign-out takes effect immediately. */
  getToken: () => string | null;
  /** Called when an authenticated request is rejected with 401. */
  onUnauthorized: () => void;
  /** Upper bound on any one request. A hung connection must not hang the UI. */
  timeoutMs?: number;
  /** Replaces the network layer in tests. */
  adapter?: AxiosAdapter;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * The legacy API reports some failures as HTTP 200 with the real status in a
 * `code` field (`{ "code": "401", "message": "…" }`). This is the one place
 * that knows about that; callers only ever see a thrown `ApiError`.
 */
function readEnvelopeStatus(body: unknown): number | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const { code } = body as { code?: unknown };
  if (typeof code !== 'string' && typeof code !== 'number') return null;
  const status = Number(code);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}

/** Creates the app's HTTP client. Holds no state of its own beyond its options. */
export function createHttpClient({
  baseUrl,
  getToken,
  onUnauthorized,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  adapter,
}: HttpClientOptions): HttpClient {
  const instance = axios.create({
    baseURL: baseUrl,
    timeout: timeoutMs,
    headers: { Accept: 'application/json' },
    ...(adapter ? { adapter } : {}),
  });

  async function request(
    method: Method,
    path: string,
    body: unknown,
    { signal, anonymous = false }: RequestOptions = {},
  ): Promise<unknown> {
    const token = anonymous ? null : getToken();

    try {
      const response = await instance.request<unknown>({
        method,
        url: path,
        data: body,
        signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const envelopeStatus = readEnvelopeStatus(response.data);
      if (envelopeStatus !== null && envelopeStatus >= 400) {
        throw errorFromResponse(envelopeStatus, response.data);
      }
      return response.data;
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.kind === 'unauthorized' && !anonymous) onUnauthorized();
      throw apiError;
    }
  }

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    put: (path, body, options) => request('PUT', path, body, options),
    patch: (path, body, options) => request('PATCH', path, body, options),
    delete: (path, options) => request('DELETE', path, undefined, options),
  };
}
