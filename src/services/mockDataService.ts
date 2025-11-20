/**
 * Mock Data Service Layer
 * Wraps mock data functions and returns Promises to simulate async API calls
 * This interface will make it easy to swap with real API calls later
 */

import type { UserProfile, Application } from "../types";
import {
  getAllUsers,
  getUserById,
  getAllApplications as getMockApplications,
  getApplicationsByUserId as getMockApplicationsByUserId,
  getAllTags as getMockTags,
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
