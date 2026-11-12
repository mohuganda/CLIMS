/** Build-time configuration, validated once so a bad value fails at startup instead of mid-session. */
export interface AppConfig {
  /** Absolute `https://…` URL or a same-origin path such as `/api`. Never ends in a slash. */
  readonly apiBaseUrl: string;
  /** `null` when no browser key is configured; the map page degrades to a notice. */
  readonly googleMapsApiKey: string | null;
}

/** Thrown for configuration a deploy must fix; the message names the variable. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const DEFAULT_API_BASE_URL = '/api';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function parseApiBaseUrl(raw: string | undefined): string {
  const value = raw?.trim() || DEFAULT_API_BASE_URL;

  if (value.startsWith('/') && !value.startsWith('//')) {
    return value.replace(/\/+$/, '') || '/';
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(
      `VITE_API_BASE_URL must be an absolute URL or a path starting with "/", got "${value}".`,
    );
  }

  // The session token travels in a header on every call; plain HTTP would put
  // it on the wire in the clear. Loopback is exempt so local stacks still work.
  const isLoopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new ConfigError(
      `VITE_API_BASE_URL must use https (http is allowed for localhost only), got "${value}".`,
    );
  }

  return value.replace(/\/+$/, '');
}

/** Turns raw `import.meta.env` values into a validated {@link AppConfig}. */
export function parseConfig(env: {
  VITE_API_BASE_URL?: string;
  VITE_GOOGLE_MAPS_API_KEY?: string;
}): AppConfig {
  return {
    apiBaseUrl: parseApiBaseUrl(env.VITE_API_BASE_URL),
    googleMapsApiKey: env.VITE_GOOGLE_MAPS_API_KEY?.trim() || null,
  };
}
