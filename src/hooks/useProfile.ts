/**
 * useProfile Hook
 *
 * Provides profile data fetching and mutation capabilities with:
 * - Automatic caching via TanStack Query
 * - Optimistic updates for better UX
 * - Automatic rollback on errors
 * - Cache invalidation on success
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
import type { UserProfile, UpdateProfileRequest } from "@/types";

/**
 * Hook to fetch and manage user profile data
 *
 * Features:
 * - Fetches profile data with query key ['profile', userId]
 * - Provides mutation for profile updates
 * - Implements optimistic updates for immediate UI feedback
 * - Rolls back on error
 * - Invalidates cache on success
 *
 * @param userId - The ID of the user whose profile to fetch
 * @returns Object containing profile data, loading states, and mutation functions
 */
export function useProfile(userId: string) {
  const queryClient = useQueryClient();

  // Fetch profile data
  const {
    data: profile,
    isLoading,
    error: queryError,
  } = useQuery<UserProfile>({
    queryKey: ["profile", userId],
    queryFn: () => profileService.getProfile(userId),
    enabled: !!userId,
  });

  // Update profile mutation with optimistic updates
  const updateMutation = useMutation<
    UserProfile,
    Error,
    UpdateProfileRequest,
    { previousProfile: UserProfile | undefined }
  >({
    mutationFn: (data: UpdateProfileRequest) =>
      profileService.updateProfile(data),

    // Optimistic update: Update UI immediately before API call completes
    onMutate: async (newData) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["profile", userId] });

      // Snapshot the previous value for rollback
      const previousProfile = queryClient.getQueryData<UserProfile>([
        "profile",
        userId,
      ]);

      // Optimistically update the cache
      queryClient.setQueryData<UserProfile>(["profile", userId], (old) => {
        if (!old) return old;
        return {
          ...old,
          ...newData,
          // Keep server-managed fields
          userId: old.userId,
          createdAt: old.createdAt,
          updatedAt: old.updatedAt,
        };
      });

      // Return context with previous value for rollback
      return { previousProfile };
    },

    // Rollback on error: Revert to previous state
    onError: (err, newData, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(["profile", userId], context.previousProfile);
      }
    },

    // Refetch after mutation completes (success or error)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  return {
    profile,
    isLoading,
    error: queryError || updateMutation.error,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
