/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProfile } from "../useProfile";
import * as profileServiceModule from "@/services/profileService";
import type { UserProfile, UpdateProfileRequest } from "@/types";

// Mock the profile service
vi.mock("@/services/profileService", () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

const profileService = profileServiceModule.profileService as any;

describe("useProfile Hook - Acceptance Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a new QueryClient for each test to ensure isolation
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for faster tests
        },
        mutations: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // Helper to wrap hooks with QueryClientProvider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("GIVEN I use the useProfile hook with a userId", () => {
    it("WHEN the hook initializes THEN it should fetch the profile data from the API", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        linkedInUsername: "testuser",
        githubUsername: "test-user",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      profileService.getProfile.mockResolvedValue(mockProfile);

      // Act
      const { result } = renderHook(() => useProfile("test-user-001"), {
        wrapper,
      });

      // Assert - Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.profile).toBeUndefined();

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Data loaded
      expect(result.current.profile).toEqual(mockProfile);
      expect(profileService.getProfile).toHaveBeenCalledWith("test-user-001");
      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe("GIVEN I call updateProfile with new data", () => {
    it("WHEN the mutation executes THEN the UI should immediately update with the new values (optimistic update)", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const updateData: UpdateProfileRequest = {
        userId: "test-user-001",
        firstName: "Updated",
        lastName: "Name",
        awsBuilderHandle: "updated-builder",
      };

      profileService.getProfile.mockResolvedValue(mockProfile);
      // Delay the update to observe optimistic update
      profileService.updateProfile.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ...mockProfile,
                  ...updateData,
                  updatedAt: "2024-01-02T00:00:00Z",
                }),
              100
            )
          )
      );

      // Act
      const { result } = renderHook(() => useProfile("test-user-001"), {
        wrapper,
      });

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      // Trigger update
      result.current.updateProfile(updateData);

      // Assert - Optimistic update should be visible immediately
      await waitFor(() => {
        expect(result.current.profile?.firstName).toBe("Updated");
        expect(result.current.profile?.lastName).toBe("Name");
        expect(result.current.profile?.awsBuilderHandle).toBe(
          "updated-builder"
        );
      });

      // The mutation should still be pending
      expect(result.current.isUpdating).toBe(true);
    });
  });

  describe("GIVEN a profile update API call succeeds", () => {
    it("WHEN the response is received THEN the optimistically updated UI state should be kept", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const updateData: UpdateProfileRequest = {
        userId: "test-user-001",
        firstName: "Updated",
        lastName: "Name",
        awsBuilderHandle: "updated-builder",
      };

      const updatedProfile: UserProfile = {
        ...mockProfile,
        ...updateData,
        updatedAt: "2024-01-02T00:00:00Z",
      };

      // Mock both initial fetch and refetch to return updated data after mutation
      let callCount = 0;
      profileService.getProfile.mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? mockProfile : updatedProfile);
      });
      profileService.updateProfile.mockResolvedValue(updatedProfile);

      // Act
      const { result } = renderHook(() => useProfile("test-user-001"), {
        wrapper,
      });

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      // Trigger update
      result.current.updateProfile(updateData);

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      // Assert - No error occurred, mutation succeeded
      expect(result.current.error).toBeNull();

      // The profile should eventually have the updated data after refetch
      await waitFor(() => {
        expect(result.current.profile?.firstName).toBe("Updated");
      });
    });
  });

  describe("GIVEN a profile update API call fails", () => {
    it("WHEN the error is received THEN the UI should revert to the previous state and display an error message", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const updateData: UpdateProfileRequest = {
        userId: "test-user-001",
        firstName: "Updated",
        lastName: "Name",
        awsBuilderHandle: "updated-builder",
      };

      const mockError = new Error("Failed to update profile");

      profileService.getProfile.mockResolvedValue(mockProfile);
      profileService.updateProfile.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => useProfile("test-user-001"), {
        wrapper,
      });

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      // Trigger update and catch the error
      result.current.updateProfile(updateData).catch(() => {
        // Expected to fail
      });

      // Wait for mutation to fail
      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      // Assert - Should revert to original data
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeTruthy();
    });
  });
});
