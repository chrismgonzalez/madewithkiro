import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiClient, ApiClientError } from "../apiClient";

/**
 * Acceptance Tests for API Client
 *
 * These tests follow BDD (Behavior-Driven Development) format using Given-When-Then
 * to validate the API client behavior according to Requirements 1.1-1.5
 */

describe("API Client - Acceptance Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let apiClient: ApiClient;

  beforeEach(() => {
    // Mock the global fetch function
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Create API client instance with test base URL
    apiClient = new ApiClient({ baseURL: "https://api.test.com" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 1.2: Standard Headers", () => {
    it("GIVEN the API client is initialized WHEN I make any request THEN the request should include Content-Type and Accept headers", async () => {
      // GIVEN: API client is initialized
      // Mock successful response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: "test" }),
        headers: new Headers(),
      });

      // WHEN: A request is made
      await apiClient.request({ method: "GET", endpoint: "/test" });

      // THEN: Request should include standard headers
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      // Verify headers contain Content-Type and Accept
      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("Accept")).toBe("application/json");
    });
  });

  describe("Requirement 1.3: JSON Response Parsing", () => {
    it("GIVEN the API client receives a valid JSON response WHEN the response is processed THEN the response body should be automatically parsed into a JavaScript object", async () => {
      // GIVEN: API client receives a valid JSON response
      const mockData = { id: 1, name: "Test User" };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockData }),
        headers: new Headers(),
      });

      // WHEN: The response is processed
      const result = await apiClient.request({
        method: "GET",
        endpoint: "/user",
      });

      // THEN: Response body should be parsed into JavaScript object
      expect(result.data).toEqual(mockData);
      expect(typeof result.data).toBe("object");
      expect(result.error).toBeNull();
    });
  });

  describe("Requirement 1.4: Network Error Handling", () => {
    it("GIVEN the API client encounters a network error WHEN the error occurs THEN a descriptive error with the failure reason should be thrown", async () => {
      // GIVEN: Network error occurs
      const networkError = new Error("Network request failed");
      fetchMock.mockRejectedValueOnce(networkError);

      // WHEN & THEN: Error should be thrown with descriptive message
      await expect(
        apiClient.request({ method: "GET", endpoint: "/test" })
      ).rejects.toThrow(ApiClientError);

      await expect(
        apiClient.request({ method: "GET", endpoint: "/test" })
      ).rejects.toThrow(/network/i);
    });
  });

  describe("Requirement 1.5: Non-2xx Status Code Handling", () => {
    it("GIVEN the API client receives a non-2xx status code WHEN the response is processed THEN an error containing the status code and error message should be thrown", async () => {
      // GIVEN: API returns 404 error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({
          error: {
            code: "NOT_FOUND",
            message: "Resource not found",
          },
        }),
        headers: new Headers(),
      });

      // WHEN & THEN: Error should be thrown with status code and message
      try {
        await apiClient.request({ method: "GET", endpoint: "/missing" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.status).toBe(404);
          expect(error.message).toContain("Resource not found");
          expect(error.code).toBe("NOT_FOUND");
        }
      }
    });

    it("GIVEN the API client receives a 500 error WHEN the response is processed THEN an error containing the status code should be thrown", async () => {
      // GIVEN: API returns 500 error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({
          error: {
            code: "INTERNAL_ERROR",
            message: "Something went wrong",
          },
        }),
        headers: new Headers(),
      });

      // WHEN & THEN: Error should be thrown with status code
      try {
        await apiClient.request({ method: "POST", endpoint: "/action" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.status).toBe(500);
          expect(error.code).toBe("INTERNAL_ERROR");
        }
      }
    });

    it("GIVEN the API client receives a 401 error WHEN the response is processed THEN an error should be thrown", async () => {
      // GIVEN: API returns 401 Unauthorized
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired token",
          },
        }),
        headers: new Headers(),
      });

      // WHEN & THEN: Error should be thrown
      try {
        await apiClient.request({ method: "GET", endpoint: "/protected" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.status).toBe(401);
          expect(error.code).toBe("UNAUTHORIZED");
        }
      }
    });
  });

  describe("Requirement 1.1: Base Configuration", () => {
    it("GIVEN the Frontend Application initializes WHEN the API client is created THEN it should be configured with the base API Gateway URL from environment variables", async () => {
      // GIVEN: Environment variables are set
      // WHEN: API client is initialized
      const client = new ApiClient({ baseURL: "https://custom-api.test.com" });

      // Mock response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: "test" }),
        headers: new Headers(),
      });

      // Make a request
      await client.request({ method: "GET", endpoint: "/test" });

      // THEN: Client should use base URL from configuration
      expect(fetchMock).toHaveBeenCalledWith(
        "https://custom-api.test.com/test",
        expect.any(Object)
      );
    });
  });
});

