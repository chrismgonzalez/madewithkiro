import { ApiClient, ApiClientError } from "./apiClient";
import type { Application, CreateApplicationRequest } from "@/types";

/**
 * Application Service
 *
 * Handles all application-related API operations including:
 * - Fetching all public applications
 * - Fetching applications by user
 * - Creating new applications
 *
 * @example
 * ```typescript
 * import { applicationService } from '@/services/applicationService';
 *
 * // Get all applications
 * const allApps = await applicationService.listApplications();
 *
 * // Get applications for a specific user
 * const userApps = await applicationService.listApplications("user-123");
 *
 * // Create a new application
 * const newApp = await applicationService.createApplication({
 *   userId: "user-123",
 *   name: "My Awesome App",
 *   description: "A cool application built with Kiro",
 *   appUrl: "https://myapp.example.com",
 *   githubUrl: "https://github.com/user/myapp",
 *   tags: ["React", "AWS", "Serverless"]
 * });
 * ```
 */
class ApplicationService {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient();
  }

  /**
   * List applications
   *
   * Makes a GET request to `/applications` to fetch applications.
   * If userId is provided, adds it as a query parameter to filter by user.
   *
   * @param userId - Optional user ID to filter applications by user
   * @returns Promise resolving to an array of applications (empty array if none found)
   * @throws ApiClientError if the request fails
   *
   * @example
   * ```typescript
   * // Get all applications
   * const allApps = await applicationService.listApplications();
   * console.log(`Found ${allApps.length} applications`);
   *
   * // Get applications for a specific user
   * const userApps = await applicationService.listApplications("user-123");
   * console.log(`User has ${userApps.length} applications`);
   * ```
   */
  async listApplications(userId?: string): Promise<Application[]> {
    const params = userId ? { userId } : undefined;

    const response = await this.apiClient.get<Application[]>(
      "/applications",
      params
    );

    if (response.error) {
      throw new ApiClientError(
        response.error.message,
        response.error.code,
        response.error.status,
        response.error.details
      );
    }

    if (!response.data) {
      throw new ApiClientError("No application data returned", "NO_DATA", 500);
    }

    return response.data;
  }

  /**
   * Create a new application
   *
   * Makes a POST request to `/applications` with the application data.
   *
   * @param data - The application data to create (name, description, appUrl, userId, tags required)
   * @returns Promise resolving to the created application with generated appId
   * @throws ApiClientError if the request fails (e.g., 400 for validation errors)
   *
   * @example
   * ```typescript
   * try {
   *   const app = await applicationService.createApplication({
   *     userId: "user-123",
   *     name: "Task Manager",
   *     description: "A simple task management app",
   *     appUrl: "https://tasks.example.com",
   *     githubUrl: "https://github.com/user/tasks", // optional
   *     tags: ["Productivity", "React", "TypeScript"]
   *   });
   *   console.log("Created application with ID:", app.appId);
   * } catch (error) {
   *   if (error instanceof ApiClientError && error.details) {
   *     console.log("Validation errors:", error.details);
   *   }
   * }
   * ```
   */
  async createApplication(
    data: CreateApplicationRequest & { userId: string }
  ): Promise<Application> {
    const response = await this.apiClient.post<Application>(
      "/applications",
      data
    );

    if (response.error) {
      throw new ApiClientError(
        response.error.message,
        response.error.code,
        response.error.status,
        response.error.details
      );
    }

    if (!response.data) {
      throw new ApiClientError("No application data returned", "NO_DATA", 500);
    }

    return response.data;
  }

  /**
   * Get a single application by ID
   *
   * Makes a GET request to `/applications/{appId}` to fetch a specific application.
   *
   * @param appId - The application ID
   * @returns Promise resolving to the application
   * @throws ApiClientError if the request fails (e.g., 404 if not found)
   */
  async getApplication(appId: string): Promise<Application> {
    const response = await this.apiClient.get<Application>(
      `/applications/${appId}`
    );

    if (response.error) {
      throw new ApiClientError(
        response.error.message,
        response.error.code,
        response.error.status,
        response.error.details
      );
    }

    if (!response.data) {
      throw new ApiClientError("No application data returned", "NO_DATA", 500);
    }

    return response.data;
  }

  /**
   * Update an existing application
   *
   * Makes a PUT request to `/applications/{appId}` with the updated data.
   *
   * @param appId - The application ID
   * @param data - The updated application data
   * @returns Promise resolving to the updated application
   * @throws ApiClientError if the request fails
   */
  async updateApplication(
    appId: string,
    data: Partial<CreateApplicationRequest> & { userId: string }
  ): Promise<Application> {
    const response = await this.apiClient.put<Application>(
      `/applications/${appId}`,
      data
    );

    if (response.error) {
      throw new ApiClientError(
        response.error.message,
        response.error.code,
        response.error.status,
        response.error.details
      );
    }

    if (!response.data) {
      throw new ApiClientError("No application data returned", "NO_DATA", 500);
    }

    return response.data;
  }

  /**
   * Delete an application
   *
   * Makes a DELETE request to `/applications/{appId}`.
   *
   * @param appId - The application ID
   * @returns Promise resolving when deletion is complete
   * @throws ApiClientError if the request fails
   */
  async deleteApplication(appId: string, userId: string): Promise<void> {
    // Pass userId as query parameter for DELETE requests
    const params = { userId };
    const response = await this.apiClient.delete<void>(
      `/applications/${appId}`,
      undefined,
      params
    );

    if (response.error) {
      throw new ApiClientError(
        response.error.message,
        response.error.code,
        response.error.status,
        response.error.details
      );
    }
  }
}

/**
 * Lazy singleton instance of ApplicationService
 * @private
 */
let _instance: ApplicationService | null = null;

/**
 * Get the singleton instance of ApplicationService
 *
 * Creates a new instance on first call, then returns the same instance.
 *
 * @returns The singleton ApplicationService instance
 */
export const getApplicationService = (): ApplicationService => {
  if (!_instance) {
    _instance = new ApplicationService();
  }
  return _instance;
};

/**
 * Default ApplicationService instance (lazy loaded)
 *
 * Uses a Proxy to lazily initialize the singleton instance.
 * This is the recommended way to use the ApplicationService.
 *
 * @example
 * ```typescript
 * import { applicationService } from '@/services/applicationService';
 *
 * const apps = await applicationService.listApplications();
 * ```
 */
export const applicationService = new Proxy({} as ApplicationService, {
  get(target, prop) {
    return getApplicationService()[prop as keyof ApplicationService];
  },
});

/**
 * Export ApplicationService class for testing and custom instantiation
 *
 * @example
 * ```typescript
 * // For testing with a custom API client
 * import { ApplicationService } from '@/services/applicationService';
 * const mockClient = new ApiClient({ baseURL: "http://localhost:3000" });
 * const service = new ApplicationService(mockClient);
 * ```
 */
export { ApplicationService };
