/**
 * Core type definitions for the MadeWithKiro application
 * These interfaces match the backend Pydantic models exactly
 */

/**
 * User Profile - matches backend UserProfile model
 */
export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create Profile Request - matches backend CreateProfileRequest model
 */
export interface CreateProfileRequest {
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
}

/**
 * Update Profile Request - matches backend UpdateProfileRequest model
 */
export interface UpdateProfileRequest {
  userId: string;
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
}

/**
 * Application visibility type (for future use - not yet in backend)
 */
export type ApplicationVisibility = "public" | "private";

/**
 * Application - matches backend Application model
 */
export interface Application {
  appId: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  appUrl?: string;
  githubUrl: string;
  tags: string[];
  visibility: ApplicationVisibility; // Future feature - not yet in backend
  createdAt: string;
}

/**
 * Create Application Request - matches backend CreateApplicationRequest model
 */
export interface CreateApplicationRequest {
  name: string;
  description: string;
  appUrl?: string;
  githubUrl: string;
  tags: string[];
  visibility: ApplicationVisibility; // Future feature - not yet in backend
}

/**
 * Update Application Request (for future use)
 */
export interface UpdateApplicationRequest {
  name: string;
  description: string;
  appUrl: string;
  githubUrl?: string;
  tags: string[];
  visibility: ApplicationVisibility;
}

/**
 * API Error - matches backend error response format
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  statusCode: number;
}

/**
 * Type aliases for backward compatibility with design document
 */
export type CreateProfileData = CreateProfileRequest;
export type UpdateProfileData = UpdateProfileRequest;
export type CreateApplicationData = CreateApplicationRequest;
