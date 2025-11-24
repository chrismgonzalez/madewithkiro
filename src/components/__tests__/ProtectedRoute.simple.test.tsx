import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProtectedRoute } from "../ProtectedRoute";

// Mock the useAuth hook
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: "/protected", search: "" })),
}));

import { useAuth } from "@/contexts/AuthContext";

describe("ProtectedRoute - Simple Tests", () => {
  it("should render children when authenticated", () => {
    // Arrange
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: "123", email: "test@example.com" },
      isAuthenticated: true,
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithGitHub: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    // Act
    render(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected Content</div>
      </ProtectedRoute>
    );

    // Assert
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("should show loading spinner when checking auth", () => {
    // Arrange
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      signInWithGoogle: vi.fn(),
      signInWithGitHub: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    // Act
    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Assert
    expect(screen.getByText("Checking authentication...")).toBeInTheDocument();
  });

  it("should return null when not authenticated (redirecting)", () => {
    // Arrange
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      signInWithGoogle: vi.fn(),
      signInWithGitHub: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    // Act
    const { container } = render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Assert - Should not render protected content
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });
});
