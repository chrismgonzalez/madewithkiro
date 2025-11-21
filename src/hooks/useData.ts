/**
 * Tanstack Query hooks for data fetching
 * These hooks provide a clean interface for components to access data
 * with built-in caching, loading states, and error handling
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMockAuth } from "../contexts/MockAuthContext";
import * as mockDataService from "../services/mockDataService";
import type {
  UserProfile,
  Application,
  UpdateApplicationRequest,
} from "../types";

/**
 * Hook to fetch all applications with authentication-aware caching
 * Query key includes authentication state to ensure proper cache invalidation
 * when auth state changes
 *
 * @returns Query result with applications data
 */
export function useApplications() {
  const { isAuthenticated } = useMockAuth();

  return useQuery<Application[]>({
    queryKey: ["applications", isAuthenticated],
    queryFn: () => mockDataService.getAllApplications(isAuthenticated),
    staleTime: Infinity, // Mock data never stales
  });
}

/**
 * Hook to fetch a user profile by ID
 *
 * @param userId - The ID of the user to fetch
 * @returns Query result with user profile data (or null if not found)
 */
export function useProfile(userId: string) {
  return useQuery<UserProfile | null>({
    queryKey: ["profile", userId],
    queryFn: () => mockDataService.getProfile(userId),
    staleTime: Infinity, // Mock data never stales
  });
}

/**
 * Hook to fetch applications for a specific user with authentication-aware caching
 * Query key includes both userId and authentication state
 *
 * @param userId - The ID of the user whose applications to fetch
 * @returns Query result with user's applications data
 */
export function useUserApplications(userId: string) {
  const { isAuthenticated } = useMockAuth();

  return useQuery<Application[]>({
    queryKey: ["applications", "user", userId, isAuthenticated],
    queryFn: () =>
      mockDataService.getApplicationsByUserId(userId, isAuthenticated),
    staleTime: Infinity, // Mock data never stales
  });
}

/**
 * Hook to fetch a single application by ID
 *
 * @param appId - The ID of the application to fetch
 * @returns Query result with application data (or null if not found)
 */
export function useApplication(appId: string) {
  return useQuery<Application | null>({
    queryKey: ["application", appId],
    queryFn: () => mockDataService.getApplicationById(appId),
    staleTime: Infinity, // Mock data never stales
  });
}

/**
 * Hook to update an application
 * Invalidates relevant queries on success to ensure UI stays in sync
 *
 * @returns Mutation result with mutate function and status
 */
export function useUpdateApplication() {
  const queryClient = useQueryClient();
  const { currentUserId } = useMockAuth();

  return useMutation({
    mutationFn: ({
      appId,
      data,
    }: {
      appId: string;
      data: UpdateApplicationRequest;
    }) => mockDataService.updateApplication(appId, data, currentUserId!),

    onSuccess: (updatedApp) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: ["applications", "user", updatedApp.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["application", updatedApp.appId],
      });
    },

    onError: (error) => {
      console.error("Failed to update application:", error);
    },
  });
}

/**
 * Hook to delete an application
 * Invalidates relevant queries and removes the specific application from cache on success
 *
 * @returns Mutation result with mutate function and status
 */
export function useDeleteApplication() {
  const queryClient = useQueryClient();
  const { currentUserId } = useMockAuth();

  return useMutation({
    mutationFn: (appId: string) =>
      mockDataService.deleteApplication(appId, currentUserId!),

    onSuccess: (_, appId) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: ["applications", "user", currentUserId],
      });
      // Remove the specific application from cache
      queryClient.removeQueries({ queryKey: ["application", appId] });
    },

    onError: (error) => {
      console.error("Failed to delete application:", error);
    },
  });
}
