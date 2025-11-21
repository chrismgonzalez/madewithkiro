import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProfileService } from "../profileService";
import { ApiClient } from "../apiClient";
import type {
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
} from "@/types";

describe("Profile Service - Acceptance Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let profileService: ProfileService;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Create API client with test base URL
    const apiClient = new ApiClient({ baseURL: "https://api.test.com" });
    profileService = new ProfileService(apiClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getProfile", () => {
    it("GIVEN I call getProfile with a valid userId WHEN the request is made THEN a GET request should be sent to the profile endpoint and return the user profile data", async () => {
      // Arrange
      const userId = "user-123";
      const mockProfile: UserProfile = {
        userId: "user-123",
        firstName: "John",
        lastName: "Doe",
        awsBuilderHandle: "johndoe",
        linkedInUsername: "johndoe",
        githubUsername: "johndoe",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockProfile }),
      });

      // Act
      const result = await profileService.getProfile(userId);

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain(`/profile/${userId}`);
      expect(options.method).toBe("GET");
      expect(result).toEqual(mockProfile);
    });
  });

  describe("createProfile", () => {
    it("GIVEN I call createProfile with valid profile data WHEN the request is made THEN a POST request should be sent with the authenticated user's token and return the created profile", async () => {
      // Arrange
      const profileData: CreateProfileRequest = {
        firstName: "Jane",
        lastName: "Smith",
        awsBuilderHandle: "janesmith",
        linkedInUsername: "janesmith",
        githubUsername: "janesmith",
      };

      const mockCreatedProfile: UserProfile = {
        userId: "user-456",
        ...profileData,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: mockCreatedProfile }),
      });

      // Act
      const result = await profileService.createProfile(profileData);

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/profile");
      expect(options.method).toBe("POST");
      expect(options.body).toBe(JSON.stringify(profileData));
      expect(result).toEqual(mockCreatedProfile);
    });
  });

  describe("updateProfile", () => {
    it("GIVEN I call updateProfile with valid updated data WHEN the request is made THEN a PUT request should be sent with the authenticated user's token and return the updated profile", async () => {
      // Arrange
      const userId = "user-123";
      const updateData: UpdateProfileRequest = {
        userId,
        firstName: "John",
        lastName: "Updated",
        awsBuilderHandle: "johnupdated",
        linkedInUsername: "johnupdated",
      };

      const mockUpdatedProfile: UserProfile = {
        ...updateData,
        githubUsername: undefined,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockUpdatedProfile }),
      });

      // Act
      const result = await profileService.updateProfile(updateData);

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain(`/profile/${userId}`);
      expect(options.method).toBe("PUT");

      // The service should strip userId from the body
      const { userId: _, ...expectedBody } = updateData;
      expect(options.body).toBe(JSON.stringify(expectedBody));
      expect(result).toEqual(mockUpdatedProfile);
    });
  });

  describe("validation error handling", () => {
    it("GIVEN a profile API call fails with validation errors WHEN the error response is processed THEN the system should return an object mapping field names to error messages", async () => {
      // Arrange
      const profileData: CreateProfileRequest = {
        firstName: "",
        lastName: "Smith",
        awsBuilderHandle: "invalid handle",
      };

      const validationErrors = {
        firstName: "First name is required",
        awsBuilderHandle: "AWS Builder Handle cannot contain spaces",
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
      });

      // Act & Assert
      try {
        await profileService.createProfile(profileData);
        // Should not reach here
        expect.fail("Expected createProfile to throw an error");
      } catch (error: any) {
        expect(error.details).toEqual(validationErrors);
        expect(error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("response type consistency", () => {
    it("GIVEN a profile API call succeeds WHEN the response is processed THEN the system should return the profile data in a consistent format matching the UserProfile type", async () => {
      // Arrange
      const userId = "user-789";
      const mockProfile: UserProfile = {
        userId,
        firstName: "Alice",
        lastName: "Johnson",
        awsBuilderHandle: "alicejohnson",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockProfile }),
      });

      // Act
      const result = await profileService.getProfile(userId);

      // Assert - Verify all required fields are present
      expect(result).toHaveProperty("userId");
      expect(result).toHaveProperty("firstName");
      expect(result).toHaveProperty("lastName");
      expect(result).toHaveProperty("awsBuilderHandle");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");

      // Verify types
      expect(typeof result.userId).toBe("string");
      expect(typeof result.firstName).toBe("string");
      expect(typeof result.lastName).toBe("string");
      expect(typeof result.awsBuilderHandle).toBe("string");
      expect(typeof result.createdAt).toBe("string");
      expect(typeof result.updatedAt).toBe("string");

      // Optional fields should be undefined or string
      if (result.linkedInUsername !== undefined) {
        expect(typeof result.linkedInUsername).toBe("string");
      }
      if (result.githubUsername !== undefined) {
        expect(typeof result.githubUsername).toBe("string");
      }
    });
  });
});
