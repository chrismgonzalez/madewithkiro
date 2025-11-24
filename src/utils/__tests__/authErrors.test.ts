/**
 * Auth Errors Utility Tests
 *
 * Tests for OAuth error message mapping utility.
 * Validates that error codes are correctly mapped to user-friendly messages.
 *
 * Requirements: 7.1
 */

import { describe, it, expect } from "vitest";
import { getOAuthErrorMessage } from "../authErrors";

describe("getOAuthErrorMessage", () => {
  describe("Standard OAuth error codes", () => {
    it("should return user-friendly message for access_denied error", () => {
      const message = getOAuthErrorMessage("access_denied");
      expect(message).toBe(
        "You cancelled the sign-in process. Please try again."
      );
    });

    it("should return user-friendly message for invalid_request error", () => {
      const message = getOAuthErrorMessage("invalid_request");
      expect(message).toBe(
        "Authentication request was invalid. Please try again."
      );
    });

    it("should return user-friendly message for unauthorized_client error", () => {
      const message = getOAuthErrorMessage("unauthorized_client");
      expect(message).toBe(
        "This application is not authorized. Please contact support."
      );
    });

    it("should return user-friendly message for server_error", () => {
      const message = getOAuthErrorMessage("server_error");
      expect(message).toBe(
        "The authentication provider encountered an error. Please try again later."
      );
    });

    it("should return user-friendly message for temporarily_unavailable error", () => {
      const message = getOAuthErrorMessage("temporarily_unavailable");
      expect(message).toBe(
        "The authentication service is temporarily unavailable. Please try again later."
      );
    });
  });

  describe("Unknown error codes", () => {
    it("should return error description when provided for unknown error code", () => {
      const message = getOAuthErrorMessage(
        "unknown_error",
        "Custom error description"
      );
      expect(message).toBe("Custom error description");
    });

    it("should return generic message when no description provided for unknown error", () => {
      const message = getOAuthErrorMessage("unknown_error");
      expect(message).toBe("An unexpected error occurred during sign-in.");
    });

    it("should return generic message when error description is null", () => {
      const message = getOAuthErrorMessage("unknown_error", null);
      expect(message).toBe("An unexpected error occurred during sign-in.");
    });

    it("should return generic message when error description is empty string", () => {
      const message = getOAuthErrorMessage("unknown_error", "");
      expect(message).toBe("An unexpected error occurred during sign-in.");
    });
  });

  describe("Error description priority", () => {
    it("should prefer mapped message over description for known error codes", () => {
      const message = getOAuthErrorMessage(
        "access_denied",
        "Custom description"
      );
      expect(message).toBe(
        "You cancelled the sign-in process. Please try again."
      );
      expect(message).not.toBe("Custom description");
    });

    it("should use description for unknown error codes", () => {
      const message = getOAuthErrorMessage(
        "custom_error",
        "This is a custom error"
      );
      expect(message).toBe("This is a custom error");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty error code", () => {
      const message = getOAuthErrorMessage("");
      expect(message).toBe("An unexpected error occurred during sign-in.");
    });

    it("should handle error code with special characters", () => {
      const message = getOAuthErrorMessage("error-with-dashes");
      expect(message).toBe("An unexpected error occurred during sign-in.");
    });

    it("should handle error code with spaces", () => {
      const message = getOAuthErrorMessage("error with spaces");
      expect(message).toBe("An unexpected error occurred during sign-in.");
    });

    it("should handle very long error descriptions", () => {
      const longDescription = "A".repeat(1000);
      const message = getOAuthErrorMessage("unknown_error", longDescription);
      expect(message).toBe(longDescription);
    });
  });
});
