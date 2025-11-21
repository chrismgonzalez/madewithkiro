/**
 * TanStack Query (React Query) configuration
 * Provides caching, background refetching, and request deduplication
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Create and configure the QueryClient with optimized defaults
 *
 * Configuration:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - cacheTime: 10 minutes - Unused data is garbage collected after 10 minutes
 * - retry: 2 - Failed requests are retried up to 2 times
 * - refetchOnWindowFocus: false - Don't refetch when window regains focus
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
    },
  },
});
