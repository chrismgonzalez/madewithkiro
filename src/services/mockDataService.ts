/**
 * Mock Data Service Layer
 * Wraps mock data functions and returns Promises to simulate async API calls
 *
 * NOTE: This file is used by test files for mocking data.
 */

import type {
  UserProfile,
  Application,
  UpdateApplicationRequest,
} from "../types";
import {
  getAllUsers,
  getUserById,
  getAllApplications as getMockApplications,
  getApplicationsByUserId as getMockApplicationsByUserId,
  getAllTags as getMockTags,
  getApplicationById as getMockApplicationById,
  updateApplicationInStore,
  deleteApplicationFromStore,
} from "./mockData";

/**
 * Get a user profile by ID
 * @param userId - The user ID to look up
 * @returns Promise resolving to the user profile or null if not found
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  // Simulate async operation
  const user = getUserById(userId);
  return Promise.resolve(user ?? null);
}

/**
 * Get all user profiles
 * @returns Promise resolving to array of all user profiles
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  // Simulate async operation
  return Promise.resolve(getAllUsers());
}

/**
 * Get all applications with visibility filtering
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Promise resolving to array of applications (filtered by visibility if not authenticated)
 */
export async function getAllApplications(
  isAuthenticated: boolean
): Promise<Application[]> {
  // Simulate async operation
  return Promise.resolve(getMockApplications(isAuthenticated));
}

/**
 * Get applications by user ID with visibility filtering
 * @param userId - The user ID to filter by
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Promise resolving to array of applications for the specified user (filtered by visibility if not authenticated)
 */
export async function getApplicationsByUserId(
  userId: string,
  isAuthenticated: boolean
): Promise<Application[]> {
  // Simulate async operation
  return Promise.resolve(getMockApplicationsByUserId(userId, isAuthenticated));
}

/**
 * Get all unique tags from visible applications
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Promise resolving to array of unique tags
 */
export async function getAllTags(isAuthenticated: boolean): Promise<string[]> {
  // Simulate async operation
  return Promise.resolve(getMockTags(isAuthenticated));
}

/**
 * Filter applications by selected tags (OR logic)
 * @param applications - Array of applications to filter
 * @param tags - Array of tags to filter by
 * @returns Filtered array of applications containing at least one of the selected tags
 */
export function filterApplicationsByTags(
  applications: Application[],
  tags: string[]
): Application[] {
  // If no tags selected, return all applications
  if (tags.length === 0) {
    return applications;
  }

  // Return applications that have at least one of the selected tags (OR logic)
  return applications.filter((app) =>
    app.tags.some((tag) => tags.includes(tag))
  );
}

/**
 * Get an application by ID
 * @param appId - The application ID to look up
 * @returns Promise resolving to the application or null if not found
 */
export async function getApplicationById(
  appId: string
): Promise<Application | null> {
  // Simulate async operation
  const app = getMockApplicationById(appId);
  return Promise.resolve(app ?? null);
}

/**
 * Update an application
 * @param appId - The application ID to update
 * @param data - The data to update
 * @param userId - The ID of the user attempting the update
 * @returns Promise resolving to the updated application
 * @throws Error if application not found or user is not authorized
 */
export async function updateApplication(
  appId: string,
  data: UpdateApplicationRequest,
  userId: string
): Promise<Application> {
  // Validate ownership
  const existing = getMockApplicationById(appId);
  if (!existing) {
    throw new Error("Application not found");
  }
  if (existing.userId !== userId) {
    throw new Error("Unauthorized: You can only edit your own applications");
  }

  // Update application
  const updated = updateApplicationInStore(appId, data);
  return Promise.resolve(updated);
}

/**
 * Delete an application
 * @param appId - The application ID to delete
 * @param userId - The ID of the user attempting the deletion
 * @returns Promise resolving when deletion is complete
 * @throws Error if application not found or user is not authorized
 */
export async function deleteApplication(
  appId: string,
  userId: string
): Promise<void> {
  // Validate ownership
  const existing = getMockApplicationById(appId);
  if (!existing) {
    throw new Error("Application not found");
  }
  if (existing.userId !== userId) {
    throw new Error("Unauthorized: You can only delete your own applications");
  }

  // Delete application
  deleteApplicationFromStore(appId);
  return Promise.resolve();
}
