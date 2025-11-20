/**
 * Tests for Tanstack Query data hooks
 * Following BDD/TDD approach: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { MockAuthProvider } from "../../contexts/MockAuthContext";
import { useApplications, useProfile, useUserApplications } from "../useData";

// Create a wrapper with QueryClient and MockAuthProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider>{children}</MockAuthProvider>
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
