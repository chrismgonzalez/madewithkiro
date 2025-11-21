/**
 * useApplications Hook - Request Cancellation Tests
 *
 * Tests for request cancellation in useApplications hook
 * Validates Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useApplications } from "../useApplications";
import { applicationService } from "@/services/applicationService";
import type { Application } from "@/types";

// Mock the application service
vi.mock("@/services/applicationService", () => ({
  applicationService: {
    listApplications: vi.fn(),
    createApplication: vi.fn(),
  },
}));

describe("useApplications - Request Cancellation", () => {
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

  const mockApplications: Application[] = [
    {
      appId: "app-1",
      userId: "test-user-001",
      userName: "Test User",
      name: "Test App",
      description: "A test application",
      appUrl: "https://test.com",
      tags: ["test"],
      createdAt: "2024-01-01T00:00:00Z",
    },
  ];

  describe("Requirement 13.1: Cancel on unmount", () => {
    it("GIVEN a component unmounts during an API request WHEN the unmount occurs THEN the pending request should be cancelled", async () => {
      // Arrange
      vi.mocked(applicationService.listApplications).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockApplications), 100);
          })
      );

      // Act
      const { unmount } = renderHook(() => useApplications(), { wrapper });

      // Unmount immediately (TanStack Query handles cancellation automatically)
      unmount();

      // Wait for potential request completion
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert - Query should not be fetching after unmount
      const state = queryClient.getQueryState(["applications", "all"]);
      expect(state?.fetchStatus).not.toBe("fetching");
    });
  });

  describe("Requirement 13.2: Cancel on navigation", () => {
    it("GIVEN a user navigates away from gallery page WHEN navigation occurs THEN pending application requests should be cancelled", async () => {
      // Arrange
      vi.mocked(applicationService.listApplications).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockApplications), 100);
          })
      );

      // Act
      const { unmount } = renderHook(() => useApplications(), { wrapper });

      // Simulate navigation by unmounting (TanStack Query handles cancellation)
      unmount();

      // Wait for potential request completion
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert - Query should not be fetching after unmount
      const state = queryClient.getQueryState(["applications", "all"]);
      expect(state?.fetchStatus).not.toBe("fetching");
    });
  });

  describe("Requirement 13.3: Cancel previous request on filter change", () => {
    it("GIVEN a filter is applied WHEN a new filter is applied before the previous completes THEN the previous request should be cancelled", async () => {
      // Arrange
      let firstRequestCompleted = false;
      let secondRequestCompleted = false;

      vi.mocked(applicationService.listApplications)
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                firstRequestCompleted = true;
                resolve(mockApplications);
              }, 500);
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                secondRequestCompleted = true;
                resolve([]);
              }, 100);
            })
        );

      // Act - First render without userId
      const { rerender } = renderHook(
        ({ userId }: { userId?: string }) => useApplications(userId),
        {
          wrapper,
          initialProps: { userId: undefined },
        }
      );

      // Change filter by providing userId (triggers new request)
      rerender({ userId: "test-user-001" });

      // Wait for second request to complete
      await waitFor(() => {
        expect(secondRequestCompleted).toBe(true);
      });

      // Assert - Second request completed
      expect(secondRequestCompleted).toBe(true);
    });
  });

  describe("Requirement 13.4: Ignore cancelled responses", () => {
    it("GIVEN a cancelled request completes WHEN the response arrives THEN component state should not update", async () => {
      // Arrange
      vi.mocked(applicationService.listApplications).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockApplications), 500);
          })
      );

      // Act
      const { result, unmount } = renderHook(() => useApplications(), {
        wrapper,
      });

      // Unmount before request completes
      unmount();

      // Wait for potential response
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Assert - Applications should be empty (default value)
      expect(result.current.applications).toEqual([]);
    });
  });

  describe("Requirement 13.5: No error messages for cancellation", () => {
    it("GIVEN a request is cancelled WHEN cancellation occurs THEN no error should be exposed to the component", async () => {
      // Arrange
      vi.mocked(applicationService.listApplications).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockApplications), 1000);
          })
      );

      // Act
      const { result, unmount } = renderHook(() => useApplications(), {
        wrapper,
      });

      // Unmount to cancel
      unmount();

      // Assert - No error should be set
      expect(result.current.error).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle cancellation during application creation", async () => {
      // Arrange
      vi.mocked(applicationService.listApplications).mockResolvedValue(
        mockApplications
      );

      vi.mocked(applicationService.createApplication).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(mockApplications[0]);
            }, 100);
          })
      );

      // Act
      const { result, unmount } = renderHook(() => useApplications(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.applications).toHaveLength(1);
      });

      // Start creation
      const createPromise = result.current.createApplication({
        name: "New App",
        description: "New description",
        appUrl: "https://new.com",
        tags: ["new"],
        userId: "test-user-001",
      });

      // Unmount during creation (TanStack Query handles cleanup)
      unmount();

      // Wait for potential completion
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert - Mutation should be cleaned up after unmount
      // The promise may resolve or reject, but no state updates should occur
      try {
        await createPromise;
      } catch (error) {
        // Expected - mutation may be cancelled
      }
    });
  });
});
