import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

/**
 * Authentication Service
 *
 * Provides methods for token management and authentication checks.
 * Handles interaction with AWS Cognito through Amplify Auth.
 *
 * @example
 * ```typescript
 * import { authService } from '@/services/authService';
 *
 * // Check if user is authenticated
 * const isAuth = await authService.isAuthenticated();
 *
 * // Get access token for API requests
 * const token = await authService.getAccessToken();
 * ```
 */
export class AuthService {
  /**
   * Get current access token
   *
   * Retrieves the access token from the current Cognito session.
   * Returns null if the user is not authenticated or the session has expired.
   *
   * Note: API Gateway Cognito User Pool authorizer validates EITHER the ID token OR access token.
   * However, the ID token contains user claims (sub, email, etc.) which are passed to Lambda,
   * while the access token only contains scopes. For this application, we use the ID token
   * to ensure Lambda functions receive user identity information.
   *
   * @returns Access token string or null if not authenticated
   *
   * @example
   * ```typescript
   * const token = await authService.getAccessToken();
   * if (token) {
   *   // Use token for API request
   *   headers.set('Authorization', `Bearer ${token}`);
   * }
   * ```
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      // Use ID token for API Gateway Cognito authorizer
      // ID token contains user claims (sub, email, custom attributes)
      // Access token only contains scopes and is less useful for authorization
      return session.tokens?.idToken?.toString() ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current ID token
   *
   * Retrieves the ID token from the current Cognito session.
   * The ID token contains user identity claims.
   * Returns null if the user is not authenticated or the session has expired.
   *
   * @returns ID token string or null if not authenticated
   *
   * @example
   * ```typescript
   * const idToken = await authService.getIdToken();
   * if (idToken) {
   *   // Parse token claims
   *   const claims = parseJwt(idToken);
   * }
   * ```
   */
  async getIdToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   *
   * Verifies if a user has a valid Cognito session.
   *
   * @returns True if user has valid session, false otherwise
   *
   * @example
   * ```typescript
   * const isAuth = await authService.isAuthenticated();
   * if (isAuth) {
   *   // Show authenticated UI
   * } else {
   *   // Redirect to login
   * }
   * ```
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh current session
   *
   * Attempts to refresh the current session using Cognito refresh token.
   *
   * @returns True if refresh succeeded, false if refresh failed
   *
   * @example
   * ```typescript
   * const refreshed = await authService.refreshSession();
   * if (refreshed) {
   *   // Session refreshed successfully
   *   const newToken = await authService.getAccessToken();
   * } else {
   *   // Refresh failed, redirect to login
   *   window.location.href = '/auth';
   * }
   * ```
   */
  async refreshSession(): Promise<boolean> {
    try {
      await fetchAuthSession({ forceRefresh: true });
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Singleton instance of AuthService
 *
 * Use this exported instance throughout the application for consistent
 * authentication state management.
 *
 * @example
 * ```typescript
 * import { authService } from '@/services/authService';
 *
 * const token = await authService.getAccessToken();
 * ```
 */
export const authService = new AuthService();

/**
 * Linked Identity
 *
 * Represents a single authentication identity linked to a user account
 */
export interface LinkedIdentity {
  provider: string;
  userId: string;
}

/**
 * Link Accounts Response
 *
 * Response structure from the link accounts API endpoint
 */
export interface LinkAccountsResponse {
  success: boolean;
  message: string;
  linkedIdentities: LinkedIdentity[];
}

/**
 * Known API error codes for account linking operations
 */
export type LinkAccountsErrorCode =
  | "LINK_FAILED"
  | "EMAIL_NOT_VERIFIED"
  | "UNAUTHORIZED"
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "INVALID_REQUEST"
  | "REQUEST_CANCELLED";

/**
 * Error message mapping for account linking operations
 *
 * Maps error codes to user-friendly messages that can be displayed in the UI
 */
const ERROR_MESSAGES: Record<LinkAccountsErrorCode, string> = {
  LINK_FAILED: "Unable to link accounts. Please try again later.",
  EMAIL_NOT_VERIFIED:
    "Both accounts must have verified email addresses before linking.",
  UNAUTHORIZED: "Please sign in again to link your accounts.",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  TIMEOUT_ERROR: "Request timed out. Please try again.",
  INVALID_REQUEST: "Invalid request. Please try again.",
  REQUEST_CANCELLED: "Request was cancelled.",
};

/**
 * Default error message for unknown error codes
 */
const DEFAULT_ERROR_MESSAGE =
  "An unexpected error occurred. Please try again later.";

/**
 * Map API error codes to user-friendly messages
 *
 * Converts technical error codes from the API into clear, actionable messages
 * that can be displayed to users. Falls back to a generic message for unknown codes.
 *
 * @param errorCode - The error code from the API
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * const message = mapErrorToUserMessage('EMAIL_NOT_VERIFIED');
 * // Returns: "Both accounts must have verified email addresses before linking."
 *
 * const unknownMessage = mapErrorToUserMessage('UNKNOWN_CODE');
 * // Returns: "An unexpected error occurred. Please try again later."
 * ```
 */
export function mapErrorToUserMessage(errorCode: string): string {
  return (
    ERROR_MESSAGES[errorCode as LinkAccountsErrorCode] || DEFAULT_ERROR_MESSAGE
  );
}

/**
 * Link user accounts
 *
 * Links the current user's account with another account identified by targetUserSub.
 * This enables users to sign in with multiple authentication methods (e.g., Google and Email OTP)
 * while maintaining a single profile.
 *
 * The function calls the /auth/link-accounts API endpoint with the target user's sub.
 * The JWT token is automatically included by the apiClient for authentication.
 *
 * Error handling:
 * - Maps API error codes to user-friendly messages
 * - Handles network errors gracefully
 * - Handles timeout errors
 * - Preserves original error details for debugging
 *
 * @param targetUserSub - The Cognito sub of the account to link with
 * @returns API response with linked identities or error with user-friendly message
 *
 * @example
 * ```typescript
 * import { linkAccounts } from '@/services/authService';
 *
 * const result = await linkAccounts('target-user-sub-123');
 * if (result.data) {
 *   console.log('Accounts linked:', result.data.linkedIdentities);
 * } else {
 *   // Error message is already user-friendly
 *   console.error('Linking failed:', result.error?.message);
 * }
 * ```
 */
export async function linkAccounts(targetUserSub: string) {
  const { apiClient } = await import("./apiClient");

  const response = await apiClient.post<LinkAccountsResponse>(
    "/auth/link-accounts",
    {
      targetUserSub,
      confirmLink: true,
    }
  );

  // If there's an error, enhance it with a user-friendly message
  if (response.error) {
    const userFriendlyMessage = mapErrorToUserMessage(response.error.code);

    return {
      data: null,
      error: {
        ...response.error,
        message: userFriendlyMessage,
      },
    };
  }

  return response;
}
