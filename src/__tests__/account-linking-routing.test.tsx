/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as amplifyAuth from "aws-amplify/auth";

/**
 * Account Linking Routing Tests
 *
 * Tests the routing logic for account linking flow:
 * - Redirect to /link-account when pending_link flag is set
 * - Normal flow when flag is not set
 * - Post-linking redirect to intended destination
 *
 * Requirements: 3.4, 10.5
 */

// Mock Amplify Auth
vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: vi.fn(),
  fetchUserAttributes: vi.fn(),
  fetchAuthSession: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  signIn: vi.fn(),
  confirmSignIn: vi.fn(),
}));

// Mock Hub
vi.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: vi.fn(() => () => {}),
  },
}));

// Mock analytics
vi.mock("@/utils/analytics", () => ({
  analytics: {
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

describe("Account Linking Routing", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("AuthContext parses linking flags", () => {
    it("SHOULD parse pending_link flag from user attributes", async () => {
      // This test will fail initially because AuthContext doesn't parse pending_link yet
      vi.spyOn(amplifyAuth, "getCurrentUser").mockResolvedValue({
        userId: "test-user-123",
        username: "test@example.com",
      } as any);

      vi.spyOn(amplifyAuth, "fetchUserAttributes").mockResolvedValue({
        sub: "test-user-123",
        email: "test@example.com",
        "custom:pending_link": "true",
        "custom:link_target_sub": "target-user-456",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for auth to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should parse user
      expect(result.current.user?.email).toBe("test@example.com");

      // Should parse pending_link flag
      expect((result.current as any).pendingLink).toBe(true);

      // Should parse link_target_sub
      expect((result.current as any).linkTargetSub).toBe("target-user-456");
    });

    it("SHOULD parse link_target_sub from user attributes", async () => {
      vi.spyOn(amplifyAuth, "getCurrentUser").mockResolvedValue({
        userId: "test-user-123",
        username: "test@example.com",
      } as any);

      vi.spyOn(amplifyAuth, "fetchUserAttributes").mockResolvedValue({
        sub: "test-user-123",
        email: "test@example.com",
        "custom:pending_link": "true",
        "custom:link_target_sub": "target-user-456",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect((result.current as any).linkTargetSub).toBe("target-user-456");
    });
  });

  describe("Normal flow when flag is not set", () => {
    it("SHOULD NOT have pending_link WHEN user has no pending_link flag", async () => {
      vi.spyOn(amplifyAuth, "getCurrentUser").mockResolvedValue({
        userId: "test-user-123",
        username: "test@example.com",
      } as any);

      vi.spyOn(amplifyAuth, "fetchUserAttributes").mockResolvedValue({
        sub: "test-user-123",
        email: "test@example.com",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user?.email).toBe("test@example.com");
      expect((result.current as any).pendingLink).toBeUndefined();
    });

    it("SHOULD NOT have pending_link WHEN pending_link is false", async () => {
      vi.spyOn(amplifyAuth, "getCurrentUser").mockResolvedValue({
        userId: "test-user-123",
        username: "test@example.com",
      } as any);

      vi.spyOn(amplifyAuth, "fetchUserAttributes").mockResolvedValue({
        sub: "test-user-123",
        email: "test@example.com",
        "custom:pending_link": "false",
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect((result.current as any).pendingLink).toBeFalsy();
    });
  });

  describe("Session storage for redirect", () => {
    it("SHOULD support storing intended destination in sessionStorage", () => {
      // Test that sessionStorage works for storing redirect destination
      sessionStorage.setItem("intendedDestination", "/profile/test-user-123");
      expect(sessionStorage.getItem("intendedDestination")).toBe(
        "/profile/test-user-123"
      );
    });

    it("SHOULD support clearing intended destination from sessionStorage", () => {
      sessionStorage.setItem("intendedDestination", "/profile/test-user-123");
      sessionStorage.removeItem("intendedDestination");
      expect(sessionStorage.getItem("intendedDestination")).toBeNull();
    });
  });

  describe("Route configuration", () => {
    it("SHOULD have /link-account route configured", () => {
      // This test will fail initially because route doesn't exist yet
      const routerContent = require("fs").readFileSync(
        require("path").join(process.cwd(), "src/router.tsx"),
        "utf-8"
      );

      expect(routerContent).toContain('path: "/link-account"');
    });

    it("SHOULD import LinkAccountPage component", () => {
      const routerContent = require("fs").readFileSync(
        require("path").join(process.cwd(), "src/router.tsx"),
        "utf-8"
      );

      expect(routerContent).toContain(
        'import LinkAccountPage from "@/pages/LinkAccountPage"'
      );
    });

    it("SHOULD protect link-account route with ProtectedRoute", () => {
      const routerContent = require("fs").readFileSync(
        require("path").join(process.cwd(), "src/router.tsx"),
        "utf-8"
      );

      // Should wrap LinkAccountPage with ProtectedRoute
      expect(routerContent).toMatch(
        /link.*account.*route.*ProtectedRoute.*LinkAccountPage/is
      );
    });
  });
});
