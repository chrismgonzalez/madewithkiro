/**
 * OAuth Error Utilities
 *
 * Provides utilities for handling and mapping OAuth error codes
 * to user-friendly error messages.
 */

/**
 * Map OAuth error codes to user-friendly messages
 *
 * Converts OAuth error codes (access_denied, invalid_request, etc.)
 * into human-readable error messages that can be displayed to users.
 *
 * @param error - OAuth error code from the provider
 * @param description - Optional error description from the provider
 * @returns User-friendly error message
 *
 * @example
 * ```ts
 * const message = getOAuthErrorMessage('access_denied');
 * // Returns: "You cancelled the sign-in process. Please try again."
 * ```
 */
export const getOAuthErrorMessage = (
  error: string,
  description?: string | null
): string => {
  const errorMessages: Record<string, string> = {
    access_denied: "You cancelled the sign-in process. Please try again.",
    invalid_request: "Authentication request was invalid. Please try again.",
    unauthorized_client:
      "This application is not authorized. Please contact support.",
    server_error:
      "The authentication provider encountered an error. Please try again later.",
    temporarily_unavailable:
      "The authentication service is temporarily unavailable. Please try again later.",
  };

  return (
    errorMessages[error] ||
    description ||
    "An unexpected error occurred during sign-in."
  );
};