/**
 * Acceptance Tests for Response Interceptor
 *
 * These tests validate error handling behavior according to Requirements 3.1-3.5
 */
describe("Response Interceptor - Acceptance Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let apiClient: ApiClient;

  beforeEach(() => {
    // Mock the global fetch function
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock callback functions
    mockOnUnauthorized = vi.fn();
    mockOnError = vi.fn();

    // Create API client instance with test base URL
    apiClient = new ApiClient({ baseURL: "https://api.test.com" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 3.1: 401 Unauthorized Handling", () => {
    it("GIVEN the API returns a 401 Unauthorized response WHEN the response is processed THEN the system should clear authentication state and redirect to the sign-in page", async () => {
      // GIVEN: API returns 401 Unauthorized
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired token",
          },
        }),
        headers: new Headers(),
      });

      // WHEN: The response is processed
      // THEN: Should throw error with 401 status
      try {
        await apiClient.request({ method: "GET", endpoint: "/protected" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.status).toBe(401);
          expect(error.code).toBe("UNAUTHORIZED");
          expect(error.message).toContain("Invalid or expired token");
        }
      }
    });
  });

  describe("Requirement 3.2: 403 Forbidden Handling", () => {
    it("GIVEN the API returns a 403 Forbidden response WHEN the response is processed THEN the system should display an error message indicating insufficient permissions", async () => {
      // GIVEN: API returns 403 Forbidden
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to access this resource",
          },
        }),
        headers: new Headers(),
      });

      // WHEN: The response is processed
      // THEN: Should throw error with 403 status and permission message
      try {
        await apiClient.request({ method: "DELETE", endpoint: "/admin/user" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.status).toBe(403);
          expect(error.code).toBe("FORBIDDEN");
          expect(error.message).toContain("permission");
        }
      }
    });
  });

  describe("Requirement 3.3: 404 Not Found Handling", () => {
    it("GIVEN the API returns a 404 Not Found response WHEN the response is processed THEN the system should display an error message indicating the resource was not found", async () => {
      // GIVEN: API returns 404 Not Found
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({
          error: {
            code: "NOT_FOUND",
            message: "The requested resource was not found",
          },
        }),
        headers: new Headers(),
      });

      // WHEN: The response is processed
      // THEN: Should throw error with 404 status and not found message
      try {
        await apiClient.request({ method: "GET", endpoint: "/user/999" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.status).toBe(404);
          expect(error.code).toBe("NOT_FOUND");
          expect(error.message).toContain("not found");
        }
      }
    });
  });

  describe("Requirement 3.4: 500 Internal Server Error Handling", () => {
    it("GIVEN the API returns a 500 Internal Server Error response WHEN the response is processed THEN the system should display a generic error message and log the error details", async () => {
      // GIVEN: API returns 500 Internal Server Error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred on the server",
          },
        }),
        headers: new Headers(),
      });

      // WHEN: The response is processed
      // THEN: Should throw error with 500 status and generic message
      try {
        await apiClient.request({ method: "POST", endpoint: "/action" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.status).toBe(500);
          expect(error.code).toBe("INTERNAL_ERROR");
          expect(error.message).toBeTruthy();
        }
      }
    });
  });

  describe("Requirement 3.5: 400 Bad Request Validation Errors", () => {
    it("GIVEN the API returns validation errors in a 400 Bad Request response WHEN the response is processed THEN the system should extract and display field-specific error messages", async () => {
      // GIVEN: API returns 400 with validation errors
      const validationErrors = {
        firstName: "First name is required",
        email: "Email must be a valid email address",
      };

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: validationErrors,
          },
        }),
        headers: new Headers(),
      });

      // WHEN: The response is processed
      // THEN: Should throw error with validation details
      try {
        await apiClient.request({
          method: "POST",
          endpoint: "/profile",
          data: { firstName: "", email: "invalid" },
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        if (error instanceof ApiClientError) {
          expect(error.status).toBe(400);
          expect(error.code).toBe("VALIDATION_ERROR");
          expect(error.details).toEqual(validationErrors);
          expect(error.details?.firstName).toBe("First name is required");
          expect(error.details?.email).toBe(
            "Email must be a valid email address"
          );
        }
      }
    });
  });
});

/**
 * Acceptance Tests for Retry Logic
 *
 * These tests validate retry behavior according to Requirements 12.1-12.5
 */
