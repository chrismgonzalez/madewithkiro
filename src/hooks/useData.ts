/**
 * Tanstack Query hooks for data fetching
 * These hooks provide a clean interface for components to access data
 * with built-in caching, loading states, and error handling
 */

import { useQuery } from "@tanstack/react-query";
import { useMockAuth } from "../contexts/MockAuthContext";
import * as mockDataService from "../services/mockDataService";
import type { UserProfile, Application } from "../types";

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
