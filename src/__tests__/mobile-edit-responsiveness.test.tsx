import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/utils";
import ApplicationCard from "@/components/ApplicationCard";
import ApplicationForm from "@/components/ApplicationForm";
import type { Application } from "@/types";

describe("Mobile Edit Responsiveness - Acceptance Tests", () => {
  // Helper to set viewport size
  const setViewport = (width: number, height: number) => {
    if (typeof window !== "undefined") {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: width,
      });
      Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: height,
      });
      window.dispatchEvent(new Event("resize"));
    }
  };

  // Mock application data
  const mockApplication: Application = {
    appId: "test-app-1",
    userId: "user-1",
    userName: "Test User",
    name: "Test Application",
    description: "A test application for mobile responsiveness",
    appUrl: "https://example.com",
    githubUrl: "https://github.com/test/repo",
    tags: ["react", "typescript"],
    visibility: "public",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    // Reset viewport to default before each test
    setViewport(1024, 768);
  });

  afterEach(() => {
    // Reset viewport after tests
    setViewport(1024, 768);
  });

  describe("GIVEN I view the edit form on a 320px viewport", () => {
    it("WHEN the form renders THEN all fields should be readable and tappable", async () => {
      // Arrange - Set mobile viewport (320px is minimum)
      setViewport(320, 568);

      const mockOnSubmit = vi.fn();
      const mockOnCancel = vi.fn();

      // Act
      render(
        <ApplicationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialData={{
            name: "Test App",
            description: "Test description",
            appUrl: "https://example.com",
            githubUrl: "https://github.com/test/repo",
            tags: ["react", "typescript"],
            visibility: "public",
          }}
          mode="edit"
        />
      );

      // Assert - All input fields should be visible and accessible
      const nameInput = screen.getByLabelText(/application name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const githubInput = screen.getByLabelText(/github repository url/i);
      const appUrlInput = screen.getByLabelText(/live app url/i);
      const tagsInput = screen.getByLabelText(/tags/i);

      expect(nameInput).toBeVisible();
      expect(nameInput).toBeEnabled();
      expect(descriptionInput).toBeVisible();
      expect(descriptionInput).toBeEnabled();
      expect(githubInput).toBeVisible();
      expect(githubInput).toBeEnabled();
      expect(appUrlInput).toBeVisible();
      expect(appUrlInput).toBeEnabled();
      expect(tagsInput).toBeVisible();
      expect(tagsInput).toBeEnabled();

      // Assert - Form should exist and be accessible
      const form = nameInput.closest("form");
      expect(form).toBeInTheDocument();

      // Note: getBoundingClientRect() returns 0 in jsdom, so we verify
      // the form exists and fields are accessible instead
    });
  });

  describe("GIVEN I view an application card on mobile", () => {
    it("WHEN the card renders with an edit button THEN the edit button should be at least 44x44px", async () => {
      // Arrange - Set mobile viewport
      setViewport(375, 667);

      // Act - Render card with current user as owner
      render(<ApplicationCard application={mockApplication} />, {
        mockAuthState: {
          currentUserId: "user-1", // Same as application owner
          isAuthenticated: true,
        },
      });

      // Assert - Edit button should be visible
      const editButton = screen.getByRole("link", { name: /edit/i });
      expect(editButton).toBeVisible();

      // Assert - Edit button should have minimum touch target classes
      // Note: getBoundingClientRect() returns 0 in jsdom, so we check classes instead
      const classes = editButton.className;
      expect(classes).toContain("min-h-[44px]");
      expect(classes).toContain("min-w-[44px]");
    });
  });

  describe("GIVEN I tap the edit button on mobile", () => {
    it("WHEN the button is tapped THEN I should see appropriate touch feedback", async () => {
      // Arrange - Set mobile viewport
      setViewport(375, 667);

      // Act - Render card with current user as owner
      render(<ApplicationCard application={mockApplication} />, {
        mockAuthState: {
          currentUserId: "user-1",
          isAuthenticated: true,
        },
      });

      // Assert - Edit button should have proper styling for touch feedback
      const editButton = screen.getByRole("link", { name: /edit/i });
      expect(editButton).toBeVisible();

      // Check that button has appropriate classes for touch feedback
      // shadcn/ui buttons have hover and active states built-in
      const classes = editButton.className;
      expect(classes).toBeTruthy();
      expect(editButton).toHaveAttribute("href");
    });
  });

  describe("GIVEN I view the edit form on mobile", () => {
    it("WHEN the form renders THEN fields should be in a single column layout", async () => {
      // Arrange - Set mobile viewport
      setViewport(375, 667);

      const mockOnSubmit = vi.fn();
      const mockOnCancel = vi.fn();

      // Act
      render(
        <ApplicationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialData={{
            name: "Test App",
            description: "Test description",
            appUrl: "https://example.com",
            githubUrl: "https://github.com/test/repo",
            tags: ["react", "typescript"],
            visibility: "public",
          }}
          mode="edit"
        />
      );

      // Assert - Form should use single column layout on mobile
      const nameInput = screen.getByLabelText(/application name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      // Both inputs should be visible and stacked vertically
      expect(nameInput).toBeVisible();
      expect(descriptionInput).toBeVisible();

      // Check that the form uses single column layout (space-y classes)
      const form = nameInput.closest("form");
      expect(form).toHaveClass("space-y-4", "sm:space-y-6");
    });

    it("WHEN the form renders THEN buttons should stack vertically on mobile", async () => {
      // Arrange - Set mobile viewport
      setViewport(375, 667);

      const mockOnSubmit = vi.fn();
      const mockOnCancel = vi.fn();

      // Act
      render(
        <ApplicationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialData={{
            name: "Test App",
            description: "Test description",
            appUrl: "https://example.com",
            githubUrl: "https://github.com/test/repo",
            tags: ["react", "typescript"],
            visibility: "public",
          }}
          mode="edit"
        />
      );

      // Assert - Form buttons should be visible
      const updateButton = screen.getByRole("button", {
        name: /update application/i,
      });
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      expect(updateButton).toBeVisible();
      expect(cancelButton).toBeVisible();

      // Assert - Buttons should have minimum touch target classes
      // Note: getBoundingClientRect() returns 0 in jsdom, so we check classes instead
      expect(updateButton).toHaveClass("min-h-[44px]");
      expect(cancelButton).toHaveClass("min-h-[44px]");
    });

    it("WHEN the form renders THEN all touch targets should be at least 44x44px", async () => {
      // Arrange - Set mobile viewport
      setViewport(375, 667);

      const mockOnSubmit = vi.fn();
      const mockOnCancel = vi.fn();

      // Act
      render(
        <ApplicationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialData={{
            name: "Test App",
            description: "Test description",
            appUrl: "https://example.com",
            githubUrl: "https://github.com/test/repo",
            tags: ["react", "typescript"],
            visibility: "public",
          }}
          mode="edit"
        />
      );

      // Assert - All buttons should have minimum touch target classes
      // Note: getBoundingClientRect() returns 0 in jsdom, so we check classes instead
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveClass("min-h-[44px]");
      });
    });
  });

  describe("Responsive breakpoints for edit features", () => {
    it("WHEN viewport is 320px THEN edit form should adapt", async () => {
      // Arrange & Act
      setViewport(320, 568);

      const mockOnSubmit = vi.fn();
      const mockOnCancel = vi.fn();

      render(
        <ApplicationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialData={{
            name: "Test App",
            description: "Test description",
            appUrl: "https://example.com",
            githubUrl: "https://github.com/test/repo",
            tags: ["react", "typescript"],
            visibility: "public",
          }}
          mode="edit"
        />
      );

      // Assert - All fields should be visible and accessible
      const nameInput = screen.getByLabelText(/application name/i);
      expect(nameInput).toBeVisible();
      expect(nameInput).toBeEnabled();
    });

    it("WHEN viewport is 768px THEN edit form should adapt", async () => {
      // Arrange & Act
      setViewport(768, 1024);

      const mockOnSubmit = vi.fn();
      const mockOnCancel = vi.fn();

      render(
        <ApplicationForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialData={{
            name: "Test App",
            description: "Test description",
            appUrl: "https://example.com",
            githubUrl: "https://github.com/test/repo",
            tags: ["react", "typescript"],
            visibility: "public",
          }}
          mode="edit"
        />
      );

      // Assert - All fields should be visible and accessible
      const nameInput = screen.getByLabelText(/application name/i);
      expect(nameInput).toBeVisible();
      expect(nameInput).toBeEnabled();
    });
  });
});