describe("Retry Logic - Acceptance Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let apiClient: ApiClient;

  beforeEach(() => {
    // Mock the global fetch function
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Create API client instance with test base URL and retry enabled
    // Use very short retry delay for faster tests
    apiClient = new ApiClient({
      baseURL: "https://api.test.com",
      retryAttempts: 3,
      retryDelay: 10, // 10ms for fast tests
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 12.1: Network Error Retry", () => {
    it("GIVEN an API request fails with a network error WHEN the error occurs THEN the system should automatically retry the request up to 3 times with exponential backoff", async () => {
      // GIVEN: Network error occurs on first 2 attempts, succeeds on 3rd
      fetchMock
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
          headers: new Headers(),
        });

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "GET",
        endpoint: "/test",
      });

      // THEN: Should retry and eventually succeed
      const result = await requestPromise;
      expect(result.data).toBe("success");
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("GIVEN all retry attempts fail WHEN the final attempt completes THEN the system should display an error message to the user", async () => {
      // GIVEN: All attempts fail with network error
      fetchMock.mockRejectedValue(new Error("Network error"));

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "GET",
        endpoint: "/test",
      });

      // THEN: Should throw error after all retries exhausted
      await expect(requestPromise).rejects.toThrow(ApiClientError);
      await expect(requestPromise).rejects.toThrow(/network/i);
      expect(fetchMock).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe("Requirement 12.2: 5xx Server Error Retry", () => {
    it("GIVEN an API request fails with a 5xx server error WHEN the error occurs THEN the system should automatically retry the request up to 2 times", async () => {
      // GIVEN: 500 error on first attempt, succeeds on 2nd
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({
            error: { code: "INTERNAL_ERROR", message: "Server error" },
          }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
          headers: new Headers(),
        });

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "GET",
        endpoint: "/test",
      });

      // THEN: Should retry and succeed
      const result = await requestPromise;
      expect(result.data).toBe("success");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("GIVEN a 503 Service Unavailable error WHEN the error occurs THEN the system should retry", async () => {
      // GIVEN: 503 error on first attempt, succeeds on 2nd
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          json: async () => ({
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "Service temporarily unavailable",
            },
          }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
          headers: new Headers(),
        });

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "POST",
        endpoint: "/action",
      });

      // THEN: Should retry and succeed
      const result = await requestPromise;
      expect(result.data).toBe("success");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("Requirement 12.3: 4xx Client Error No Retry", () => {
    it("GIVEN an API request fails with a 4xx client error WHEN the error occurs THEN the system should NOT retry the request automatically", async () => {
      // GIVEN: 400 Bad Request error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
          },
        }),
        headers: new Headers(),
      });

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "POST",
        endpoint: "/profile",
        data: { invalid: "data" },
      });

      // THEN: Should not retry, fail immediately
      await expect(requestPromise).rejects.toThrow(ApiClientError);
      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });

    it("GIVEN a 404 Not Found error WHEN the error occurs THEN the system should NOT retry", async () => {
      // GIVEN: 404 error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({
          error: { code: "NOT_FOUND", message: "Resource not found" },
        }),
        headers: new Headers(),
      });

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "GET",
        endpoint: "/missing",
      });

      // THEN: Should not retry
      await expect(requestPromise).rejects.toThrow(ApiClientError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("GIVEN a 401 Unauthorized error WHEN the error occurs THEN the system should NOT retry", async () => {
      // GIVEN: 401 error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: { code: "UNAUTHORIZED", message: "Invalid token" },
        }),
        headers: new Headers(),
      });

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "GET",
        endpoint: "/protected",
      });

      // THEN: Should not retry
      await expect(requestPromise).rejects.toThrow(ApiClientError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Requirement 12.4: All Retries Fail", () => {
    it("GIVEN all retry attempts fail WHEN the final attempt completes THEN the system should display an error message to the user", async () => {
      // GIVEN: All attempts fail with 500 error
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({
          error: { code: "INTERNAL_ERROR", message: "Server error" },
        }),
        headers: new Headers(),
      });

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "GET",
        endpoint: "/test",
      });

      // THEN: Should throw error after all retries
      await expect(requestPromise).rejects.toThrow(ApiClientError);
      expect(fetchMock).toHaveBeenCalledTimes(3); // Initial + 2 retries for 5xx
    });
  });

  describe("Requirement 12.5: Successful Retry", () => {
    it("GIVEN a retry succeeds WHEN the request completes THEN the system should process the response normally without indicating that retries occurred", async () => {
      // GIVEN: First attempt fails, second succeeds
      fetchMock
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: { id: 1, name: "Test" } }),
          headers: new Headers(),
        });

      // WHEN: Request is made
      const requestPromise = apiClient.request({
        method: "GET",
        endpoint: "/user",
      });

      // THEN: Should return successful response without retry indication
      const result = await requestPromise;
      expect(result.data).toEqual({ id: 1, name: "Test" });
      expect(result.error).toBeNull();
      // Response should look identical to a first-attempt success
    });
  });
});
