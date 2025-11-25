import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProtectedRoute } from "../ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { Auth } from "aws-amplify";
import { ReactNode } from "react";

// Mock AWS Amplify
vi.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: vi.fn(),
    userAttributes: vi.fn(),
  },
  Hub: {
    listen: vi.fn(() => vi.fn()),
  },
}));

// Mock @tanstack/react-router
const mockNavigate = vi.fn();
const mockLocation = { pathname: "/protected", search: "?tab=settings&id=123" };

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Protected content component
const ProtectedContent = () => {
  return <div data-testid="protected-content">Protected Content</div>;
};

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

describe("ProtectedRoute - Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe("GIVEN an authenticated user accesses a protected route", () => {
    it("WHEN the route loads THEN the system should render the protected content", async () => {
      // Arrange - Mock authenticated user
      const mockUser = {
        username: "test_user",
        attributes: {
          sub: "test_123",
          email: "test@example.com",
        },
      };

      const mockAttributes = [
        { Name: "sub", Value: "test_123" },
        { Name: "email", Value: "test@example.com" },
      ];

      vi.mocked(Auth.currentAuthenticatedUser).mockResolvedValue(mockUser);
      vi.mocked(Auth.userAttributes).mockResolvedValue(mockAttributes);

      // Act - Render protected route with authenticated user
      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Assert - Protected content should be rendered
      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("GIVEN an unauthenticated user accesses a protected route", () => {
    beforeEach(() => {
      mockLocation.pathname = "/protected";
      mockLocation.search = "";
    });

    it("WHEN the route loads THEN the system should store the intended destination URL in sessionStorage", async () => {
      // Arrange - Mock unauthenticated user
      vi.mocked(Auth.currentAuthenticatedUser).mockRejectedValue(
        new Error("No current user")
      );

      // Act - Render protected route with unauthenticated user
      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Wait for auth check to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // Assert - Intended destination should be stored in sessionStorage
      const storedPath = sessionStorage.getItem("redirect_after_auth");
      expect(storedPath).toBe("/protected");
    });

    it("WHEN the route loads THEN the system should redirect to the /auth page", async () => {
      // Arrange - Mock unauthenticated user
      vi.mocked(Auth.currentAuthenticatedUser).mockRejectedValue(
        new Error("No current user")
      );

      // Act - Render protected route with unauthenticated user
      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Assert - Should redirect to /auth page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/auth" });
      });
    });
  });

  describe("GIVEN the authentication status is being checked", () => {
    it("WHEN the check is in progress THEN the system should display a loading spinner", async () => {
      // Arrange - Mock slow authentication check
      vi.mocked(Auth.currentAuthenticatedUser).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                username: "test_user",
                attributes: {
                  sub: "test_123",
                  email: "test@example.com",
                },
              });
            }, 100);
          })
      );

      vi.mocked(Auth.userAttributes).mockResolvedValue([
        { Name: "sub", Value: "test_123" },
        { Name: "email", Value: "test@example.com" },
      ]);

      // Act - Render protected route
      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Assert - Loading spinner should be displayed initially
      // The LoadingSpinner component uses Loader2 icon with animate-spin class
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();

      // Wait for authentication to complete
      await waitFor(
        () => {
          expect(screen.getByTestId("protected-content")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe("GIVEN multiple protected routes", () => {
    it("WHEN an unauthenticated user accesses different protected routes THEN each should store its own destination", async () => {
      // Arrange - Mock unauthenticated user
      vi.mocked(Auth.currentAuthenticatedUser).mockRejectedValue(
        new Error("No current user")
      );

      // Act - Access first protected route
      mockLocation.pathname = "/profile";
      const { unmount } = render(
        <TestWrapper>
          <ProtectedRoute>
            <div>Profile Page</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      expect(sessionStorage.getItem("redirect_after_auth")).toBe("/profile");

      unmount();
      sessionStorage.clear();
      mockNavigate.mockClear();

      // Act - Access second protected route
      mockLocation.pathname = "/add-app";
      render(
        <TestWrapper>
          <ProtectedRoute>
            <div>Add App Page</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // Assert - Second route's destination should be stored
      expect(sessionStorage.getItem("redirect_after_auth")).toBe("/add-app");
    });
  });

  describe("GIVEN a protected route with query parameters", () => {
    it("WHEN an unauthenticated user accesses it THEN the full path with query params should be stored", async () => {
      // Arrange - Mock unauthenticated user
      vi.mocked(Auth.currentAuthenticatedUser).mockRejectedValue(
        new Error("No current user")
      );

      // Set location with query params
      mockLocation.pathname = "/protected";
      mockLocation.search = "?tab=settings&id=123";

      // Act - Render protected route with query parameters
      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Assert - Full path with query params should be stored
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      const storedPath = sessionStorage.getItem("redirect_after_auth");
      expect(storedPath).toBe("/protected?tab=settings&id=123");
    });
  });
});
