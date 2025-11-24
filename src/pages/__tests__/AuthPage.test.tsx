import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AuthPage } from "../AuthPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { Auth } from "aws-amplify";

// Mock AWS Amplify Auth
vi.mock("aws-amplify", () => ({
  Auth: {
    federatedSignIn: vi.fn(),
    currentAuthenticatedUser: vi.fn(),
    userAttributes: vi.fn(),
    signOut: vi.fn(),
    currentSession: vi.fn(),
  },
  Hub: {
    listen: vi.fn(() => () => {}),
  },
}));

// Helper to render AuthPage with required providers
const renderAuthPage = () => {
  return render(
    <AuthProvider>
      <AuthPage />
    </AuthProvider>
  );
};

describe("AuthPage - Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock currentAuthenticatedUser to return null (not authenticated)
    vi.mocked(Auth.currentAuthenticatedUser).mockRejectedValue(
      new Error("Not authenticated")
    );
  });

  describe("GIVEN a user visits the authentication page", () => {
    it("WHEN the page loads THEN the system should display a 'Sign in with Google' button with the Google icon", async () => {
      renderAuthPage();

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText(/completing sign in/i)
        ).not.toBeInTheDocument();
      });

      // Check for Google button
      const googleButton = screen.getByRole("button", {
        name: /sign in with google/i,
      });
      expect(googleButton).toBeInTheDocument();

      // Verify button is visible and enabled
      expect(googleButton).toBeVisible();
      expect(googleButton).toBeEnabled();
    });

    it("WHEN the page loads THEN the system should display a 'Sign in with GitHub' button with the GitHub icon", async () => {
      renderAuthPage();

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText(/completing sign in/i)
        ).not.toBeInTheDocument();
      });

      // Check for GitHub button
      const githubButton = screen.getByRole("button", {
        name: /sign in with github/i,
      });
      expect(githubButton).toBeInTheDocument();

      // Verify button is visible and enabled
      expect(githubButton).toBeVisible();
      expect(githubButton).toBeEnabled();
    });
  });

  describe("GIVEN a user clicks the 'Sign in with Google' button", () => {
    it("WHEN the button is clicked THEN the system should call signInWithGoogle and show a loading state", async () => {
      const user = userEvent.setup();
      renderAuthPage();

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText(/completing sign in/i)
        ).not.toBeInTheDocument();
      });

      const googleButton = screen.getByRole("button", {
        name: /sign in with google/i,
      });

      // Click the Google button
      await user.click(googleButton);

      // Verify Auth.federatedSignIn was called with Google provider
      await waitFor(() => {
        expect(Auth.federatedSignIn).toHaveBeenCalledWith({
          provider: "Google",
        });
      });

      // Verify button is disabled during loading
      expect(googleButton).toBeDisabled();
    });
  });

  describe("GIVEN a user clicks the 'Sign in with GitHub' button", () => {
    it("WHEN the button is clicked THEN the system should call signInWithGitHub and show a loading state", async () => {
      const user = userEvent.setup();
      renderAuthPage();

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText(/completing sign in/i)
        ).not.toBeInTheDocument();
      });

      const githubButton = screen.getByRole("button", {
        name: /sign in with github/i,
      });

      // Click the GitHub button
      await user.click(githubButton);

      // Verify Auth.federatedSignIn was called with GitHub provider
      await waitFor(() => {
        expect(Auth.federatedSignIn).toHaveBeenCalledWith({
          provider: "GitHub",
        });
      });

      // Verify button is disabled during loading
      expect(githubButton).toBeDisabled();
    });
  });

  describe("GIVEN an OAuth error occurs", () => {
    it("WHEN the error is returned in the URL parameters THEN the system should display a user-friendly error message", async () => {
      // Create a mock location with error parameters
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search: "?error=access_denied&error_description=User%20cancelled",
      } as Location;

      renderAuthPage();

      // Wait for error message to appear
      await waitFor(() => {
        const errorMessage = screen.getByText(
          /you cancelled the sign-in process/i
        );
        expect(errorMessage).toBeInTheDocument();
      });

      // Restore original location
      window.location = originalLocation;
    });

    it("WHEN an invalid_request error occurs THEN the system should display appropriate error message", async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search: "?error=invalid_request",
      } as Location;

      renderAuthPage();

      await waitFor(() => {
        const errorMessage = screen.getByText(
          /authentication request was invalid/i
        );
        expect(errorMessage).toBeInTheDocument();
      });

      window.location = originalLocation;
    });

    it("WHEN a server_error occurs THEN the system should display appropriate error message", async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search: "?error=server_error",
      } as Location;

      renderAuthPage();

      await waitFor(() => {
        const errorMessage = screen.getByText(
          /authentication provider encountered an error/i
        );
        expect(errorMessage).toBeInTheDocument();
      });

      window.location = originalLocation;
    });

    it("WHEN an unknown error occurs THEN the system should display a generic error message", async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        search:
          "?error=unknown_error&error_description=Something%20went%20wrong",
      } as Location;

      renderAuthPage();

      await waitFor(() => {
        const errorMessage = screen.getByText(/something went wrong/i);
        expect(errorMessage).toBeInTheDocument();
      });

      window.location = originalLocation;
    });
  });
});
