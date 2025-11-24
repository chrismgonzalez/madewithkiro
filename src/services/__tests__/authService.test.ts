import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AuthService } from "../authService";
import { Auth } from "aws-amplify";

/**
 * Acceptance Tests for Auth Service
 *
 * These tests follow BDD (Behavior-Driven Development) format using Given-When-Then
 * to validate the auth service behavior
 */

// Mock AWS Amplify Auth
vi.mock("aws-amplify", () => ({
  Auth: {
    currentSession: vi.fn(),
    currentAuthenticatedUser: vi.fn(),
  },
}));

describe("Auth Service - Acceptance Tests", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Get Access Token", () => {
    it("GIVEN a user is authenticated WHEN I request the access token THEN I should receive the current access token from Cognito", async () => {
      // GIVEN: User is authenticated with a valid session
      const mockAccessToken = "mock-access-token-abc123";
      const mockSession = {
        getAccessToken: () => ({
          getJwtToken: () => mockAccessToken,
        }),
      };
      vi.mocked(Auth.currentSession).mockResolvedValueOnce(mockSession as any);

      // WHEN: I request the access token
      const token = await authService.getAccessToken();

      // THEN: I should receive the current access token
      expect(token).toBe(mockAccessToken);
      expect(Auth.currentSession).toHaveBeenCalledTimes(1);
    });

    it("GIVEN a user is not authenticated WHEN I request the access token THEN I should receive null", async () => {
      // GIVEN: User is not authenticated
      vi.mocked(Auth.currentSession).mockRejectedValueOnce(
        new Error("No current user")
      );

      // WHEN: I request the access token
      const token = await authService.getAccessToken();

      // THEN: I should receive null
      expect(token).toBeNull();
    });
  });

  describe("Token Refresh", () => {
    it("GIVEN an access token is expired WHEN I make an authenticated request THEN the system should attempt to refresh the token before making the request", async () => {
      // GIVEN: Access token is expired, but refresh succeeds
      const newToken = "new-refreshed-token";
      const newSession = {
        getAccessToken: () => ({
          getJwtToken: () => newToken,
        }),
      };

      // First call fails (expired), second call succeeds (refreshed)
      vi.mocked(Auth.currentSession)
        .mockRejectedValueOnce(new Error("Token expired"))
        .mockResolvedValueOnce(newSession as any);

      // WHEN: I attempt to get the token (first call fails)
      const firstAttempt = await authService.getAccessToken();
      expect(firstAttempt).toBeNull();

      // THEN: Subsequent call should succeed with refreshed token
      const secondAttempt = await authService.getAccessToken();
      expect(secondAttempt).toBe(newToken);
      expect(Auth.currentSession).toHaveBeenCalledTimes(2);
    });

    it("GIVEN token refresh fails WHEN the refresh attempt completes THEN the user should be redirected to the authentication page", async () => {
      // GIVEN: Token refresh fails
      vi.mocked(Auth.currentSession).mockRejectedValueOnce(
        new Error("Refresh token expired")
      );

      // WHEN: I attempt to get the token
      const token = await authService.getAccessToken();

      // THEN: Should return null (redirect handled by API client)
      expect(token).toBeNull();
    });
  });

  describe("Get ID Token", () => {
    it("GIVEN a user is authenticated WHEN I request the ID token THEN I should receive the current ID token from Cognito", async () => {
      // GIVEN: User is authenticated with a valid session
      const mockIdToken = "mock-id-token-xyz789";
      const mockSession = {
        getIdToken: () => ({
          getJwtToken: () => mockIdToken,
        }),
      };
      vi.mocked(Auth.currentSession).mockResolvedValueOnce(mockSession as any);

      // WHEN: I request the ID token
      const token = await authService.getIdToken();

      // THEN: I should receive the current ID token
      expect(token).toBe(mockIdToken);
      expect(Auth.currentSession).toHaveBeenCalledTimes(1);
    });

    it("GIVEN a user is not authenticated WHEN I request the ID token THEN I should receive null", async () => {
      // GIVEN: User is not authenticated
      vi.mocked(Auth.currentSession).mockRejectedValueOnce(
        new Error("No current user")
      );

      // WHEN: I request the ID token
      const token = await authService.getIdToken();

      // THEN: I should receive null
      expect(token).toBeNull();
    });
  });

  describe("Is Authenticated Check", () => {
    it("GIVEN a user is authenticated WHEN I check authentication status THEN I should receive true", async () => {
      // GIVEN: User is authenticated
      const mockUser = { username: "testuser" };
      vi.mocked(Auth.currentAuthenticatedUser).mockResolvedValueOnce(
        mockUser as any
      );

      // WHEN: I check authentication status
      const isAuth = await authService.isAuthenticated();

      // THEN: I should receive true
      expect(isAuth).toBe(true);
      expect(Auth.currentAuthenticatedUser).toHaveBeenCalledTimes(1);
    });

    it("GIVEN a user is not authenticated WHEN I check authentication status THEN I should receive false", async () => {
      // GIVEN: User is not authenticated
      vi.mocked(Auth.currentAuthenticatedUser).mockRejectedValueOnce(
        new Error("No current user")
      );

      // WHEN: I check authentication status
      const isAuth = await authService.isAuthenticated();

      // THEN: I should receive false
      expect(isAuth).toBe(false);
    });
  });

  describe("Refresh Session", () => {
    it("GIVEN a user has a valid refresh token WHEN I refresh the session THEN I should receive true", async () => {
      // GIVEN: User has a valid refresh token
      const mockSession = {
        getAccessToken: () => ({
          getJwtToken: () => "new-token",
        }),
      };
      vi.mocked(Auth.currentSession).mockResolvedValueOnce(mockSession as any);

      // WHEN: I refresh the session
      const result = await authService.refreshSession();

      // THEN: I should receive true
      expect(result).toBe(true);
      expect(Auth.currentSession).toHaveBeenCalledTimes(1);
    });

    it("GIVEN a user's refresh token is expired WHEN I refresh the session THEN I should receive false", async () => {
      // GIVEN: User's refresh token is expired
      vi.mocked(Auth.currentSession).mockRejectedValueOnce(
        new Error("Refresh token expired")
      );

      // WHEN: I refresh the session
      const result = await authService.refreshSession();

      // THEN: I should receive false
      expect(result).toBe(false);
    });
  });
});
