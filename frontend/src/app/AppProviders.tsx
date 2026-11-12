import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Provider as StoreProvider } from 'react-redux';

import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfigProvider } from '@/config/ConfigProvider';
import type { AppConfig } from '@/config/env';
import { HttpProvider, type HttpClient } from '@/lib/api';
import type { StorageLike } from '@/lib/storage/jsonStorage';
import type { AppStore } from '@/store/store';

interface AppProvidersProps {
  config: AppConfig;
  store: AppStore;
  queryClient: QueryClient;
  http: HttpClient;
  /** Where UI preferences (theme) are remembered. */
  storage: StorageLike;
  children: ReactNode;
}

/**
 * Everything the tree depends on, handed in rather than imported, so the
 * composition root and the tests each decide what the app runs against.
 */
export function AppProviders({
  config,
  store,
  queryClient,
  http,
  storage,
  children,
}: AppProvidersProps) {
  return (
    <ConfigProvider config={config}>
      <StoreProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <HttpProvider client={http}>
            <ThemeProvider storage={storage}>
              <TooltipProvider>
                {children}
                <Toaster position="top-right" richColors closeButton />
              </TooltipProvider>
            </ThemeProvider>
          </HttpProvider>
        </QueryClientProvider>
      </StoreProvider>
    </ConfigProvider>
  );
}
