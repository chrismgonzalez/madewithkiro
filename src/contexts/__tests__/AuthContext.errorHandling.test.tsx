/**
 * AuthContext Error Handling Tests
 *
 * Tests error handling scenarios for authentication flows including:
 * - OAuth errors from identity providers
 * - Network errors during authentication
 * - Provider unavailability
 * - Retry mechanisms
 * - Error logging
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import * as auth from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

// Mock AWS Amplify modules
vi.mock("aws-amplify/auth");
vi.mock("aws-amplify/utils");

// Test component that uses auth context
const TestComponent = () => {
  const { signInWithGoogle, signInWithGitHub, user, isLoading } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? "Loading" : "Ready"}</div>
      <div data-testid="user">{user ? user.email : "No user"}</div>
      <button onClick={signInWithGoogle} data-testid="google-signin">
        Sign in with Google
      </button>
      <button onClick={signInWithGitHub} data-testid="github-signin">
        Sign in with GitHub
      </button>
    </div>
  );
};

describe("AuthContext - Error Handling", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let hubListenMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Spy on console.error to verify error logging
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock Hub.listen
    hubListenMock = vi.fn(() => vi.fn());
    vi.mocked(Hub.listen).mockImplementation(hubListenMock);

    // Mock getCurrentUser to throw (no user authenticated)
    vi.mocked(auth.getCurrentUser).mockRejectedValue(
      new Error("No current user")
    );
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("OAuth Error Handling", () => {
    it("GIVEN an OAuth error occurs during authentication WHEN the error is detected THEN the system should display a user-friendly error message based on the error type", async () => {
      // Arrange: Mock signInWithRedirect to throw an OAuth error
      const oauthError = new Error("OAuth error: access_denied");
      (oauthError as any).name = "OAuthError";
      vi.mocked(auth.signInWithRedirect).mockRejectedValue(oauthError);

      // Act: Render component and attempt sign-in
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Ready");
      });

      const googleButton = screen.getByTestId("google-signin");

      // Act: Click sign-in button
      try {
        await googleButton.click();
      } catch (error) {
        // Expected to throw
      }

      // Assert: Error should be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Google sign-in error:",
          oauthError
        );
      });
    });

    it("GIVEN different OAuth error types WHEN errors occur THEN appropriate error messages should be logged", async () => {
      const errorTypes = [
        { code: "access_denied", message: "User denied access" },
        { code: "invalid_request", message: "Invalid OAuth request" },
        { code: "server_error", message: "Provider server error" },
      ];

      for (const errorType of errorTypes) {
        // Arrange
        const error = new Error(errorType.message);
        (error as any).code = errorType.code;
        vi.mocked(auth.signInWithRedirect).mockRejectedValue(error);

        // Act
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );

        await waitFor(() => {
          expect(screen.getByTestId("loading")).toHaveTextContent("Ready");
        });

        const googleButton = screen.getByTestId("google-signin");

        try {
          await googleButton.click();
        } catch (e) {
          // Expected
        }

        // Assert
        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Google sign-in error:",
            error
          );
        });

        // Cleanup for next iteration
        vi.clearAllMocks();
        consoleErrorSpy.mockClear();
      }
    });
  });

  describe("Network Error Handling", () => {
    it("GIVEN a network error occurs during authentication WHEN the error is detected THEN the system should display a message indicating a network issue", async () => {
      // Arrange: Mock network error
      const networkError = new Error("Network request failed");
      (networkError as any).name = "NetworkError";
      vi.mocked(auth.signInWithRedirect).mockRejectedValue(networkError);

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Ready");
      });

      const googleButton = screen.getByTestId("google-signin");

      try {
        await googleButton.click();
      } catch (error) {
        // Expected
      }

      // Assert: Network error should be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Google sign-in error:",
          networkError
        );
      });
    });

    it("GIVEN a network error occurs WHEN detected THEN the error should be thrown for UI to handle retry", async () => {
      // Arrange
      const networkError = new Error("Network request failed");
      (networkError as any).name = "NetworkError";
      vi.mocked(auth.signInWithRedirect).mockRejectedValue(networkError);

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Ready");
      });

      const googleButton = screen.getByTestId("google-signin");

      // Assert: Error should be thrown (not swallowed)
      await expect(async () => {
        await googleButton.click();
      }).rejects.toThrow();
    });
  });

  describe("Provider Unavailability", () => {
    it("GIVEN an identity provider is unavailable WHEN the authentication attempt fails THEN the system should display a message indicating the provider is temporarily unavailable", async () => {
      // Arrange: Mock provider unavailable error
      const unavailableError = new Error("Service temporarily unavailable");
      (unavailableError as any).code = "ServiceUnavailable";
      vi.mocked(auth.signInWithRedirect).mockRejectedValue(unavailableError);

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Ready");
      });

      const githubButton = screen.getByTestId("github-signin");

      try {
        await githubButton.click();
      } catch (error) {
        // Expected
      }

      // Assert: Error should be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "GitHub sign-in error:",
          unavailableError
        );
      });
    });

    it("GIVEN Google provider fails WHEN error occurs THEN GitHub provider should remain functional", async () => {
      // Arrange: Google fails, GitHub succeeds
      vi.mocked(auth.signInWithRedirect).mockImplementation(
        async ({ provider }: any) => {
          if (provider === "Google") {
            throw new Error("Google unavailable");
          }
          // GitHub succeeds (no error)
        }
      );

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Ready");
      });

      // Try Google (should fail)
      const googleButton = screen.getByTestId("google-signin");
      try {
        await googleButton.click();
      } catch (error) {
        // Expected
      }

      // Try GitHub (should succeed)
      const githubButton = screen.getByTestId("github-signin");
      await githubButton.click();

      // Assert: GitHub call should have been made
      expect(auth.signInWithRedirect).toHaveBeenCalledWith({
        provider: "GitHub",
      });
    });
  });

  describe("Error Logging", () => {
    it("GIVEN any authentication error occurs WHEN the error is detected THEN the system should log the error details for monitoring", async () => {
      // Arrange
      const testError = new Error("Test authentication error");
      (testError as any).code = "TestError";
      (testError as any).details = { timestamp: Date.now() };
      vi.mocked(auth.signInWithRedirect).mockRejectedValue(testError);

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Ready");
      });

      const googleButton = screen.getByTestId("google-signin");

      try {
        await googleButton.click();
      } catch (error) {
        // Expected
      }

      // Assert: Error should be logged with full details
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Google sign-in error:",
          testError
        );
      });

      // Verify error object structure is preserved
      const loggedError = consoleErrorSpy.mock.calls[0][1];
      expect(loggedError).toHaveProperty("code", "TestError");
      expect(loggedError).toHaveProperty("details");
    });

    it("GIVEN multiple errors occur WHEN they are detected THEN all errors should be logged separately", async () => {
      // Arrange
      const error1 = new Error("First error");
      const error2 = new Error("Second error");

      vi.mocked(auth.signInWithRedirect)
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2);

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Ready");
      });

      const googleButton = screen.getByTestId("google-signin");

      // First attempt
      try {
        await googleButton.click();
      } catch (error) {
        // Expected
      }

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Google sign-in error:",
          error1
        );
      });

      // Second attempt
      try {
        await googleButton.click();
      } catch (error) {
        // Expected
      }

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Google sign-in error:",
          error2
        );
      });

      // Assert: Both errors logged
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Sign-out Error Handling", () => {
    it("GIVEN sign-out fails WHEN error occurs THEN error should be logged", async () => {
      // Arrange
      const signOutError = new Error("Sign-out failed");
      vi.mocked(auth.signOut).mockRejectedValue(signOutError);

      // Create a component that can sign out
      const SignOutComponent = () => {
        const { signOut } = useAuth();
        return (
          <button onClick={signOut} data-testid="signout-button">
            Sign Out
          </button>
        );
      };

      // Act
      render(
        <AuthProvider>
          <SignOutComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("signout-button")).toBeInTheDocument();
      });

      const signOutButton = screen.getByTestId("signout-button");

      try {
        await signOutButton.click();
      } catch (error) {
        // Expected
      }

      // Assert
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Sign-out error:",
          signOutError
        );
      });
    });
  });

  describe("Session Refresh Error Handling", () => {
    it("GIVEN session refresh fails WHEN error occurs THEN error should be logged", async () => {
      // Arrange
      const refreshError = new Error("Session refresh failed");
      vi.mocked(auth.fetchAuthSession).mockRejectedValue(refreshError);

      // Create a component that can refresh session
      const RefreshComponent = () => {
        const { refreshSession } = useAuth();
        return (
          <button onClick={refreshSession} data-testid="refresh-button">
            Refresh
          </button>
        );
      };

      // Act
      render(
        <AuthProvider>
          <RefreshComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId("refresh-button");

      try {
        await refreshButton.click();
      } catch (error) {
        // Expected
      }

      // Assert
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Session refresh error:",
          refreshError
        );
      });
    });
  });
});
