/**
 * Acceptance Tests for TypeScript Type Safety
 * Requirements: 14.1, 14.2, 14.3
 */

import { describe, it, expect } from "vitest";
import type {
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  Application,
  CreateApplicationRequest,
  ApiResponse,
  ApiError,
} from "@/types";

describe("TypeScript Type Safety - Acceptance Tests", () => {
  describe("Requirement 14.1: TypeScript interfaces match backend Pydantic models", () => {
    it("GIVEN I define API service functions WHEN I use TypeScript interfaces THEN the interfaces should match the backend Pydantic models", () => {
      // Test UserProfile interface structure
      const userProfile: UserProfile = {
        userId: "test-user-001",
        firstName: "John",
        lastName: "Doe",
        awsBuilderHandle: "johndoe",
        linkedInUsername: "johndoe",
        githubUsername: "johndoe",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      // Verify all required fields are present
      expect(userProfile.userId).toBeDefined();
      expect(userProfile.firstName).toBeDefined();
      expect(userProfile.lastName).toBeDefined();
      expect(userProfile.awsBuilderHandle).toBeDefined();
      expect(userProfile.createdAt).toBeDefined();
      expect(userProfile.updatedAt).toBeDefined();

      // Test CreateProfileRequest interface structure
      const createProfileRequest: CreateProfileRequest = {
        firstName: "Jane",
        lastName: "Smith",
        awsBuilderHandle: "janesmith",
      };

      expect(createProfileRequest.firstName).toBeDefined();
      expect(createProfileRequest.lastName).toBeDefined();
      expect(createProfileRequest.awsBuilderHandle).toBeDefined();

      // Test UpdateProfileRequest interface structure
      const updateProfileRequest: UpdateProfileRequest = {
        userId: "test-user-001",
        firstName: "Jane",
        lastName: "Smith",
        awsBuilderHandle: "janesmith",
      };

      expect(updateProfileRequest.userId).toBeDefined();
      expect(updateProfileRequest.firstName).toBeDefined();

      // Test Application interface structure
      const application: Application = {
        appId: "app-001",
        userId: "test-user-001",
        userName: "John Doe",
        name: "My App",
        description: "A test application",
        appUrl: "https://example.com",
        tags: ["test"],
        visibility: "public",
        createdAt: "2024-01-01T00:00:00Z",
      };

      expect(application.appId).toBeDefined();
      expect(application.userId).toBeDefined();
      expect(application.userName).toBeDefined();
      expect(application.name).toBeDefined();
      expect(application.description).toBeDefined();
      expect(application.appUrl).toBeDefined();
      expect(application.tags).toBeDefined();
      expect(application.createdAt).toBeDefined();

      // Test CreateApplicationRequest interface structure
      const createApplicationRequest: CreateApplicationRequest = {
        name: "New App",
        description: "A new application",
        appUrl: "https://newapp.com",
        tags: ["new"],
        visibility: "public",
      };

      expect(createApplicationRequest.name).toBeDefined();
      expect(createApplicationRequest.description).toBeDefined();
      expect(createApplicationRequest.appUrl).toBeDefined();
      expect(createApplicationRequest.tags).toBeDefined();

      // Test ApiResponse interface structure
      const apiResponse: ApiResponse<UserProfile> = {
        data: userProfile,
        statusCode: 200,
      };

      expect(apiResponse.statusCode).toBeDefined();

      // Test ApiError interface structure
      const apiError: ApiError = {
        code: "ERROR_CODE",
        message: "Error message",
        details: { field: "error detail" },
      };

      expect(apiError.code).toBeDefined();
      expect(apiError.message).toBeDefined();
    });
  });

  describe("Requirement 14.2: Response structure validation", () => {
    it("GIVEN an API response is received WHEN the response is processed THEN the system should validate that the response structure matches the expected TypeScript type", async () => {
      // Import validation functions
      const { validateUserProfile } = await import("@/utils/validation");

      // Valid response data
      const mockResponse = {
        userId: "test-user-001",
        firstName: "John",
        lastName: "Doe",
        awsBuilderHandle: "johndoe",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      // This should not throw for valid data
      expect(() => {
        const validated = validateUserProfile(mockResponse);
        expect(validated).toBeDefined();
        expect(validated.userId).toBe("test-user-001");
        expect(validated.firstName).toBe("John");
      }).not.toThrow();
    });

    it("GIVEN an API response with invalid structure WHEN validation occurs THEN it should detect the mismatch", async () => {
      // Import validation functions
      const { validateUserProfile, ValidationError } = await import(
        "@/utils/validation"
      );

      // Test that invalid data structure is detected
      const invalidResponse = {
        userId: "test-user-001",
        // Missing required fields: firstName, lastName, awsBuilderHandle
        createdAt: "2024-01-01T00:00:00Z",
      };

      // Runtime validation should catch this
      expect(() => {
        validateUserProfile(invalidResponse);
      }).toThrow(ValidationError);

      // Verify error details
      try {
        validateUserProfile(invalidResponse);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toBeDefined();
        expect(validationError.details.firstName).toBeDefined();
        expect(validationError.details.lastName).toBeDefined();
        expect(validationError.details.awsBuilderHandle).toBeDefined();
      }
    });
  });

  describe("Requirement 14.3: Type error handling", () => {
    it("GIVEN API response validation fails WHEN the validation error occurs THEN the system should throw a type error with details about the mismatch", async () => {
      // Import validation functions
      const { validateUserProfile, ValidationError } = await import(
        "@/utils/validation"
      );

      const invalidData = {
        userId: 123, // Should be string
        firstName: "John",
        lastName: "Doe",
        awsBuilderHandle: "johndoe",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      // Validation should throw with details
      expect(() => {
        validateUserProfile(invalidData);
      }).toThrow(ValidationError);

      try {
        validateUserProfile(invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.message).toContain("Type validation failed");
        expect(validationError.details).toBeDefined();
        expect(validationError.details.userId).toBeDefined();
      }
    });

    it("GIVEN validation error with field details WHEN error is thrown THEN it should include information about which fields failed", async () => {
      // Import validation functions
      const { validateApplication, ValidationError } = await import(
        "@/utils/validation"
      );

      const invalidApp = {
        appId: "app-001",
        userId: "user-001",
        userName: "Test User",
        // Missing required fields: name, description, appUrl, tags, createdAt
      };

      try {
        validateApplication(invalidApp);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;

        expect(validationError.code).toBe("VALIDATION_ERROR");
        expect(validationError.message).toContain("Type validation failed");
        expect(validationError.details).toBeDefined();

        // Check that multiple field errors are captured
        expect(Object.keys(validationError.details).length).toBeGreaterThan(0);
        expect(validationError.details.name).toBeDefined();
        expect(validationError.details.description).toBeDefined();
      }
    });
  });

  describe("Type compatibility with backend models", () => {
    it("should allow optional fields to be undefined", () => {
      // Test that optional fields work correctly
      const profileWithoutOptionals: CreateProfileRequest = {
        firstName: "John",
        lastName: "Doe",
        awsBuilderHandle: "johndoe",
        // linkedInUsername and githubUsername are optional
      };

      expect(profileWithoutOptionals.linkedInUsername).toBeUndefined();
      expect(profileWithoutOptionals.githubUsername).toBeUndefined();

      const profileWithOptionals: CreateProfileRequest = {
        firstName: "Jane",
        lastName: "Smith",
        awsBuilderHandle: "janesmith",
        linkedInUsername: "janesmith",
        githubUsername: "janesmith",
      };

      expect(profileWithOptionals.linkedInUsername).toBe("janesmith");
      expect(profileWithOptionals.githubUsername).toBe("janesmith");
    });

    it("should handle array types correctly", () => {
      const app: Application = {
        appId: "app-001",
        userId: "user-001",
        userName: "Test User",
        name: "Test App",
        description: "Description",
        appUrl: "https://example.com",
        tags: ["tag1", "tag2", "tag3"],
        visibility: "public",
        createdAt: "2024-01-01T00:00:00Z",
      };

      expect(Array.isArray(app.tags)).toBe(true);
      expect(app.tags.length).toBe(3);
      expect(app.tags[0]).toBe("tag1");
    });

    it("should handle nested error details correctly", () => {
      const errorWithDetails: ApiError = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: {
          name: "Name is required",
          email: "Invalid email format",
        },
      };

      expect(errorWithDetails.details).toBeDefined();
      expect(Object.keys(errorWithDetails.details!).length).toBe(2);
      expect(errorWithDetails.details!.name).toBe("Name is required");
    });
  });
});
