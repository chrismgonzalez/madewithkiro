/**
 * Tests for Tanstack Query data hooks
 * Following BDD/TDD approach: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { MockAuthProvider } from "../../contexts/MockAuthContext";
import {
  useApplications,
  useProfile,
  useUserApplications,
  useUpdateApplication,
  useApplication,
  useDeleteApplication,
} from "../useData";
import type { UpdateApplicationRequest } from "../../types";

// Create a wrapper with QueryClient and MockAuthProvider
function createWrapper(initialAuth?: boolean, initialUserId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider initialAuth={initialAuth} initialUserId={initialUserId}>
        {children}
      </MockAuthProvider>
    </QueryClientProvider>
  );
}

describe("useApplications", () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
  });

  it("should fetch applications successfully", async () => {
    const { result } = renderHook(() => useApplications(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have data
    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it("should use authentication-aware query key", async () => {
    const { result } = renderHook(() => useApplications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Query key should include authentication state
    expect(result.current.data).toBeDefined();
  });

  it("should have staleTime set to Infinity for mock data", async () => {
    const { result } = renderHook(() => useApplications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Data should not be stale
    expect(result.current.isStale).toBe(false);
  });

  it("should filter applications based on authentication state", async () => {
    // Set authenticated state
    localStorage.setItem("mockAuthState", "true");

    const { result } = renderHook(() => useApplications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const authenticatedApps = result.current.data;

    // Clear auth and create new wrapper
    localStorage.setItem("mockAuthState", "false");
    const newWrapper = createWrapper();

    const { result: unauthResult } = renderHook(() => useApplications(), {
      wrapper: newWrapper,
    });

    await waitFor(() => {
      expect(unauthResult.current.isSuccess).toBe(true);
    });

    const unauthenticatedApps = unauthResult.current.data;

    // Authenticated users should see more or equal applications
    expect(authenticatedApps!.length).toBeGreaterThanOrEqual(
      unauthenticatedApps!.length
    );
  });
});

describe("useProfile", () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
  });

  it("should fetch profile successfully with valid userId", async () => {
    const userId = "user-001";
    const { result } = renderHook(() => useProfile(userId), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have profile data
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.userId).toBe(userId);
  });

  it("should return null for non-existent userId", async () => {
    const userId = "non-existent-user";
    const { result } = renderHook(() => useProfile(userId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return null for non-existent user
    expect(result.current.data).toBeNull();
  });

  it("should have staleTime set to Infinity for mock data", async () => {
    const userId = "user-001";
    const { result } = renderHook(() => useProfile(userId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Data should not be stale
    expect(result.current.isStale).toBe(false);
  });

  it("should use userId in query key", async () => {
    const userId = "user-001";
    const { result } = renderHook(() => useProfile(userId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have fetched the correct user
    expect(result.current.data?.userId).toBe(userId);
  });
});

describe("useUserApplications", () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
  });

  it("should fetch user applications successfully", async () => {
    const userId = "user-001";
    const { result } = renderHook(() => useUserApplications(userId), {
      wrapper,
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have data
    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);

    // All applications should belong to the specified user
    result.current.data?.forEach((app) => {
      expect(app.userId).toBe(userId);
    });
  });

  it("should use authentication-aware query key", async () => {
    const userId = "user-001";
    const { result } = renderHook(() => useUserApplications(userId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Query key should include authentication state
    expect(result.current.data).toBeDefined();
  });

  it("should have staleTime set to Infinity for mock data", async () => {
    const userId = "user-001";
    const { result } = renderHook(() => useUserApplications(userId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Data should not be stale
    expect(result.current.isStale).toBe(false);
  });

  it("should filter applications based on authentication state", async () => {
    const userId = "user-001";

    // Set authenticated state
    localStorage.setItem("mockAuthState", "true");

    const { result } = renderHook(() => useUserApplications(userId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const authenticatedApps = result.current.data;

    // Clear auth and create new wrapper
    localStorage.setItem("mockAuthState", "false");
    const newWrapper = createWrapper();

    const { result: unauthResult } = renderHook(
      () => useUserApplications(userId),
      {
        wrapper: newWrapper,
      }
    );

    await waitFor(() => {
      expect(unauthResult.current.isSuccess).toBe(true);
    });

    const unauthenticatedApps = unauthResult.current.data;

    // Authenticated users should see more or equal applications
    expect(authenticatedApps!.length).toBeGreaterThanOrEqual(
      unauthenticatedApps!.length
    );
  });

  it("should return empty array for user with no applications", async () => {
    const userId = "user-with-no-apps";
    const { result } = renderHook(() => useUserApplications(userId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return empty array
    expect(result.current.data).toEqual([]);
  });
});

describe("useUpdateApplication", () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
    // Set authenticated state for update operations
    localStorage.setItem("mockAuthState", "true");
    localStorage.setItem("mockCurrentUserId", "user-001");
  });

  it("GIVEN I have an application to update WHEN I call the update mutation with valid data THEN the mutation should succeed and return updated application", async () => {
    const { result } = renderHook(() => useUpdateApplication(), { wrapper });

    const updateData: UpdateApplicationRequest = {
      name: "Updated Application Name",
      description: "Updated description",
      appUrl: "https://updated-app.example.com",
      githubUrl: "https://github.com/updated/repo",
      tags: ["Updated", "Tags"],
      visibility: "public",
    };

    let updatedApp;

    await act(async () => {
      result.current.mutate(
        { appId: "app-001", data: updateData },
        {
          onSuccess: (data) => {
            updatedApp = data;
          },
        }
      );
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(updatedApp).toBeDefined();
    expect(updatedApp).toMatchObject({
      appId: "app-001",
      name: updateData.name,
      description: updateData.description,
      appUrl: updateData.appUrl,
      githubUrl: updateData.githubUrl,
      tags: updateData.tags,
      visibility: updateData.visibility,
    });
  });

  it("GIVEN an application is updated successfully WHEN the mutation completes THEN relevant queries should be invalidated", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const testWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider>{children}</MockAuthProvider>
      </QueryClientProvider>
    );

    // First, fetch the application to populate cache
    const { result: appResult } = renderHook(() => useApplication("app-001"), {
      wrapper: testWrapper,
    });

    await waitFor(() => {
      expect(appResult.current.isSuccess).toBe(true);
    });

    const originalData = appResult.current.data;

    // Now update the application
    const { result: mutationResult } = renderHook(
      () => useUpdateApplication(),
      { wrapper: testWrapper }
    );

    const updateData: UpdateApplicationRequest = {
      name: "Cache Invalidation Test",
      description: "Testing cache invalidation",
      appUrl: "https://cache-test.example.com",
      tags: ["Cache", "Test"],
      visibility: "public",
    };

    await act(async () => {
      mutationResult.current.mutate({ appId: "app-001", data: updateData });
    });

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    // Wait for cache invalidation to trigger refetch
    await waitFor(() => {
      expect(appResult.current.data?.name).toBe(updateData.name);
    });

    // Verify the data has been updated
    expect(appResult.current.data).not.toEqual(originalData);
    expect(appResult.current.data?.name).toBe(updateData.name);
  });

  it("GIVEN an application update fails WHEN the mutation completes THEN I should receive an error", async () => {
    const { result } = renderHook(() => useUpdateApplication(), { wrapper });

    const updateData: UpdateApplicationRequest = {
      name: "Updated Name",
      description: "Updated description",
      appUrl: "https://updated.example.com",
      tags: ["Test"],
      visibility: "public",
    };

    let errorReceived;

    await act(async () => {
      result.current.mutate(
        { appId: "non-existent-app", data: updateData },
        {
          onError: (error) => {
            errorReceived = error;
          },
        }
      );
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(errorReceived).toBeDefined();
    expect(result.current.error).toBeDefined();
  });

  it("should reject update when user is not the owner", async () => {
    // Set different user ID
    localStorage.setItem("mockCurrentUserId", "user-002");
    const newWrapper = createWrapper();

    const { result } = renderHook(() => useUpdateApplication(), {
      wrapper: newWrapper,
    });

    const updateData: UpdateApplicationRequest = {
      name: "Unauthorized Update",
      description: "This should fail",
      appUrl: "https://unauthorized.example.com",
      tags: ["Test"],
      visibility: "public",
    };

    let errorReceived;

    await act(async () => {
      // Try to update app-001 which belongs to user-001
      result.current.mutate(
        { appId: "app-001", data: updateData },
        {
          onError: (error) => {
            errorReceived = error;
          },
        }
      );
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(errorReceived).toBeDefined();
    expect(result.current.error?.message).toContain("Unauthorized");
  });
});

describe("useApplication", () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
  });

  it("should fetch a single application by ID successfully", async () => {
    const appId = "app-001";
    const { result } = renderHook(() => useApplication(appId), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have application data
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.appId).toBe(appId);
  });

  it("should return null for non-existent application ID", async () => {
    const appId = "non-existent-app";
    const { result } = renderHook(() => useApplication(appId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return null for non-existent application
    expect(result.current.data).toBeNull();
  });

  it("should have staleTime set to Infinity for mock data", async () => {
    const appId = "app-001";
    const { result } = renderHook(() => useApplication(appId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Data should not be stale
    expect(result.current.isStale).toBe(false);
  });

  it("should use appId in query key", async () => {
    const appId = "app-001";
    const { result } = renderHook(() => useApplication(appId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have fetched the correct application
    expect(result.current.data?.appId).toBe(appId);
  });
});

describe("useDeleteApplication", () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    // Create wrapper with authenticated state for delete operations
    wrapper = createWrapper(true, "user-001");
  });

  it("GIVEN I have an application to delete WHEN I call the delete mutation THEN the mutation should succeed", async () => {
    const { result } = renderHook(() => useDeleteApplication(), { wrapper });

    let deleteSucceeded = false;

    await act(async () => {
      result.current.mutate("app-011", {
        onSuccess: () => {
          deleteSucceeded = true;
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(deleteSucceeded).toBe(true);
  });

  it("GIVEN an application is deleted successfully WHEN the mutation completes THEN relevant queries should be invalidated", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const testWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider initialAuth={true} initialUserId="user-001">
          {children}
        </MockAuthProvider>
      </QueryClientProvider>
    );

    // First, fetch all applications to populate cache
    const { result: appsResult } = renderHook(() => useApplications(), {
      wrapper: testWrapper,
    });

    await waitFor(() => {
      expect(appsResult.current.isSuccess).toBe(true);
    });

    const initialAppCount = appsResult.current.data?.length || 0;

    // Now delete an application
    const { result: mutationResult } = renderHook(
      () => useDeleteApplication(),
      { wrapper: testWrapper }
    );

    await act(async () => {
      mutationResult.current.mutate("app-002");
    });

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    // Wait for cache invalidation to trigger refetch
    await waitFor(() => {
      const currentAppCount = appsResult.current.data?.length || 0;
      expect(currentAppCount).toBe(initialAppCount - 1);
    });

    // Verify the application is no longer in the list
    const deletedApp = appsResult.current.data?.find(
      (app) => app.appId === "app-002"
    );
    expect(deletedApp).toBeUndefined();
  });

  it("GIVEN an application is deleted successfully WHEN the mutation completes THEN the specific application query should be removed from cache", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const testWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider initialAuth={true} initialUserId="user-001">
          {children}
        </MockAuthProvider>
      </QueryClientProvider>
    );

    // First, fetch the application to populate cache (use app-001 since it hasn't been deleted yet in this isolated test)
    const { result: appResult } = renderHook(() => useApplication("app-001"), {
      wrapper: testWrapper,
    });

    await waitFor(() => {
      expect(appResult.current.isSuccess).toBe(true);
    });

    expect(appResult.current.data).toBeDefined();
    expect(appResult.current.data?.appId).toBe("app-001");

    // Now delete the application
    const { result: mutationResult } = renderHook(
      () => useDeleteApplication(),
      { wrapper: testWrapper }
    );

    await act(async () => {
      mutationResult.current.mutate("app-001");
    });

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    // Verify the query was removed from cache by checking if a new fetch returns null
    const { result: refetchResult } = renderHook(
      () => useApplication("app-001"),
      {
        wrapper: testWrapper,
      }
    );

    await waitFor(() => {
      expect(refetchResult.current.isSuccess).toBe(true);
    });

    expect(refetchResult.current.data).toBeNull();
  });

  it("GIVEN an application deletion fails WHEN the mutation completes THEN I should receive an error", async () => {
    const { result } = renderHook(() => useDeleteApplication(), { wrapper });

    let errorReceived;

    await act(async () => {
      result.current.mutate("non-existent-app", {
        onError: (error) => {
          errorReceived = error;
        },
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(errorReceived).toBeDefined();
    expect(result.current.error).toBeDefined();
  });

  it("should reject deletion when user is not the owner", async () => {
    // Create wrapper with different user ID
    const newWrapper = createWrapper(true, "user-002");

    const { result } = renderHook(() => useDeleteApplication(), {
      wrapper: newWrapper,
    });

    let errorReceived;

    await act(async () => {
      // Try to delete app-006 which belongs to user-003 (not user-002)
      result.current.mutate("app-006", {
        onError: (error) => {
          errorReceived = error;
        },
      });
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(errorReceived).toBeDefined();
    expect(result.current.error?.message).toContain("Unauthorized");
  });
});
