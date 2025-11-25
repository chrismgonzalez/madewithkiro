/**
 * useApplications Hook
 *
 * Provides applications data fetching and mutation capabilities with:
 * - Automatic caching via TanStack Query
 * - Optimistic updates for better UX
 * - Automatic rollback on errors
 * - Cache invalidation on success
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationService } from "@/services/applicationService";
import type { Application, CreateApplicationRequest } from "@/types";

/**
 * Hook to fetch and manage applications data
 *
 * Features:
 * - Fetches applications with dynamic query key based on userId
 * - Provides mutation for application creation
 * - Implements optimistic updates with temporary ID and pending indicator
 * - Replaces temp app with real one on success
 * - Removes optimistic app on error
 * - Invalidates all application queries on success
 *
 * @param userId - Optional user ID to filter applications by user
 * @returns Object containing applications data, loading states, and mutation functions
 */
export function useApplications(userId?: string) {
  const queryClient = useQueryClient();

  // Fetch applications data
  const {
    data: applications = [],
    isLoading,
    error: queryError,
  } = useQuery<Application[]>({
    queryKey: userId
      ? ["applications", "user", userId]
      : ["applications", "all"],
    queryFn: () => applicationService.listApplications(userId),
  });

  // Create application mutation with optimistic updates
  const createMutation = useMutation<
    Application,
    Error,
    CreateApplicationRequest,
    { tempId: string }
  >({
    mutationFn: (data: CreateApplicationRequest) =>
      applicationService.createApplication(data),

    // Optimistic update: Add application immediately with pending indicator
    onMutate: async (newApp) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["applications"] });

      // Generate temporary ID
      const tempId = `temp-${Date.now()}`;

      // Create optimistic application with pending indicator
      const optimisticApp: Application & { isPending?: boolean } = {
        ...newApp,
        appId: tempId,
        userId: userId || "",
        userName: "You",
        createdAt: new Date().toISOString(),
        isPending: true,
      };

      // Add to all applications list
      queryClient.setQueryData<Application[]>(
        ["applications", "all"],
        (old = []) => [optimisticApp, ...old]
      );

      // If filtering by user, also add to user's list
      if (userId) {
        queryClient.setQueryData<Application[]>(
          ["applications", "user", userId],
          (old = []) => [optimisticApp, ...old]
        );
      }

      return { tempId };
    },

    // Replace temp app with real one on success
    onSuccess: (newApp, _variables, context) => {
      // Replace in all applications list
      queryClient.setQueryData<Application[]>(
        ["applications", "all"],
        (old = []) =>
          old.map((app) => (app.appId === context.tempId ? newApp : app))
      );

      // Replace in user's list if applicable
      if (userId) {
        queryClient.setQueryData<Application[]>(
          ["applications", "user", userId],
          (old = []) =>
            old.map((app) => (app.appId === context.tempId ? newApp : app))
        );
      }
    },

    // Remove optimistic app on error
    onError: (_err, _newApp, context) => {
      if (context?.tempId) {
        // Remove from all applications list
        queryClient.setQueryData<Application[]>(
          ["applications", "all"],
          (old = []) => old.filter((app) => app.appId !== context.tempId)
        );

        // Remove from user's list if applicable
        if (userId) {
          queryClient.setQueryData<Application[]>(
            ["applications", "user", userId],
            (old = []) => old.filter((app) => app.appId !== context.tempId)
          );
        }
      }
    },

    // Invalidate all application queries after mutation completes
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  return {
    applications,
    isLoading,
    error: queryError || createMutation.error,
    createApplication: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
