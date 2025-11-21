import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import ApplicationCard from "../ApplicationCard";
import { getAllApplications } from "@/services/mockData";

describe("ApplicationCard - Mobile Delete Responsiveness - Requirements 16.1, 16.2, 16.3, 16.4", () => {
  // Use mock data for testing
  const mockApps = getAllApplications(true);
  const myApp = mockApps.find((app) => app.userId === "user-001")!;

  describe("GIVEN I view my application card on a 320px viewport", () => {
    it("WHEN the card renders THEN the delete button should be at least 44x44px", () => {
      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Assert - Delete button should exist
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();

      // Assert - Button should have minimum touch target size classes
      // The button has min-h-[44px] min-w-[44px] classes for mobile-first design
      expect(deleteButton.className).toMatch(/min-h-\[44px\]/);
      expect(deleteButton.className).toMatch(/min-w-\[44px\]/);
    });
  });

  describe("GIVEN I tap the delete button on mobile", () => {
    it("WHEN the button is tapped THEN I should see appropriate touch feedback", async () => {
      const user = userEvent.setup();

      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Assert - Delete button should exist
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();

      // Act - Tap the delete button
      await user.click(deleteButton);

      // Assert - Dialog should open (this is the touch feedback)
      expect(
        screen.getByRole("alertdialog", { name: /delete application/i })
      ).toBeInTheDocument();

      // Assert - Button should have hover/active states via Tailwind classes
      // The button uses variant="destructive" which includes hover states
      expect(deleteButton.className).toContain("destructive");
    });
  });

  describe("GIVEN I view the delete confirmation dialog on mobile", () => {
    it("WHEN the dialog renders THEN all buttons should be at least 44x44px", async () => {
      const user = userEvent.setup();

      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Act - Click delete button to open dialog
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      // Assert - Dialog should be open
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();

      // Assert - Cancel button should have minimum touch target size
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton.className).toMatch(/min-h-\[44px\]/);

      // Assert - Confirm button should have minimum touch target size
      const confirmButton = screen.getByRole("button", { name: /^delete$/i });
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton.className).toMatch(/min-h-\[44px\]/);
    });

    it("WHEN the dialog renders THEN the application name and warning should be easily readable", async () => {
      const user = userEvent.setup();

      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Act - Click delete button to open dialog
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      // Assert - Dialog should be open
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();

      // Assert - Application name should be visible and emphasized (strong tag)
      const appNameInDialog = screen.getAllByText(myApp.name);
      expect(appNameInDialog.length).toBeGreaterThan(0);

      // Find the strong element containing the app name
      const strongElement = dialog.querySelector("strong");
      expect(strongElement).toBeInTheDocument();
      expect(strongElement?.textContent).toBe(myApp.name);

      // Assert - Warning text should be visible
      const warningText = screen.getByText(/this action cannot be undone/i);
      expect(warningText).toBeInTheDocument();

      // Assert - Warning text should have destructive styling for emphasis
      expect(warningText.className).toContain("text-destructive");

      // Assert - Dialog should have proper spacing for readability
      const dialogDescription = dialog.querySelector('[class*="space-y"]');
      expect(dialogDescription).toBeInTheDocument();
    });
  });

  describe("GIVEN I view the delete button on mobile", () => {
    it("WHEN the card renders THEN the button should have proper spacing from the edit button", () => {
      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Assert - Both edit and delete buttons should exist
      const editButton = screen.getByRole("link", { name: /edit/i });
      const deleteButton = screen.getByRole("button", { name: /delete/i });

      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();

      // Assert - Buttons should be in a flex container with gap
      const buttonContainer = editButton.parentElement;
      expect(buttonContainer).toBeInTheDocument();
      expect(buttonContainer?.className).toMatch(/gap-2/); // 8px gap (gap-2 = 0.5rem = 8px)
    });

    it("WHEN the card renders THEN the delete button should show icon only on mobile", () => {
      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Assert - Delete button should exist
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();

      // Assert - Button should have icon (Trash2 icon)
      const icon = deleteButton.querySelector("svg");
      expect(icon).toBeInTheDocument();

      // Assert - Text should be hidden on mobile (hidden sm:inline class)
      const textSpan = deleteButton.querySelector("span");
      if (textSpan) {
        expect(textSpan.className).toMatch(/hidden/);
        expect(textSpan.className).toMatch(/sm:inline/);
      }
    });
  });

  describe("GIVEN I view the delete confirmation dialog buttons on mobile", () => {
    it("WHEN the dialog renders THEN buttons should stack vertically on mobile", async () => {
      const user = userEvent.setup();

      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Act - Click delete button to open dialog
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      // Assert - Dialog should be open
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();

      // Assert - Footer should have flex-col class for mobile stacking
      // The DeleteConfirmDialog overrides with flex-col sm:flex-row gap-2
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      const footer = cancelButton.parentElement;
      expect(footer).toBeInTheDocument();

      // Assert - Footer should have flex-col for mobile
      expect(footer?.className).toMatch(/flex-col/);

      // Assert - Footer should also have sm:flex-row for desktop
      expect(footer?.className).toMatch(/sm:flex-row/);

      // Assert - Footer should have gap-2 for spacing
      expect(footer?.className).toMatch(/gap-2/);
    });

    it("WHEN the dialog renders THEN the confirm button should have destructive styling", async () => {
      const user = userEvent.setup();

      // Act - Render with authenticated user viewing their own app
      render(<ApplicationCard application={myApp} />, {
        mockAuthState: {
          isAuthenticated: true,
          currentUserId: "user-001",
        },
      });

      // Act - Click delete button to open dialog
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      // Assert - Confirm button should have destructive styling
      const confirmButton = screen.getByRole("button", { name: /^delete$/i });
      expect(confirmButton).toBeInTheDocument();

      // Assert - Button should have destructive color classes
      expect(confirmButton.className).toMatch(/bg-destructive/);
      expect(confirmButton.className).toMatch(/text-destructive-foreground/);
    });
  });
});
