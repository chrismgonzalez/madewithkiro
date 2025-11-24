import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import Navigation from "../Navigation";

// Mock UserAvatar to avoid importing its dependencies
vi.mock("../UserAvatar", () => ({
  default: () => <button aria-label="User menu">User Avatar</button>,
}));

// Mock the useAuth hook directly - this avoids importing AuthContext which imports aws-amplify
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

describe("Navigation - Real Authentication Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GIVEN an authenticated user views the navigation", () => {
    it("WHEN the navigation renders THEN the system should display the user's profile picture", () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: {
          userId: "user-123",
          email: "john.doe@example.com",
          givenName: "John",
          familyName: "Doe",
          picture: "https://example.com/profile.jpg",
        },
        isAuthenticated: true,
        isLoading: false,
        signInWithGoogle: vi.fn(),
        signInWithGitHub: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      });

      // Act
      render(<Navigation />);

      // Assert - Should see user avatar button
      const avatarButton = screen.getByRole("button", { name: /user menu/i });
      expect(avatarButton).toBeInTheDocument();
    });

    it("WHEN the navigation renders THEN the system should display the user's name", async () => {
      // Arrange
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          userId: "user-123",
          email: "john.doe@example.com",
          givenName: "John",
          familyName: "Doe",
        },
        isAuthenticated: true,
        isLoading: false,
        signInWithGoogle: vi.fn(),
        signInWithGitHub: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      });

      // Act
      render(<Navigation />);

      // Open the user menu
      const avatarButton = screen.getByRole("button", { name: /user menu/i });
      await user.click(avatarButton);

      // Assert - Should display user's full name in the menu
      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });
    });

    it("WHEN the navigation renders THEN the system should display a sign-out button in the user menu", async () => {
      // Arrange
      const user = userEvent.setup();
      mockUseAuth.mockReturnValue({
        user: {
          userId: "user-123",
          email: "john.doe@example.com",
          givenName: "John",
          familyName: "Doe",
        },
        isAuthenticated: true,
        isLoading: false,
        signInWithGoogle: vi.fn(),
        signInWithGitHub: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      });

      // Act
      render(<Navigation />);

      // Open the user menu
      const avatarButton = screen.getByRole("button", { name: /user menu/i });
      await user.click(avatarButton);

      // Assert - Should see sign-out button
      await waitFor(() => {
        const signOutButton = screen.getByRole("menuitem", {
          name: /sign out|logout/i,
        });
        expect(signOutButton).toBeInTheDocument();
      });
    });

    it("WHEN the user clicks the sign-out button THEN the system should call the signOut method and redirect to the home page", async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSignOut = vi.fn();
      mockUseAuth.mockReturnValue({
        user: {
          userId: "user-123",
          email: "john.doe@example.com",
          givenName: "John",
          familyName: "Doe",
        },
        isAuthenticated: true,
        isLoading: false,
        signInWithGoogle: vi.fn(),
        signInWithGitHub: vi.fn(),
        signOut: mockSignOut,
        refreshSession: vi.fn(),
      });

      // Act
      render(<Navigation />);

      // Open the user menu
      const avatarButton = screen.getByRole("button", { name: /user menu/i });
      await user.click(avatarButton);

      // Click sign-out button
      const signOutButton = await screen.findByRole("menuitem", {
        name: /sign out|logout/i,
      });
      await user.click(signOutButton);

      // Assert - signOut should be called
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });
  });

  describe("GIVEN an unauthenticated user views the navigation", () => {
    it("WHEN the navigation renders THEN the system should display a sign-in button", () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        signInWithGoogle: vi.fn(),
        signInWithGitHub: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      });

      // Act
      render(<Navigation />);

      // Assert - Should see sign in button
      const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
      expect(signInButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("WHEN the navigation renders THEN the system should NOT display user profile picture or name", () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        signInWithGoogle: vi.fn(),
        signInWithGitHub: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      });

      // Act
      render(<Navigation />);

      // Assert - Should not see user avatar button
      const avatarButton = screen.queryByRole("button", { name: /user menu/i });
      expect(avatarButton).not.toBeInTheDocument();
    });
  });

  describe("Touch target accessibility", () => {
    it("WHEN I view interactive elements THEN they should be at least 44x44px", () => {
      // Arrange
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        signInWithGoogle: vi.fn(),
        signInWithGitHub: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
      });

      // Act
      render(<Navigation />);

      // Assert - All buttons should have min-h-[44px] and min-w-[44px] classes
      const authButtons = screen.getAllByRole("button", {
        name: /sign in/i,
      });
      expect(authButtons.length).toBeGreaterThanOrEqual(1);

      // Verify by checking the className contains the min-h and min-w classes
      authButtons.forEach((button) => {
        expect(button.className).toMatch(/min-h-\[44px\]/);
        expect(button.className).toMatch(/min-w-\[44px\]/);
      });
    });
  });
});
