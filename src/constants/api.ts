/**
 * API endpoint constants
 */

/**
 * Default test user ID for development (no auth yet)
 * This user is created by the seed script
 */
export const TEST_USER_ID = "test-user-001";

export const API_ENDPOINTS = {
  // Profile endpoints
  PROFILE: "/profile",
  PROFILE_BY_ID: (userId: string) => `/profile/${userId}`,

  // Application endpoints
  APPLICATIONS: "/applications",
  APPLICATIONS_BY_USER: (userId: string) => `/applications?userId=${userId}`,
} as const;

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
