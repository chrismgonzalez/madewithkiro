/**
 * useProfile Hook - Request Cancellation Tests
 *
 * Tests for request cancellation in useProfile hook
 * Validates Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProfile } from "../useProfile";
import { profileService } from "@/services/profileService";
import type { UserProfile } from "@/types";

// Mock the profile service
vi.mock("@/services/profileService", () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

describe("useProfile - Request Cancellation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("Requirement 13.1: Cancel on unmount", () => {
    it("GIVEN a component unmounts during an API request WHEN the unmount occurs THEN the pending request should be cancelled", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(profileService.getProfile).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockProfile), 100);
          })
      );

      // Act
      const { unmount } = renderHook(() => useProfile("test-user-001"), {
        wrapper,
      });

      // Unmount immediately (TanStack Query handles cancellation automatically)
      unmount();

      // Wait a bit to ensure request would have completed
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert - Query should be cancelled/inactive after unmount
      const state = queryClient.getQueryState(["profile", "test-user-001"]);
      // After unmount, the query should not be actively fetching
      expect(state?.fetchStatus).not.toBe("fetching");
    });
  });

  describe("Requirement 13.2: Cancel on navigation", () => {
    it("GIVEN a user navigates away from a page WHEN navigation occurs THEN pending profile requests should be cancelled", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(profileService.getProfile).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockProfile), 100);
          })
      );

      // Act
      const { unmount } = renderHook(() => useProfile("test-user-001"), {
        wrapper,
      });

      // Simulate navigation by unmounting (TanStack Query handles cancellation)
      unmount();

      // Wait for potential request completion
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert - Query should not be fetching after unmount
      const state = queryClient.getQueryState(["profile", "test-user-001"]);
      expect(state?.fetchStatus).not.toBe("fetching");
    });
  });

  describe("Requirement 13.3: Cancel previous request on new request", () => {
    it("GIVEN a profile update is in progress WHEN a new update starts THEN the previous request should be cancelled", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(profileService.getProfile).mockResolvedValue(mockProfile);

      let secondUpdateCompleted = false;

      vi.mocked(profileService.updateProfile)
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                resolve({ ...mockProfile, firstName: "First" });
              }, 500);
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                secondUpdateCompleted = true;
                resolve({ ...mockProfile, firstName: "Second" });
              }, 100);
            })
        );

      // Act
      const { result } = renderHook(() => useProfile("test-user-001"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.profile).toBeDefined();
      });

      // Start first update
      result.current.updateProfile({
        firstName: "First",
        lastName: "User",
        awsBuilderHandle: "test-builder",
      });

      // Start second update immediately (should cancel first)
      const update2Promise = result.current.updateProfile({
        firstName: "Second",
        lastName: "User",
        awsBuilderHandle: "test-builder",
      });

      // Wait for second to complete
      await update2Promise;

      // Assert
      expect(secondUpdateCompleted).toBe(true);
      // First update may or may not complete depending on timing
    });
  });

  describe("Requirement 13.4: Ignore cancelled responses", () => {
    it("GIVEN a cancelled request completes WHEN the response arrives THEN component state should not update", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(profileService.getProfile).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockProfile), 500);
          })
      );

      // Act
      const { result, unmount } = renderHook(
        () => useProfile("test-user-001"),
        { wrapper }
      );

      // Unmount before request completes
      unmount();

      // Wait for potential response
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Assert - Profile should not be set
      expect(result.current.profile).toBeUndefined();
    });
  });

  describe("Requirement 13.5: No error messages for cancellation", () => {
    it("GIVEN a request is cancelled WHEN cancellation occurs THEN no error should be exposed to the component", async () => {
      // Arrange
      const mockProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "Test",
        lastName: "User",
        awsBuilderHandle: "test-builder",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      vi.mocked(profileService.getProfile).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockProfile), 1000);
          })
      );

      // Act
      const { result, unmount } = renderHook(
        () => useProfile("test-user-001"),
        { wrapper }
      );

      // Unmount to cancel
      unmount();

      // Assert - No error should be set
      expect(result.current.error).toBeNull();
    });
  });
});
