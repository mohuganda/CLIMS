import { createContext, use, type ReactNode } from 'react';

import type { AppConfig } from './env';

const ConfigContext = createContext<AppConfig | null>(null);

interface ConfigProviderProps {
  config: AppConfig;
  children: ReactNode;
}

/** Makes the validated build configuration available to the tree. */
export function ConfigProvider({ config, children }: ConfigProviderProps) {
  return <ConfigContext value={config}>{children}</ConfigContext>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook and its provider are one unit
export function useAppConfig(): AppConfig {
  const config = use(ConfigContext);
  if (!config) throw new Error('useAppConfig must be used inside <ConfigProvider>.');
  return config;
}
