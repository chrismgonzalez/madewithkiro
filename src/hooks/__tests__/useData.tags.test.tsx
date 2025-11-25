import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateApplication } from "../useData";
import { MockAuthProvider } from "@/contexts/MockAuthContext";
import * as mockDataService from "@/services/mockDataService";

// Create a wrapper with QueryClient and MockAuth
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider>{children}</MockAuthProvider>
    </QueryClientProvider>
  );
}

describe("useData - Tag Update Cache Invalidation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GIVEN I update an application's tags", () => {
    it("WHEN the update succeeds THEN the update service should be called with new tags", async () => {
      // Arrange
      const mockApp = {
        appId: "app-1",
        userId: "user-1",
        userName: "John Doe",
        name: "Test App",
        description: "Test description",
        appUrl: "https://example.com",
        githubUrl: "https://github.com/test/repo",
        tags: ["react", "typescript"],
        visibility: "public" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const updatedApp = {
        ...mockApp,
        tags: ["react", "typescript", "aws"],
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(mockDataService, "getAllApplications").mockResolvedValue([
        mockApp,
      ]);
      const updateApplicationSpy = vi
        .spyOn(mockDataService, "updateApplication")
        .mockResolvedValue(updatedApp);

      // Act
      const { result } = renderHook(() => useUpdateApplication(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        appId: "app-1",
        data: {
          name: "Test App",
          description: "Test description",
          appUrl: "https://example.com",
          githubUrl: "https://github.com/test/repo",
          tags: ["react", "typescript", "aws"],
          visibility: "public",
        },
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the update was called with correct data including new tags
      expect(updateApplicationSpy).toHaveBeenCalledWith(
        "app-1",
        expect.objectContaining({
          tags: ["react", "typescript", "aws"],
        }),
        expect.any(String) // User ID from mock auth context
      );
    });

    it("WHEN the update succeeds THEN the applications query should be invalidated", async () => {
      // Arrange
      const mockApp = {
        appId: "app-1",
        userId: "user-1",
        userName: "John Doe",
        name: "Test App",
        description: "Test description",
        appUrl: "https://example.com",
        githubUrl: "https://github.com/test/repo",
        tags: ["react"],
        visibility: "public" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const updatedApp = {
        ...mockApp,
        tags: ["react", "vue"],
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(mockDataService, "getAllApplications").mockResolvedValue([
        mockApp,
      ]);
      vi.spyOn(mockDataService, "updateApplication").mockResolvedValue(
        updatedApp
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <MockAuthProvider>{children}</MockAuthProvider>
        </QueryClientProvider>
      );

      // Act
      const { result } = renderHook(() => useUpdateApplication(), { wrapper });

      result.current.mutate({
        appId: "app-1",
        data: {
          name: "Test App",
          description: "Test description",
          appUrl: "https://example.com",
          githubUrl: "https://github.com/test/repo",
          tags: ["react", "vue"],
          visibility: "public",
        },
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify invalidateQueries was called with correct query keys
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["applications"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["applications", "user", "user-1"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["application", "app-1"],
      });
    });
  });
});
