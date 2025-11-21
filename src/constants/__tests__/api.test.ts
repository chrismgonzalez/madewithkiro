/**
 * Tests for API constants
 */
import { describe, it, expect } from "vitest";
import { TEST_USER_ID, API_ENDPOINTS, HTTP_METHODS, HTTP_STATUS } from "../api";

describe("API Constants", () => {
  describe("TEST_USER_ID", () => {
    it("should be defined", () => {
      expect(TEST_USER_ID).toBeDefined();
    });

    it("should be test-user-001", () => {
      expect(TEST_USER_ID).toBe("test-user-001");
    });

    it("should be a string", () => {
      expect(typeof TEST_USER_ID).toBe("string");
    });
  });

  describe("API_ENDPOINTS", () => {
    it("should have PROFILE endpoint", () => {
      expect(API_ENDPOINTS.PROFILE).toBe("/profile");
    });

    it("should have APPLICATIONS endpoint", () => {
      expect(API_ENDPOINTS.APPLICATIONS).toBe("/applications");
    });

    it("should generate PROFILE_BY_ID endpoint", () => {
      const userId = "user-123";
      expect(API_ENDPOINTS.PROFILE_BY_ID(userId)).toBe(`/profile/${userId}`);
    });

    it("should generate APPLICATIONS_BY_USER endpoint", () => {
      const userId = "user-123";
      expect(API_ENDPOINTS.APPLICATIONS_BY_USER(userId)).toBe(
        `/applications?userId=${userId}`
      );
    });
  });

  describe("HTTP_METHODS", () => {
    it("should have standard HTTP methods", () => {
      expect(HTTP_METHODS.GET).toBe("GET");
      expect(HTTP_METHODS.POST).toBe("POST");
      expect(HTTP_METHODS.PUT).toBe("PUT");
      expect(HTTP_METHODS.DELETE).toBe("DELETE");
    });
  });

  describe("HTTP_STATUS", () => {
    it("should have standard HTTP status codes", () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });
});
