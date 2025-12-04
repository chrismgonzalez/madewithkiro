import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AuthPage } from "../AuthPage";
import { AuthProvider } from "@/contexts/AuthContext";
import * as amplifyAuth from "aws-amplify/auth";

// Mock AWS Amplify auth
vi.mock("aws-amplify/auth", () => ({
  signInWithRedirect: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchUserAttributes: vi.fn(),
  fetchAuthSession: vi.fn(),
  signOut: vi.fn(),
}));

// Mock AWS Amplify utils
vi.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: vi.fn(() => vi.fn()),
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
    // Mock getCurrentUser to return null (not authenticated)
    vi.mocked(amplifyAuth.getCurrentUser).mockRejectedValue(
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

    it("WHEN the page loads THEN the system should display a 'Sign in with Email' button with the Email icon", async () => {
      renderAuthPage();

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText(/completing sign in/i)
        ).not.toBeInTheDocument();
      });

      // Check for Email button
      const emailButton = screen.getByRole("button", {
        name: /sign in with email/i,
      });
      expect(emailButton).toBeInTheDocument();

      // Verify button is visible and enabled
      expect(emailButton).toBeVisible();
      expect(emailButton).toBeEnabled();
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

      // Verify signInWithRedirect was called with Google provider
      await waitFor(() => {
        expect(amplifyAuth.signInWithRedirect).toHaveBeenCalledWith({
          provider: "Google",
        });
      });

      // Verify button is disabled during loading
      expect(googleButton).toBeDisabled();
    });
  });

  describe("GIVEN a user clicks the 'Sign in with Email' button", () => {
    it("WHEN the button is clicked THEN the system should show the OTP authentication page", async () => {
      const user = userEvent.setup();
      renderAuthPage();

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText(/completing sign in/i)
        ).not.toBeInTheDocument();
      });

      const emailButton = screen.getByRole("button", {
        name: /sign in with email/i,
      });

      // Click the Email button
      await user.click(emailButton);

      // Verify OTP page is shown
      await waitFor(() => {
        expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
      });
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
