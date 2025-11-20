/**
 * Core type definitions for the MadeWithKiro application
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

export type ApplicationVisibility = "public" | "private";

export interface Application {
  appId: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  appUrl: string;
  githubUrl?: string;
  tags: string[];
  visibility: ApplicationVisibility;
  createdAt: string;
}

export interface CreateProfileRequest {
  firstName: string;
  lastName: string;
  awsBuilderHandle: string;
  linkedInUsername?: string;
  githubUsername?: string;
}

export interface UpdateProfileRequest extends CreateProfileRequest {
  userId: string;
}

export interface CreateApplicationRequest {
  name: string;
  description: string;
  appUrl: string;
  githubUrl?: string;
  tags: string[];
  visibility: ApplicationVisibility;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  statusCode: number;
}
