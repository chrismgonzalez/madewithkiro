import { ApiClient, ApiClientError } from "./apiClient";
import type {
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
} from "@/types";

/**
 * Profile Service
 *
 * Handles all profile-related API operations including:
 * - Fetching user profiles
 * - Creating new profiles
 * - Updating existing profiles
 *
 * @example
 * ```typescript
 * import { profileService } from '@/services/profileService';
 *
 * // Get a user profile
 * const profile = await profileService.getProfile("user-123");
 *
 * // Create a new profile
 * const newProfile = await profileService.createProfile({
 *   firstName: "John",
 *   lastName: "Doe",
 *   awsBuilderHandle: "johndoe",
 *   linkedInUsername: "john-doe",
 *   githubUsername: "johndoe"
 * });
 *
 * // Update a profile
 * const updated = await profileService.updateProfile({
 *   userId: "user-123",
 *   firstName: "Jane",
 *   lastName: "Doe",
 *   awsBuilderHandle: "janedoe"
 * });
 * ```
 */
class ProfileService {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient();
  }

  /**
   * Get a user profile by userId
   *
   * Makes a GET request to `/profile/{userId}` to fetch the user's profile data.
   *
   * @param userId - The unique identifier for the user
   * @returns Promise resolving to the user profile
   * @throws ApiClientError if the request fails (e.g., 404 if user not found)
   *
   * @example
   * ```typescript
   * try {
   *   const profile = await profileService.getProfile("user-123");
   *   console.log(profile.firstName, profile.lastName);
   * } catch (error) {
   *   if (error instanceof ApiClientError && error.status === 404) {
   *     console.log("User not found");
   *   }
   * }
   * ```
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const response = await this.apiClient.get<UserProfile>(
      `/profile/${userId}`
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
      throw new ApiClientError("No profile data returned", "NO_DATA", 500);
    }

    return response.data;
  }

  /**
   * Create a new user profile
   *
   * Makes a POST request to `/profile` with the profile data.
   *
   * @param data - The profile data to create (firstName, lastName, awsBuilderHandle required)
   * @returns Promise resolving to the created user profile with generated userId
   * @throws ApiClientError if the request fails (e.g., 400 for validation errors)
   *
   * @example
   * ```typescript
   * try {
   *   const profile = await profileService.createProfile({
   *     firstName: "John",
   *     lastName: "Doe",
   *     awsBuilderHandle: "johndoe",
   *     linkedInUsername: "john-doe", // optional
   *     githubUsername: "johndoe" // optional
   *   });
   *   console.log("Created profile with ID:", profile.userId);
   * } catch (error) {
   *   if (error instanceof ApiClientError && error.details) {
   *     console.log("Validation errors:", error.details);
   *   }
   * }
   * ```
   */
  async createProfile(data: CreateProfileRequest): Promise<UserProfile> {
    const response = await this.apiClient.post<UserProfile>("/profile", data);

    if (response.error) {
      throw new ApiClientError(
        response.error.message,
        response.error.code,
        response.error.status,
        response.error.details
      );
    }

    if (!response.data) {
      throw new ApiClientError("No profile data returned", "NO_DATA", 500);
    }

    return response.data;
  }

  /**
   * Update an existing user profile
   *
   * Makes a PUT request to `/profile/{userId}` with the updated profile data.
   *
   * @param data - The profile data to update (must include userId)
   * @returns Promise resolving to the updated user profile
   * @throws ApiClientError if the request fails (e.g., 404 if user not found, 400 for validation errors)
   *
   * @example
   * ```typescript
   * try {
   *   const updated = await profileService.updateProfile({
   *     userId: "user-123",
   *     firstName: "Jane",
   *     lastName: "Smith",
   *     awsBuilderHandle: "janesmith",
   *     linkedInUsername: "jane-smith"
   *   });
   *   console.log("Profile updated:", updated.updatedAt);
   * } catch (error) {
   *   if (error instanceof ApiClientError) {
   *     console.error("Update failed:", error.message);
   *   }
   * }
   * ```
   */
  async updateProfile(
    data: UpdateProfileRequest & { userId: string }
  ): Promise<UserProfile> {
    const { userId, ...updateData } = data;

    const response = await this.apiClient.put<UserProfile>(
      `/profile/${userId}`,
      updateData
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
      throw new ApiClientError("No profile data returned", "NO_DATA", 500);
    }

    return response.data;
  }
}

/**
 * Lazy singleton instance of ProfileService
 * @private
 */
let _instance: ProfileService | null = null;

/**
 * Get the singleton instance of ProfileService
 *
 * Creates a new instance on first call, then returns the same instance.
 *
 * @returns The singleton ProfileService instance
 */
export const getProfileService = (): ProfileService => {
  if (!_instance) {
    _instance = new ProfileService();
  }
  return _instance;
};

/**
 * Default ProfileService instance (lazy loaded)
 *
 * Uses a Proxy to lazily initialize the singleton instance.
 * This is the recommended way to use the ProfileService.
 *
 * @example
 * ```typescript
 * import { profileService } from '@/services/profileService';
 *
 * const profile = await profileService.getProfile("user-123");
 * ```
 */
export const profileService = new Proxy({} as ProfileService, {
  get(_target, prop) {
    return getProfileService()[prop as keyof ProfileService];
  },
});

/**
 * Export ProfileService class for testing and custom instantiation
 *
 * @example
 * ```typescript
 * // For testing with a custom API client
 * import { ProfileService } from '@/services/profileService';
 * const mockClient = new ApiClient({ baseURL: "http://localhost:3000" });
 * const service = new ProfileService(mockClient);
 * ```
 */
export { ProfileService };
