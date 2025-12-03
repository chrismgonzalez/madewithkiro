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
   * Retrieves the access token from either:
   * 1. OTP authentication (localStorage) - for email OTP users
   * 2. Cognito session (Amplify) - for Google OAuth users
   *
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
      // First, check for OTP access token in localStorage
      const otpToken = localStorage.getItem("otp_access_token");
      if (otpToken) {
        // Verify token is not expired
        try {
          const tokenParts = otpToken.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Date.now() / 1000;
            if (payload.exp && payload.exp > now) {
              return otpToken;
            }
          }
        } catch (e) {
          // Invalid token format, fall through to Cognito
        }
      }

      // Fall back to Cognito session (for Google OAuth users)
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
   * Verifies if a user has a valid session from either:
   * 1. OTP authentication (localStorage) - for email OTP users
   * 2. Cognito session (Amplify) - for Google OAuth users
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
      // Check for valid OTP token first
      const otpToken = localStorage.getItem("otp_access_token");
      if (otpToken) {
        try {
          const tokenParts = otpToken.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Date.now() / 1000;
            if (payload.exp && payload.exp > now) {
              return true;
            }
          }
        } catch (e) {
          // Invalid token, fall through to Cognito check
        }
      }

      // Fall back to Cognito session check
      await getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh current session
   *
   * Attempts to refresh the current session using either:
   * 1. OTP refresh token (localStorage) - for email OTP users
   * 2. Cognito refresh token (Amplify) - for Google OAuth users
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
      // Check if we have an OTP refresh token
      const otpRefreshToken = localStorage.getItem("otp_refresh_token");
      if (otpRefreshToken) {
        // Try to refresh using OTP endpoint
        const { apiClient } = await import("./apiClient");
        const response = await apiClient.request<{
          tokens: {
            accessToken: string;
            refreshToken: string;
            expiresInSeconds: number;
          };
        }>({
          method: "POST",
          endpoint: "/auth/otp/refresh",
          data: { refreshToken: otpRefreshToken },
          requiresAuth: false,
        });

        if (response.data?.tokens) {
          localStorage.setItem(
            "otp_access_token",
            response.data.tokens.accessToken
          );
          localStorage.setItem(
            "otp_refresh_token",
            response.data.tokens.refreshToken
          );
          return true;
        }
        return false;
      }

      // Fall back to Cognito session refresh
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
