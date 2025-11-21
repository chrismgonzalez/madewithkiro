import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import Navigation from "../Navigation";

describe("Navigation - Acceptance Tests", () => {
  describe("GIVEN I view the navigation", () => {
    it("WHEN the component renders THEN I should see logo and app name", () => {
      // Arrange & Act
      render(<Navigation />);

      // Assert - Should display app name
      expect(
        screen.getByText(/MadeWithKiro|Made With Kiro/i)
      ).toBeInTheDocument();

      // Assert - Logo should link to home
      const logoLink = screen.getByRole("link", {
        name: /madewithkiro|made with kiro/i,
      });
      expect(logoLink).toHaveAttribute("href", "/");
    });

    it("WHEN the component renders THEN I should see a mock authentication toggle button showing current state", () => {
      // Arrange & Act
      render(<Navigation />);

      // Assert - Should have authentication toggle buttons (desktop and mobile)
      const authToggles = screen.getAllByRole("button", {
        name: /sign in|sign out|login|logout/i,
      });
      expect(authToggles.length).toBeGreaterThanOrEqual(1);

      // Assert - Should show current authentication state
      // Initially unauthenticated, so should show "Sign In" or similar
      const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
      expect(signInButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GIVEN I am unauthenticated", () => {
    it("WHEN I view the navigation THEN I should see sign in button and theme toggle", () => {
      // Arrange & Act
      render(<Navigation />);

      // Assert - Should see sign in button
      const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
      expect(signInButtons.length).toBeGreaterThanOrEqual(1);

      // Assert - Should see theme toggle
      const themeToggle = screen.getAllByRole("button", {
        name: /toggle theme/i,
      });
      expect(themeToggle.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GIVEN I am authenticated", () => {
    it("WHEN I view the navigation THEN I should see the add app button and user avatar", () => {
      // Arrange & Act
      render(<Navigation />, {
        mockAuthState: { isAuthenticated: true, currentUserId: "user-001" },
      });

      // Assert - Should see add app link
      const addAppLink = screen.getByRole("link", { name: /add new app/i });
      expect(addAppLink).toBeInTheDocument();
      expect(addAppLink).toHaveAttribute("href", "/add-app");

      // Assert - Should see user avatar button
      const avatarButton = screen.getByRole("button", { name: /user menu/i });
      expect(avatarButton).toBeInTheDocument();
    });
  });

  describe("Authentication toggle functionality", () => {
    it("WHEN I click the auth toggle THEN the authentication state should change", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Navigation />);

      // Act - Get initial state (should be "Sign In")
      const initialButtons = screen.getAllByRole("button", {
        name: /sign in/i,
      });
      expect(initialButtons.length).toBeGreaterThanOrEqual(1);

      // Act - Click to toggle authentication (click the first one)
      await user.click(initialButtons[0]);

      // Assert - Should now show "Sign Out" or similar
      await waitFor(() => {
        const signOutButtons = screen.getAllByRole("button", {
          name: /sign out/i,
        });
        expect(signOutButtons.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Touch target accessibility", () => {
    it("WHEN I view interactive elements THEN they should be at least 44x44px", () => {
      // Arrange & Act
      render(<Navigation />);

      // Assert - All buttons should have min-h-[44px] and min-w-[44px] classes
      // This is verified by the component implementation using Tailwind classes
      const authButtons = screen.getAllByRole("button", {
        name: /sign in|sign out/i,
      });
      expect(authButtons.length).toBeGreaterThanOrEqual(1);

      const menuButton = screen.getByRole("button", {
        name: /menu|navigation|open menu/i,
      });
      expect(menuButton).toBeInTheDocument();

      // The component uses min-h-[44px] and min-w-[44px] classes
      // which ensures 44x44px minimum touch targets
      // Verify by checking the className contains the min-h and min-w classes
      authButtons.forEach((button) => {
        expect(button.className).toMatch(/min-h-\[44px\]/);
        expect(button.className).toMatch(/min-w-\[44px\]/);
      });
    });
  });
});
