/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useApplications } from "../useApplications";
import * as applicationServiceModule from "@/services/applicationService";
import type { Application, CreateApplicationRequest } from "@/types";

// Mock the application service
vi.mock("@/services/applicationService", () => ({
  applicationService: {
    listApplications: vi.fn(),
    createApplication: vi.fn(),
  },
}));

const applicationService = applicationServiceModule.applicationService as any;

describe("useApplications Hook - Acceptance Tests", () => {
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

  describe("GIVEN I use the useApplications hook", () => {
    it("WHEN the hook initializes THEN it should fetch all applications from the API", async () => {
      // Arrange
      const mockApplications: Application[] = [
        {
          appId: "app-001",
          userId: "user-001",
          userName: "Test User",
          name: "Test App 1",
          description: "Description 1",
          appUrl: "https://app1.example.com",
          tags: ["react", "typescript"],
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          appId: "app-002",
          userId: "user-002",
          userName: "Another User",
          name: "Test App 2",
          description: "Description 2",
          appUrl: "https://app2.example.com",
          tags: ["vue", "javascript"],
          createdAt: "2024-01-02T00:00:00Z",
        },
      ];

      applicationService.listApplications.mockResolvedValue(mockApplications);

      // Act
      const { result } = renderHook(() => useApplications(), {
        wrapper,
      });

      // Assert - Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.applications).toEqual([]);

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Data loaded
      expect(result.current.applications).toEqual(mockApplications);
      expect(applicationService.listApplications).toHaveBeenCalledWith(
        undefined
      );
      expect(applicationService.listApplications).toHaveBeenCalledTimes(1);
    });
  });

  describe("GIVEN I use the useApplications hook with a userId", () => {
    it("WHEN the hook initializes THEN it should fetch that user's applications from the API", async () => {
      // Arrange
      const mockApplications: Application[] = [
        {
          appId: "app-001",
          userId: "test-user-001",
          userName: "Test User",
          name: "Test App 1",
          description: "Description 1",
          appUrl: "https://app1.example.com",
          tags: ["react", "typescript"],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      applicationService.listApplications.mockResolvedValue(mockApplications);

      // Act
      const { result } = renderHook(() => useApplications("test-user-001"), {
        wrapper,
      });

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Data loaded with userId filter
      expect(result.current.applications).toEqual(mockApplications);
      expect(applicationService.listApplications).toHaveBeenCalledWith(
        "test-user-001"
      );
      expect(applicationService.listApplications).toHaveBeenCalledTimes(1);
    });
  });

  describe("GIVEN I call createApplication with new data", () => {
    it("WHEN the mutation executes THEN the application should be added to the gallery immediately with a pending indicator", async () => {
      // Arrange
      const mockApplications: Application[] = [
        {
          appId: "app-001",
          userId: "user-001",
          userName: "Test User",
          name: "Existing App",
          description: "Description",
          appUrl: "https://app1.example.com",
          tags: ["react"],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      const newAppData: CreateApplicationRequest = {
        userId: "test-user-001",
        name: "New App",
        description: "New Description",
        appUrl: "https://newapp.example.com",
        tags: ["typescript"],
      };

      applicationService.listApplications.mockResolvedValue(mockApplications);
      // Delay the creation to observe optimistic update
      applicationService.createApplication.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  appId: "app-002",
                  userId: "test-user-001",
                  userName: "Test User",
                  name: "New App",
                  description: "New Description",
                  appUrl: "https://newapp.example.com",
                  tags: ["typescript"],
                  createdAt: "2024-01-03T00:00:00Z",
                }),
              100
            )
          )
      );

      // Act
      const { result } = renderHook(() => useApplications(), {
        wrapper,
      });

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.applications).toEqual(mockApplications);
      });

      // Trigger creation
      result.current.createApplication(newAppData);

      // Assert - Optimistic update should add the app immediately with pending indicator
      await waitFor(() => {
        expect(result.current.applications.length).toBe(2);
      });

      const optimisticApp = result.current.applications.find(
        (app) => app.name === "New App"
      );
      expect(optimisticApp).toBeDefined();
      expect(optimisticApp?.isPending).toBe(true);
      expect(result.current.isCreating).toBe(true);
    });
  });

  describe("GIVEN an application creation API call succeeds", () => {
    it("WHEN the response is received THEN the pending application should be replaced with the confirmed data from the server", async () => {
      // Arrange
      const mockApplications: Application[] = [];

      const newAppData: CreateApplicationRequest = {
        userId: "test-user-001",
        name: "New App",
        description: "New Description",
        appUrl: "https://newapp.example.com",
        tags: ["typescript"],
      };

      const createdApp: Application = {
        appId: "app-002",
        userId: "test-user-001",
        userName: "Test User",
        name: "New App",
        description: "New Description",
        appUrl: "https://newapp.example.com",
        tags: ["typescript"],
        createdAt: "2024-01-03T00:00:00Z",
      };

      // Mock both initial fetch and refetch
      let callCount = 0;
      applicationService.listApplications.mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          callCount === 1 ? mockApplications : [createdApp]
        );
      });
      applicationService.createApplication.mockResolvedValue(createdApp);

      // Act
      const { result } = renderHook(() => useApplications(), {
        wrapper,
      });

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger creation
      result.current.createApplication(newAppData);

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      // Assert - No error occurred
      expect(result.current.error).toBeNull();

      // The application should eventually be in the list after refetch
      await waitFor(() => {
        expect(result.current.applications.length).toBe(1);
      });

      const confirmedApp = result.current.applications[0];
      expect(confirmedApp.appId).toBe("app-002");
      expect(confirmedApp.isPending).toBeUndefined();
    });
  });

  describe("GIVEN an application creation API call fails", () => {
    it("WHEN the error is received THEN the optimistic application should be removed and an error message should be displayed", async () => {
      // Arrange
      const mockApplications: Application[] = [
        {
          appId: "app-001",
          userId: "user-001",
          userName: "Test User",
          name: "Existing App",
          description: "Description",
          appUrl: "https://app1.example.com",
          tags: ["react"],
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      const newAppData: CreateApplicationRequest = {
        userId: "test-user-001",
        name: "New App",
        description: "New Description",
        appUrl: "https://newapp.example.com",
        tags: ["typescript"],
      };

      const mockError = new Error("Failed to create application");

      applicationService.listApplications.mockResolvedValue(mockApplications);
      applicationService.createApplication.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() => useApplications(), {
        wrapper,
      });

      // Wait for initial data
      await waitFor(() => {
        expect(result.current.applications).toEqual(mockApplications);
      });

      // Trigger creation and catch the error
      result.current.createApplication(newAppData).catch(() => {
        // Expected to fail
      });

      // Wait for mutation to fail
      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      // Assert - Should revert to original data (optimistic app removed)
      expect(result.current.applications).toEqual(mockApplications);
      expect(result.current.error).toBeTruthy();
    });
  });
});
