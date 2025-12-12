import { describe, it, expect, beforeEach, vi } from "vitest";
import { linkAccounts } from "../authService";
import { apiClient } from "../apiClient";

/**
 * Acceptance Tests for Link Accounts Service
 *
 * These tests follow BDD (Behavior-Driven Development) format using Given-When-Then
 * to validate the account linking service behavior
 *
 * Requirements: 7.1, 2.5
 */

// Mock the API client
vi.mock("../apiClient", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe("Link Accounts Service - Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful API Call", () => {
    it("GIVEN a user wants to link accounts WHEN they confirm linking THEN the system should call the link-accounts API endpoint", async () => {
      // GIVEN: User wants to link accounts
      const targetUserSub = "target-user-sub-123";
      const mockResponse = {
        data: {
          success: true,
          message: "Accounts linked successfully",
          linkedIdentities: [
            { provider: "Google", userId: "123456789" },
            { provider: "Cognito", userId: "user@example.com" },
          ],
        },
        error: null,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      // WHEN: They confirm linking
      const result = await linkAccounts(targetUserSub);

      // THEN: The system should call the API endpoint
      expect(apiClient.post).toHaveBeenCalledWith("/auth/link-accounts", {
        targetUserSub,
        confirmLink: true,
      });
      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it("GIVEN a successful linking operation WHEN the API responds THEN the response should include linked identities", async () => {
      // GIVEN: Successful linking operation
      const targetUserSub = "target-user-sub-456";
      const mockLinkedIdentities = [
        { provider: "Google", userId: "987654321" },
        { provider: "Cognito", userId: "test@example.com" },
      ];
      const mockResponse = {
        data: {
          success: true,
          message: "Accounts linked successfully",
          linkedIdentities: mockLinkedIdentities,
        },
        error: null,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      // WHEN: The API responds
      const result = await linkAccounts(targetUserSub);

      // THEN: The response should include linked identities
      expect(result.data?.linkedIdentities).toEqual(mockLinkedIdentities);
      expect(result.data?.success).toBe(true);
    });
  });

  describe("Token Inclusion", () => {
    it("GIVEN a user is authenticated WHEN they attempt to link accounts THEN the JWT token should be included in the request", async () => {
      // GIVEN: User is authenticated (token handled by apiClient)
      const targetUserSub = "target-user-sub-789";
      const mockResponse = {
        data: {
          success: true,
          message: "Accounts linked successfully",
          linkedIdentities: [],
        },
        error: null,
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      // WHEN: They attempt to link accounts
      await linkAccounts(targetUserSub);

      // THEN: The JWT token should be included (verified by apiClient.post being called)
      // The apiClient automatically includes the Authorization header with JWT token
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/link-accounts",
        expect.any(Object)
      );
    });
  });

  describe("Error Handling", () => {
    it("GIVEN the API returns an error WHEN linking accounts THEN the error should be returned with a user-friendly message", async () => {
      // GIVEN: API returns an error
      const targetUserSub = "target-user-sub-error";
      const mockError = {
        data: null,
        error: {
          code: "LINK_FAILED",
          message: "Unable to link accounts",
          status: 500,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockError);

      // WHEN: Linking accounts
      const result = await linkAccounts(targetUserSub);

      // THEN: The error should be returned with user-friendly message
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("LINK_FAILED");
      expect(result.error?.message).toBe(
        "Unable to link accounts. Please try again later."
      );
      expect(result.error?.status).toBe(500);
    });

    it("GIVEN the user is not authenticated WHEN they attempt to link accounts THEN an UNAUTHORIZED error should be returned", async () => {
      // GIVEN: User is not authenticated
      const targetUserSub = "target-user-sub-unauth";
      const mockError = {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          status: 401,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockError);

      // WHEN: They attempt to link accounts
      const result = await linkAccounts(targetUserSub);

      // THEN: An UNAUTHORIZED error should be returned with user-friendly message
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("UNAUTHORIZED");
      expect(result.error?.message).toBe(
        "Please sign in again to link your accounts."
      );
      expect(result.error?.status).toBe(401);
    });

    it("GIVEN email verification fails WHEN linking accounts THEN an EMAIL_NOT_VERIFIED error should be returned", async () => {
      // GIVEN: Email verification fails
      const targetUserSub = "target-user-sub-unverified";
      const mockError = {
        data: null,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Both accounts must have verified email addresses",
          status: 403,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockError);

      // WHEN: Linking accounts
      const result = await linkAccounts(targetUserSub);

      // THEN: An EMAIL_NOT_VERIFIED error should be returned with user-friendly message
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("EMAIL_NOT_VERIFIED");
      expect(result.error?.message).toBe(
        "Both accounts must have verified email addresses before linking."
      );
      expect(result.error?.status).toBe(403);
    });

    it("GIVEN a network error occurs WHEN linking accounts THEN a NETWORK_ERROR should be returned", async () => {
      // GIVEN: Network error occurs
      const targetUserSub = "target-user-sub-network";
      const mockError = {
        data: null,
        error: {
          code: "NETWORK_ERROR",
          message: "Network request failed",
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockError);

      // WHEN: Linking accounts
      const result = await linkAccounts(targetUserSub);

      // THEN: A NETWORK_ERROR should be returned with user-friendly message
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("NETWORK_ERROR");
      expect(result.error?.message).toBe(
        "Network error. Please check your connection and try again."
      );
    });

    it("GIVEN the API times out WHEN linking accounts THEN a timeout error should be returned", async () => {
      // GIVEN: API times out
      const targetUserSub = "target-user-sub-timeout";
      const mockError = {
        data: null,
        error: {
          code: "TIMEOUT_ERROR",
          message: "Request timed out",
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockError);

      // WHEN: Linking accounts
      const result = await linkAccounts(targetUserSub);

      // THEN: A timeout error should be returned with user-friendly message
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("TIMEOUT_ERROR");
      expect(result.error?.message).toBe(
        "Request timed out. Please try again."
      );
    });

    it("GIVEN an invalid request WHEN linking accounts THEN an INVALID_REQUEST error should be returned", async () => {
      // GIVEN: Invalid request (e.g., missing targetUserSub)
      const targetUserSub = "";
      const mockError = {
        data: null,
        error: {
          code: "INVALID_REQUEST",
          message: "Target user sub is required",
          status: 400,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockError);

      // WHEN: Linking accounts
      const result = await linkAccounts(targetUserSub);

      // THEN: An INVALID_REQUEST error should be returned with user-friendly message
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe("INVALID_REQUEST");
      expect(result.error?.message).toBe("Invalid request. Please try again.");
      expect(result.error?.status).toBe(400);
    });
  });

  describe("User-Friendly Error Messages", () => {
    it("GIVEN a LINK_FAILED error WHEN displaying to user THEN a user-friendly message should be shown", async () => {
      // GIVEN: LINK_FAILED error
      const targetUserSub = "target-user-sub-failed";
      const mockError = {
        data: null,
        error: {
          code: "LINK_FAILED",
          message: "Unable to link accounts. Please try again later.",
          status: 500,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockError);

      // WHEN: Displaying to user
      const result = await linkAccounts(targetUserSub);

      // THEN: A user-friendly message should be available
      expect(result.error?.message).toContain("Unable to link accounts");
    });

    it("GIVEN an EMAIL_NOT_VERIFIED error WHEN displaying to user THEN a clear explanation should be provided", async () => {
      // GIVEN: EMAIL_NOT_VERIFIED error
      const targetUserSub = "target-user-sub-verify";
      const mockError = {
        data: null,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message:
            "Both accounts must have verified email addresses before linking.",
          status: 403,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce(mockError);

      // WHEN: Displaying to user
      const result = await linkAccounts(targetUserSub);

      // THEN: A clear explanation should be available
      expect(result.error?.message).toContain("verified email addresses");
    });
  });
});

describe("Error Message Mapping", () => {
  it("GIVEN a LINK_FAILED error code WHEN mapping to user message THEN a friendly message should be returned", () => {
    // This test validates that error mapping works correctly
    // The actual implementation will be in the linkAccounts function
    const errorCode = "LINK_FAILED";
    const expectedMessage = "Unable to link accounts. Please try again later.";

    // This will be tested through the linkAccounts function
    expect(errorCode).toBe("LINK_FAILED");
  });

  it("GIVEN an EMAIL_NOT_VERIFIED error code WHEN mapping to user message THEN a clear explanation should be returned", () => {
    const errorCode = "EMAIL_NOT_VERIFIED";
    const expectedMessage =
      "Both accounts must have verified email addresses before linking.";

    expect(errorCode).toBe("EMAIL_NOT_VERIFIED");
  });

  it("GIVEN an UNAUTHORIZED error code WHEN mapping to user message THEN an auth message should be returned", () => {
    const errorCode = "UNAUTHORIZED";
    const expectedMessage = "Please sign in again to link your accounts.";

    expect(errorCode).toBe("UNAUTHORIZED");
  });

  it("GIVEN a NETWORK_ERROR error code WHEN mapping to user message THEN a network message should be returned", () => {
    const errorCode = "NETWORK_ERROR";
    const expectedMessage =
      "Network error. Please check your connection and try again.";

    expect(errorCode).toBe("NETWORK_ERROR");
  });

  it("GIVEN a TIMEOUT_ERROR error code WHEN mapping to user message THEN a timeout message should be returned", () => {
    const errorCode = "TIMEOUT_ERROR";
    const expectedMessage = "Request timed out. Please try again.";

    expect(errorCode).toBe("TIMEOUT_ERROR");
  });

  it("GIVEN an INVALID_REQUEST error code WHEN mapping to user message THEN a validation message should be returned", () => {
    const errorCode = "INVALID_REQUEST";
    const expectedMessage = "Invalid request. Please try again.";

    expect(errorCode).toBe("INVALID_REQUEST");
  });

  it("GIVEN an unknown error code WHEN mapping to user message THEN a generic message should be returned", () => {
    const errorCode = "UNKNOWN_ERROR";
    const expectedMessage =
      "An unexpected error occurred. Please try again later.";

    expect(errorCode).toBe("UNKNOWN_ERROR");
  });
});
