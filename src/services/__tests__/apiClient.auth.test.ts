import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiClient, ApiClientError } from "../apiClient";
import { Auth } from "aws-amplify";

/**
 * Acceptance Tests for API Client Authentication Interceptor
 *
 * These tests follow BDD (Behavior-Driven Development) format using Given-When-Then
 * to validate the API client authentication behavior according to Requirements 6.2, 6.4
 */

// Mock AWS Amplify Auth
vi.mock("aws-amplify", () => ({
  Auth: {
    currentSession: vi.fn(),
  },
}));

describe("API Request Interceptor - Acceptance Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let apiClient: ApiClient;

  beforeEach(() => {
    // Mock the global fetch function
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Create API client instance with test base URL
    apiClient = new ApiClient({ baseURL: "https://api.test.com" });

    // Reset Auth mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 6.2: Authorization Header with Bearer Token", () => {
    it("GIVEN an authenticated user makes an API request WHEN the request is sent THEN the system should add the Authorization header with the current access token as a Bearer token", async () => {
      // GIVEN: User is authenticated with a valid token
      const mockAccessToken = "mock-access-token-12345";
      const mockSession = {
        getAccessToken: () => ({
          getJwtToken: () => mockAccessToken,
        }),
      };
      vi.mocked(Auth.currentSession).mockResolvedValueOnce(mockSession as any);

      // Mock successful API response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { id: 1, name: "Test" } }),
        headers: new Headers(),
      });

      // WHEN: An authenticated request is made
      await apiClient.request({
        method: "GET",
        endpoint: "/protected-resource",
        requiresAuth: true,
      });

      // THEN: Request should include Authorization header with Bearer token
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${mockAccessToken}`);
    });
  });

  describe("Requirement 6.4: Token Refresh on 401 Response", () => {
    it("GIVEN an API request returns a 401 Unauthorized response WHEN the response is received THEN the system should attempt to refresh the access token using Auth.currentSession", async () => {
      // GIVEN: First request returns 401, then token refresh succeeds
      const oldToken = "old-expired-token";
      const newToken = "new-refreshed-token";

      // First call returns old token
      const oldSession = {
        getAccessToken: () => ({
          getJwtToken: () => oldToken,
        }),
      };

      // Second call (after refresh) returns new token
      const newSession = {
        getAccessToken: () => ({
          getJwtToken: () => newToken,
        }),
      };

      vi.mocked(Auth.currentSession)
        .mockResolvedValueOnce(oldSession as any) // First call for initial request
        .mockResolvedValueOnce(newSession as any) // Second call for refresh
        .mockResolvedValueOnce(newSession as any); // Third call for retry

      // First request returns 401
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
        headers: new Headers(),
      });

      // Retry request succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { id: 1, name: "Test" } }),
        headers: new Headers(),
      });

      // WHEN: Request is made and receives 401
      const result = await apiClient.request({
        method: "GET",
        endpoint: "/protected-resource",
        requiresAuth: true,
      });

      // THEN: Auth.currentSession should be called to refresh token
      expect(Auth.currentSession).toHaveBeenCalledTimes(3); // Initial + refresh + retry
      expect(result.data).toEqual({ id: 1, name: "Test" });
    });

    it("GIVEN the token refresh succeeds WHEN the new token is obtained THEN the system should retry the original request with the new token", async () => {
      // GIVEN: Token refresh succeeds
      const oldToken = "old-expired-token";
      const newToken = "new-refreshed-token";

      const oldSession = {
        getAccessToken: () => ({
          getJwtToken: () => oldToken,
        }),
      };

      const newSession = {
        getAccessToken: () => ({
          getJwtToken: () => newToken,
        }),
      };

      vi.mocked(Auth.currentSession)
        .mockResolvedValueOnce(oldSession as any)
        .mockResolvedValueOnce(newSession as any)
        .mockResolvedValueOnce(newSession as any);

      // First request returns 401
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
        headers: new Headers(),
      });

      // Retry request succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { success: true } }),
        headers: new Headers(),
      });

      // WHEN: Request is retried with new token
      const result = await apiClient.request({
        method: "POST",
        endpoint: "/protected-action",
        data: { action: "test" },
        requiresAuth: true,
      });

      // THEN: Request should be retried and succeed
      expect(fetchMock).toHaveBeenCalledTimes(2); // Initial + retry
      expect(result.data).toEqual({ success: true });

      // Verify second request used new token
      const secondCallArgs = fetchMock.mock.calls[1];
      const headers = secondCallArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${newToken}`);
    });

    it("GIVEN the token refresh fails WHEN the refresh attempt completes THEN the system should redirect the user to the /auth page", async () => {
      // GIVEN: Token refresh fails
      const oldToken = "old-expired-token";

      const oldSession = {
        getAccessToken: () => ({
          getJwtToken: () => oldToken,
        }),
      };

      vi.mocked(Auth.currentSession)
        .mockResolvedValueOnce(oldSession as any) // Initial request
        .mockRejectedValueOnce(new Error("Refresh token expired")); // Refresh fails

      // First request returns 401
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: "UNAUTHORIZED", message: "Token expired" },
        }),
        headers: new Headers(),
      });

      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: "" } as any;

      // WHEN: Refresh fails
      try {
        await apiClient.request({
          method: "GET",
          endpoint: "/protected-resource",
          requiresAuth: true,
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        // THEN: Should redirect to /auth page
        expect(window.location.href).toBe("/auth");
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.code).toBe("UNAUTHORIZED");
        }
      }

      // Restore window.location
      window.location = originalLocation;
    });
  });

  describe("Public Endpoints (No Authentication)", () => {
    it("GIVEN a request to a public endpoint WHEN requiresAuth is false THEN the request should not include an Authorization header", async () => {
      // GIVEN: Public endpoint request
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { public: true } }),
        headers: new Headers(),
      });

      // WHEN: Request is made without authentication
      await apiClient.request({
        method: "GET",
        endpoint: "/public-data",
        requiresAuth: false,
      });

      // THEN: Request should not include Authorization header
      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBeNull();
      expect(Auth.currentSession).not.toHaveBeenCalled();
    });

    it("GIVEN a request without requiresAuth specified WHEN the request is made THEN the request should not include an Authorization header", async () => {
      // GIVEN: Request without requiresAuth specified (defaults to false)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { public: true } }),
        headers: new Headers(),
      });

      // WHEN: Request is made
      await apiClient.request({
        method: "GET",
        endpoint: "/public-data",
      });

      // THEN: Request should not include Authorization header
      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBeNull();
      expect(Auth.currentSession).not.toHaveBeenCalled();
    });
  });
});

