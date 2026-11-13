import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

export interface RecordedRequest {
  method: string;
  url: string;
  body: unknown;
  authorization: string | null;
}

type Reply = { status: number; body?: unknown } | { failure: 'network' | 'timeout' };

/**
 * A scripted stand-in for the network. Replies are consumed in order; the last
 * one repeats, so a single-reply script answers every request the same way.
 */
export function createFakeAdapter(...script: Reply[]): {
  adapter: AxiosAdapter;
  requests: RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];
  let cursor = 0;

  const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
    const authorization: unknown = config.headers.get('Authorization');
    requests.push({
      method: (config.method ?? 'get').toUpperCase(),
      url: config.url ?? '',
      body: typeof config.data === 'string' ? (JSON.parse(config.data) as unknown) : config.data,
      authorization: typeof authorization === 'string' ? authorization : null,
    });

    const reply = script[Math.min(cursor, script.length - 1)];
    cursor += 1;
    if (!reply) return Promise.reject(new Error('createFakeAdapter needs at least one reply'));

    if ('failure' in reply) {
      return Promise.reject(
        reply.failure === 'timeout'
          ? new AxiosError('timeout exceeded', AxiosError.ECONNABORTED, config)
          : new AxiosError('Network Error', AxiosError.ERR_NETWORK, config),
      );
    }

    const response = {
      data: reply.body,
      status: reply.status,
      statusText: '',
      headers: {},
      config,
    };
    if (reply.status >= 200 && reply.status < 300) return Promise.resolve(response);
    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${reply.status}`,
        AxiosError.ERR_BAD_RESPONSE,
        config,
        null,
        response,
      ),
    );
  };

  return { adapter, requests };
}
