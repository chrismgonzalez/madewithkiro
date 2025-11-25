/**
 * API Client Request Cancellation Tests
 *
 * Tests for request cancellation functionality using AbortController
 * Validates Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient } from "../apiClient";

describe("API Client - Request Cancellation", () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient({ baseURL: "https://api.test.com" });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Requirement 13.1: Cancel request on component unmount", () => {
    it("GIVEN a component unmounts during an API request WHEN the unmount occurs THEN the pending request should be cancelled using AbortController", async () => {
      // Arrange
      const controller = new AbortController();
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(
        (_url, options: any) =>
          new Promise((resolve, reject) => {
            // Check if signal is already aborted
            if (options?.signal?.aborted) {
              reject(
                new DOMException("The operation was aborted.", "AbortError")
              );
              return;
            }

            // Listen for abort event
            const abortHandler = () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError")
              );
            };
            options?.signal?.addEventListener("abort", abortHandler);

            // Simulate a slow request
            setTimeout(() => {
              options?.signal?.removeEventListener("abort", abortHandler);
              if (!options?.signal?.aborted) {
                resolve(
                  new Response(JSON.stringify({ data: { id: "1" } }), {
                    status: 200,
                  })
                );
              }
            }, 1000);
          })
      );

      // Act
      const requestPromise = apiClient.request({
        method: "GET",
        endpoint: "/test",
        signal: controller.signal,
      });

      // Simulate component unmount by aborting
      controller.abort();

      // Assert
      await expect(requestPromise).rejects.toThrow("Request was cancelled");
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });
  });

  describe("Requirement 13.2: Cancel requests on navigation", () => {
    it("GIVEN a user navigates away from a page with pending requests WHEN the navigation occurs THEN all pending requests for that page should be cancelled", async () => {
      // Arrange
      const controller = new AbortController();
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(
        (_url, options: any) =>
          new Promise((resolve, reject) => {
            if (options?.signal?.aborted) {
              reject(
                new DOMException("The operation was aborted.", "AbortError")
              );
              return;
            }

            const abortHandler = () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError")
              );
            };
            options?.signal?.addEventListener("abort", abortHandler);

            setTimeout(() => {
              options?.signal?.removeEventListener("abort", abortHandler);
              if (!options?.signal?.aborted) {
                resolve(
                  new Response(JSON.stringify({ data: { id: "1" } }), {
                    status: 200,
                  })
                );
              }
            }, 1000);
          })
      );

      // Act - Start multiple requests
      const request1 = apiClient.get("/users", undefined, controller.signal);
      const request2 = apiClient.get("/posts", undefined, controller.signal);

      // Simulate navigation by aborting all requests
      controller.abort();

      // Assert - Both requests should be cancelled
      await expect(request1).rejects.toThrow("Request was cancelled");
      await expect(request2).rejects.toThrow("Request was cancelled");
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Requirement 13.3: Cancel previous request on new request", () => {
    it("GIVEN a new search or filter is applied before the previous request completes WHEN the new request starts THEN the previous request should be cancelled", async () => {
      // Arrange
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      let request1Completed = false;
      let request2Completed = false;

      vi.spyOn(global, "fetch").mockImplementation((url, options: any) => {
        return new Promise((resolve, reject) => {
          if (options?.signal?.aborted) {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
            return;
          }

          const abortHandler = () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          };
          options?.signal?.addEventListener("abort", abortHandler);

          setTimeout(() => {
            options?.signal?.removeEventListener("abort", abortHandler);
            if (!options?.signal?.aborted) {
              if (url.toString().includes("query=first")) {
                request1Completed = true;
              } else {
                request2Completed = true;
              }
              resolve(
                new Response(JSON.stringify({ data: [] }), { status: 200 })
              );
            }
          }, 500);
        });
      });

      // Act - Start first request
      const request1 = apiClient.get(
        "/search",
        { query: "first" },
        controller1.signal
      );

      // Simulate new search by cancelling first and starting second
      controller1.abort();

      const request2 = apiClient.get(
        "/search",
        { query: "second" },
        controller2.signal
      );

      // Assert
      await expect(request1).rejects.toThrow("Request was cancelled");
      const result2 = await request2;
      expect(result2.data).toBeDefined();
      expect(request1Completed).toBe(false);
      expect(request2Completed).toBe(true);
    });
  });

  describe("Requirement 13.4: Ignore cancelled request responses", () => {
    it("GIVEN a cancelled request completes WHEN the response arrives THEN the response should be ignored and component state should not update", async () => {
      // Arrange
      const controller = new AbortController();
      let stateUpdated = false;

      vi.spyOn(global, "fetch").mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              // Simulate response arriving after cancellation
              resolve(
                new Response(JSON.stringify({ data: { id: "1" } }), {
                  status: 200,
                })
              );
            }, 100);
          })
      );

      // Act
      const requestPromise = apiClient
        .get("/test", undefined, controller.signal)
        .then(() => {
          stateUpdated = true;
        })
        .catch(() => {
          // Request was cancelled, don't update state
          stateUpdated = false;
        });

      // Cancel immediately
      controller.abort();

      await requestPromise;

      // Assert - State should not be updated
      expect(stateUpdated).toBe(false);
    });
  });

  describe("Requirement 13.5: No error messages for cancelled requests", () => {
    it("GIVEN a request is cancelled WHEN the cancellation occurs THEN no error messages should be displayed to the user", async () => {
      // Arrange
      const controller = new AbortController();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      vi.spyOn(global, "fetch").mockImplementation(
        (_url, options: any) =>
          new Promise((resolve, reject) => {
            if (options?.signal?.aborted) {
              reject(
                new DOMException("The operation was aborted.", "AbortError")
              );
              return;
            }

            const abortHandler = () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError")
              );
            };
            options?.signal?.addEventListener("abort", abortHandler);

            setTimeout(() => {
              options?.signal?.removeEventListener("abort", abortHandler);
              if (!options?.signal?.aborted) {
                resolve(
                  new Response(JSON.stringify({ data: { id: "1" } }), {
                    status: 200,
                  })
                );
              }
            }, 1000);
          })
      );

      // Act
      const requestPromise = apiClient.get(
        "/test",
        undefined,
        controller.signal
      );
      controller.abort();

      // Assert
      try {
        await requestPromise;
      } catch (error: any) {
        // Verify it's a cancellation error
        expect(error.code).toBe("REQUEST_CANCELLED");
        expect(error.message).toBe("Request was cancelled");
      }

      // Verify no console errors were logged
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle cancellation during retry attempts", async () => {
      // Arrange
      const controller = new AbortController();
      let attemptCount = 0;

      const apiClientWithRetry = new ApiClient({
        baseURL: "https://api.test.com",
        retryAttempts: 3,
      });

      vi.spyOn(global, "fetch").mockImplementation(() => {
        attemptCount++;
        return Promise.reject(new Error("Network error"));
      });

      // Act
      const requestPromise = apiClientWithRetry.get(
        "/test",
        undefined,
        controller.signal
      );

      // Cancel after first attempt
      setTimeout(() => controller.abort(), 50);

      // Assert
      await expect(requestPromise).rejects.toThrow();
      // Should not retry after cancellation
      expect(attemptCount).toBeLessThanOrEqual(2);
    });

    it("should handle multiple cancellations gracefully", async () => {
      // Arrange
      const controller = new AbortController();

      vi.spyOn(global, "fetch").mockImplementation(
        (_url, options: any) =>
          new Promise((resolve, reject) => {
            if (options?.signal?.aborted) {
              reject(
                new DOMException("The operation was aborted.", "AbortError")
              );
              return;
            }

            const abortHandler = () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError")
              );
            };
            options?.signal?.addEventListener("abort", abortHandler);

            setTimeout(() => {
              options?.signal?.removeEventListener("abort", abortHandler);
              if (!options?.signal?.aborted) {
                resolve(
                  new Response(JSON.stringify({ data: { id: "1" } }), {
                    status: 200,
                  })
                );
              }
            }, 1000);
          })
      );

      // Act
      const requestPromise = apiClient.get(
        "/test",
        undefined,
        controller.signal
      );

      // Cancel multiple times
      controller.abort();
      controller.abort();
      controller.abort();

      // Assert - Should only throw once
      await expect(requestPromise).rejects.toThrow("Request was cancelled");
    });
  });
});
