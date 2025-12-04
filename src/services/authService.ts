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