describe("Request Interceptor Integration - Acceptance Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let apiClient: ApiClient;

  beforeEach(() => {
    // Mock the global fetch function
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Create API client instance with test base URL
    apiClient = new ApiClient({ baseURL: "https://api.test.com" });

    // Reset Auth mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authenticated Request Token Inclusion", () => {
    it("GIVEN a user is authenticated WHEN the API client makes an authenticated request THEN the request should include the access token in the Authorization header as a Bearer token", async () => {
      // GIVEN: User is authenticated
      const mockAccessToken = "authenticated-user-token";
      const mockSession = {
        getAccessToken: () => ({
          getJwtToken: () => mockAccessToken,
        }),
      };
      vi.mocked(Auth.currentSession).mockResolvedValueOnce(mockSession as any);

      // Mock successful API response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { message: "Success" } }),
        headers: new Headers(),
      });

      // WHEN: API client makes an authenticated request
      await apiClient.request({
        method: "POST",
        endpoint: "/api/protected",
        data: { test: "data" },
        requiresAuth: true,
      });

      // THEN: Request should include Bearer token in Authorization header
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${mockAccessToken}`);
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("Accept")).toBe("application/json");
    });
  });

  describe("Public Request Without Token", () => {
    it("GIVEN a user is not authenticated WHEN the API client makes a request to a public endpoint THEN the request should not include an Authorization header", async () => {
      // GIVEN: User is not authenticated (or endpoint is public)
      // Mock successful API response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { public: "data" } }),
        headers: new Headers(),
      });

      // WHEN: API client makes a public request
      await apiClient.request({
        method: "GET",
        endpoint: "/api/public",
        requiresAuth: false,
      });

      // THEN: Request should not include Authorization header
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBeNull();
      expect(Auth.currentSession).not.toHaveBeenCalled();
    });

    it("GIVEN a user makes a request without specifying requiresAuth WHEN the request is made THEN the request should not include an Authorization header", async () => {
      // GIVEN: Request without requiresAuth specified
      // Mock successful API response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { default: "behavior" } }),
        headers: new Headers(),
      });

      // WHEN: API client makes a request (requiresAuth defaults to false)
      await apiClient.request({
        method: "GET",
        endpoint: "/api/default",
      });

      // THEN: Request should not include Authorization header
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Authorization")).toBeNull();
      expect(Auth.currentSession).not.toHaveBeenCalled();
    });
  });
});
