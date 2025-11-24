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
      // API Gateway Cognito authorizer requires ID token, not access token
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
   * This method checks for the presence of an authenticated user
   * without throwing errors.
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
   * Attempts to refresh the current Cognito session using the refresh token.
   * This is useful for obtaining new access and ID tokens when they expire.
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
