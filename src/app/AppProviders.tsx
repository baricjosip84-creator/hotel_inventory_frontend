import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: 1
        }
      }
    });
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}