import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import Navigation from "../Navigation";

describe("Navigation - Acceptance Tests", () => {
  describe("GIVEN I view the navigation", () => {
    it("WHEN the component renders THEN I should see logo, app name, and links to Gallery, Profile, Add App", () => {
      // Arrange & Act
      render(<Navigation />);

      // Assert - Should display app name
      expect(
        screen.getByText(/MadeWithKiro|Made With Kiro/i)
      ).toBeInTheDocument();

      // Assert - Should have link to Gallery
      const galleryLink = screen.getByRole("link", { name: /gallery/i });
      expect(galleryLink).toBeInTheDocument();
      expect(galleryLink).toHaveAttribute("href", "/");

      // Assert - Should have link to Profile
      const profileLink = screen.getByRole("link", { name: /profile/i });
      expect(profileLink).toBeInTheDocument();

      // Assert - Should have link to Add App
      const addAppLink = screen.getByRole("link", { name: /add app/i });
      expect(addAppLink).toBeInTheDocument();
      expect(addAppLink).toHaveAttribute("href", "/add-app");
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

  describe("GIVEN I am on mobile", () => {
    it("WHEN I view the navigation THEN I should see a hamburger menu button", () => {
      // Arrange & Act
      render(<Navigation />);

      // Assert - Should have hamburger menu button
      const menuButton = screen.getByRole("button", {
        name: /menu|navigation|open menu/i,
      });
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe("GIVEN I click the hamburger menu", () => {
    it("WHEN the menu opens THEN I should see all navigation links", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<Navigation />);

      // Act - Click hamburger menu
      const menuButton = screen.getByRole("button", {
        name: /menu|navigation|open menu/i,
      });
      await user.click(menuButton);

      // Assert - Should see all navigation links in the opened menu
      await waitFor(() => {
        const links = screen.getAllByRole("link", {
          name: /gallery|profile|add app/i,
        });
        expect(links.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe("GIVEN I am on a specific route", () => {
    it("WHEN I view the navigation THEN the active route should be highlighted", () => {
      // Arrange & Act
      // Note: This test assumes we're on the gallery route (/)
      render(<Navigation currentPath="/" />);

      // Assert - Gallery link should be highlighted/active
      const galleryLink = screen.getByRole("link", { name: /gallery/i });
      expect(galleryLink).toHaveClass(/active|current/i);

      // Or check for aria-current attribute
      expect(galleryLink).toHaveAttribute("aria-current", "page");
    });

    it("WHEN I am on the profile route THEN the profile link should be highlighted", () => {
      // Arrange & Act
      render(<Navigation currentPath="/profile/user123" />);

      // Assert - Profile link should be highlighted
      const profileLink = screen.getByRole("link", { name: /profile/i });
      expect(
        profileLink.classList.contains("active") ||
          profileLink.getAttribute("aria-current") === "page"
      ).toBe(true);
    });

    it("WHEN I am on the add app route THEN the add app link should be highlighted", () => {
      // Arrange & Act
      render(<Navigation currentPath="/add-app" />);

      // Assert - Add App link should be highlighted
      const addAppLink = screen.getByRole("link", { name: /add app/i });
      expect(
        addAppLink.classList.contains("active") ||
          addAppLink.getAttribute("aria-current") === "page"
      ).toBe(true);
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
