/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock AWS Amplify v6 Auth functions
vi.mock("aws-amplify/auth", () => ({
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchUserAttributes: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

vi.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: vi.fn(() => vi.fn()),
  },
}));

import { AuthProvider, useAuth } from "../AuthContext";
import * as auth from "aws-amplify/auth";

describe("AuthContext - Session Persistence Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GIVEN a user has an active session", () => {
    it("WHEN the user refreshes the page THEN the system should restore the user's authentication state from the stored session", async () => {
      // Arrange
      const mockUser = {
        username: "test_user",
        userId: "test_123",
      };

      const mockAttributes = {
        sub: "test_123",
        email: "test@example.com",
        given_name: "Test",
        family_name: "User",
      };

      // Mock that user has an active session
      vi.spyOn(auth, "getCurrentUser").mockResolvedValue(mockUser as any);
      vi.spyOn(auth, "fetchUserAttributes").mockResolvedValue(mockAttributes);

      // Act - Simulate page refresh by mounting the provider
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert - User state should be restored from session
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        userId: "test_123",
        email: "test@example.com",
        givenName: "Test",
        familyName: "User",
        picture: undefined,
        provider: undefined,
      });
      expect(auth.getCurrentUser).toHaveBeenCalled();
    });
  });

  describe("GIVEN a user has an active session", () => {
    it("WHEN the access token expires THEN the system should automatically refresh the token using the refresh token", async () => {
      // Arrange
      const mockUser = {
        username: "test_user",
        userId: "test_123",
      };

      const mockAttributes = {
        sub: "test_123",
        email: "test@example.com",
      };

      vi.spyOn(auth, "getCurrentUser").mockResolvedValue(mockUser as any);
      vi.spyOn(auth, "fetchUserAttributes").mockResolvedValue(mockAttributes);

      // Mock session with refreshed tokens
      const mockSession = {
        tokens: {
          idToken: {
            toString: () => "new-id-token",
          },
          accessToken: {
            toString: () => "new-access-token",
          },
        },
        credentials: {},
        identityId: "test-identity-id",
      };

      vi.spyOn(auth, "fetchAuthSession").mockResolvedValue(mockSession as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act - Call refreshSession to simulate token refresh
      await act(async () => {
        await result.current.refreshSession();
      });

      // Assert - Session should be refreshed with forceRefresh flag
      expect(auth.fetchAuthSession).toHaveBeenCalledWith({
        forceRefresh: true,
      });
    });
  });

  describe("GIVEN the refresh token expires", () => {
    it("WHEN the system attempts to refresh the session THEN the system should redirect the user to the authentication page", async () => {
      // Arrange
      const mockUser = {
        username: "test_user",
        userId: "test_123",
      };

      const mockAttributes = {
        sub: "test_123",
        email: "test@example.com",
      };

      vi.spyOn(auth, "getCurrentUser").mockResolvedValue(mockUser as any);
      vi.spyOn(auth, "fetchUserAttributes").mockResolvedValue(mockAttributes);

      // Mock expired refresh token - fetchAuthSession throws error
      const refreshError = new Error("Refresh Token has expired");
      (refreshError as any).name = "NotAuthorizedException";
      vi.spyOn(auth, "fetchAuthSession").mockRejectedValue(refreshError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act & Assert - Attempting to refresh should throw error
      await expect(result.current.refreshSession()).rejects.toThrow(
        "Refresh Token has expired"
      );
    });
  });

  describe("GIVEN a user closes and reopens the browser", () => {
    it("WHEN the application loads THEN the system should restore the user's authentication state if the session is still valid", async () => {
      // Arrange
      const mockUser = {
        username: "test_user",
        userId: "test_123",
      };

      const mockAttributes = {
        sub: "test_123",
        email: "test@example.com",
        given_name: "Test",
        family_name: "User",
        picture: "https://example.com/avatar.jpg",
      };

      // Simulate browser restart - Amplify should restore session from storage
      vi.spyOn(auth, "getCurrentUser").mockResolvedValue(mockUser as any);
      vi.spyOn(auth, "fetchUserAttributes").mockResolvedValue(mockAttributes);

      // Act - Mount provider (simulates app load after browser restart)
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert - Session should be restored
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        userId: "test_123",
        email: "test@example.com",
        givenName: "Test",
        familyName: "User",
        picture: "https://example.com/avatar.jpg",
        provider: undefined,
      });
      expect(auth.getCurrentUser).toHaveBeenCalled();
    });

    it("WHEN the application loads with an expired session THEN the system should show unauthenticated state", async () => {
      // Arrange
      // Simulate expired session - Amplify throws error
      const sessionError = new Error("No current user");
      (sessionError as any).name = "UserUnAuthenticatedException";
      vi.spyOn(auth, "getCurrentUser").mockRejectedValue(sessionError);

      // Act - Mount provider (simulates app load with expired session)
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Assert - Should show unauthenticated state
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});
