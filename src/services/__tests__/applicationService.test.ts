import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApplicationService } from "../applicationService";
import { ApiClient } from "../apiClient";
import type { Application, CreateApplicationRequest } from "@/types";

describe("Application Service - Acceptance Tests", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let applicationService: ApplicationService;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Create API client with test base URL
    const apiClient = new ApiClient({ baseURL: "https://api.test.com" });
    applicationService = new ApplicationService(apiClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listApplications", () => {
    it("GIVEN I call listApplications without parameters WHEN the request is made THEN a GET request should be sent to the applications endpoint and return all public applications", async () => {
      // Arrange
      const mockApplications: Application[] = [
        {
          appId: "app-1",
          userId: "user-1",
          userName: "John Doe",
          name: "App One",
          description: "First application",
          appUrl: "https://app1.example.com",
          githubUrl: "https://github.com/user/app1",
          tags: ["react", "typescript"],
          visibility: "public",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          appId: "app-2",
          userId: "user-2",
          userName: "Jane Smith",
          name: "App Two",
          description: "Second application",
          appUrl: "https://app2.example.com",
          tags: ["vue", "javascript"],
          visibility: "public",
          createdAt: "2024-01-02T00:00:00Z",
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockApplications }),
      });

      // Act
      const result = await applicationService.listApplications();

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/applications");
      expect(url).not.toContain("userId");
      expect(options.method).toBe("GET");
      expect(result).toEqual(mockApplications);
    });

    it("GIVEN I call listApplications with a userId parameter WHEN the request is made THEN a GET request should be sent with the userId query parameter and return that user's applications", async () => {
      // Arrange
      const userId = "user-123";
      const mockUserApplications: Application[] = [
        {
          appId: "app-1",
          userId: "user-123",
          userName: "John Doe",
          name: "My App",
          description: "My application",
          appUrl: "https://myapp.example.com",
          githubUrl: "https://github.com/user/myapp",
          tags: ["react", "typescript"],
          visibility: "public",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockUserApplications }),
      });

      // Act
      const result = await applicationService.listApplications(userId);

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/applications");
      expect(url).toContain(`userId=${userId}`);
      expect(options.method).toBe("GET");
      expect(result).toEqual(mockUserApplications);
    });
  });

  describe("createApplication", () => {
    it("GIVEN I call createApplication with valid application data and userId WHEN the request is made THEN a POST request should be sent and return the created application", async () => {
      // Arrange
      const applicationData: CreateApplicationRequest = {
        name: "New App",
        description: "A new application",
        appUrl: "https://newapp.example.com",
        githubUrl: "https://github.com/user/newapp",
        tags: ["react", "typescript", "aws"],
        visibility: "public",
      };

      const mockCreatedApplication: Application = {
        appId: "app-789",
        userId: "user-123",
        userName: "John Doe",
        ...applicationData,
        createdAt: "2024-01-03T00:00:00Z",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: mockCreatedApplication }),
      });

      // Act
      const result = await applicationService.createApplication(
        applicationData
      );

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("/applications");
      expect(options.method).toBe("POST");
      expect(options.body).toBe(JSON.stringify(applicationData));
      expect(result).toEqual(mockCreatedApplication);
    });
  });

  describe("validation error handling", () => {
    it("GIVEN an application API call fails with validation errors WHEN the error response is processed THEN the system should return an object mapping field names to error messages", async () => {
      // Arrange
      const applicationData: CreateApplicationRequest = {
        name: "",
        description: "Test",
        appUrl: "invalid-url",
        tags: [],
        visibility: "public",
      };

      const validationErrors = {
        name: "Application name is required",
        appUrl: "Invalid URL format",
        tags: "At least one tag is required",
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
        await applicationService.createApplication(applicationData);
        // Should not reach here
        expect.fail("Expected createApplication to throw an error");
      } catch (error: any) {
        expect(error.details).toEqual(validationErrors);
        expect(error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("response type consistency", () => {
    it("GIVEN an application API call succeeds WHEN the response is processed THEN the system should return the application data in a consistent format matching the Application type", async () => {
      // Arrange
      const mockApplications: Application[] = [
        {
          appId: "app-999",
          userId: "user-999",
          userName: "Test User",
          name: "Test App",
          description: "Test application",
          appUrl: "https://testapp.example.com",
          tags: ["test"],
          visibility: "public",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockApplications }),
      });

      // Act
      const result = await applicationService.listApplications();

      // Assert - Verify all required fields are present
      expect(result).toHaveLength(1);
      const app = result[0];

      expect(app).toHaveProperty("appId");
      expect(app).toHaveProperty("userId");
      expect(app).toHaveProperty("userName");
      expect(app).toHaveProperty("name");
      expect(app).toHaveProperty("description");
      expect(app).toHaveProperty("appUrl");
      expect(app).toHaveProperty("tags");
      expect(app).toHaveProperty("visibility");
      expect(app).toHaveProperty("createdAt");

      // Verify types
      expect(typeof app.appId).toBe("string");
      expect(typeof app.userId).toBe("string");
      expect(typeof app.userName).toBe("string");
      expect(typeof app.name).toBe("string");
      expect(typeof app.description).toBe("string");
      expect(typeof app.appUrl).toBe("string");
      expect(Array.isArray(app.tags)).toBe(true);
      expect(typeof app.visibility).toBe("string");
      expect(typeof app.createdAt).toBe("string");

      // Optional fields should be undefined or string
      if (app.githubUrl !== undefined) {
        expect(typeof app.githubUrl).toBe("string");
      }
    });
  });
});
