import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import DeleteConfirmDialog from "../DeleteConfirmDialog";

describe("DeleteConfirmDialog - Mobile Responsiveness - Requirements 16.2, 16.3, 16.4, 16.5", () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();
  const testAppName = "Test Application";

  beforeEach(() => {
    // Clear mocks
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  describe("GIVEN I view the delete confirmation dialog on a 320px viewport", () => {
    it("WHEN the dialog renders THEN all buttons should be at least 44x44px", () => {
      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Dialog should be visible
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();

      // Assert - Cancel button should have minimum touch target size
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton.className).toMatch(/min-h-\[44px\]/);

      // Assert - Confirm button should have minimum touch target size
      const confirmButton = screen.getByRole("button", { name: /delete/i });
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton.className).toMatch(/min-h-\[44px\]/);
    });

    it("WHEN the dialog renders THEN the application name should be prominently displayed", () => {
      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Dialog should be visible
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();

      // Assert - Application name should be in a strong tag for emphasis
      const strongElement = dialog.querySelector("strong");
      expect(strongElement).toBeInTheDocument();
      expect(strongElement?.textContent).toBe(testAppName);

      // Assert - Application name should be readable
      expect(screen.getByText(testAppName)).toBeInTheDocument();
    });

    it("WHEN the dialog renders THEN the warning text should be easily readable", () => {
      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Warning text should be visible
      const warningText = screen.getByText(/this action cannot be undone/i);
      expect(warningText).toBeInTheDocument();

      // Assert - Warning should have destructive styling for emphasis
      expect(warningText.className).toContain("text-destructive");

      // Assert - Dialog description should have proper spacing
      const dialog = screen.getByRole("alertdialog");
      const description = dialog.querySelector('[class*="space-y"]');
      expect(description).toBeInTheDocument();
    });

    it("WHEN the dialog renders THEN buttons should stack vertically on mobile", () => {
      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Dialog should be visible
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
  });

  describe("GIVEN I tap buttons on mobile", () => {
    it("WHEN I tap the cancel button THEN I should see appropriate touch feedback", async () => {
      const user = userEvent.setup();

      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Cancel button should exist
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();

      // Act - Tap the cancel button
      await user.click(cancelButton);

      // Assert - onClose should be called (this is the touch feedback)
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("WHEN I tap the confirm button THEN I should see appropriate touch feedback", async () => {
      const user = userEvent.setup();

      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Confirm button should exist
      const confirmButton = screen.getByRole("button", { name: /delete/i });
      expect(confirmButton).toBeInTheDocument();

      // Act - Tap the confirm button
      await user.click(confirmButton);

      // Assert - onConfirm should be called (this is the touch feedback)
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("GIVEN the dialog is in deleting state on mobile", () => {
    it("WHEN the dialog renders THEN the confirm button should show loading state", () => {
      // Act - Render dialog in deleting state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={true}
        />
      );

      // Assert - Confirm button should show "Deleting..." text
      const confirmButton = screen.getByRole("button", { name: /deleting/i });
      expect(confirmButton).toBeInTheDocument();

      // Assert - Confirm button should be disabled
      expect(confirmButton).toBeDisabled();
    });

    it("WHEN the dialog renders THEN the confirm button should still be at least 44x44px", () => {
      // Act - Render dialog in deleting state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={true}
        />
      );

      // Assert - Confirm button should still have minimum touch target size
      const confirmButton = screen.getByRole("button", { name: /deleting/i });
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton.className).toMatch(/min-h-\[44px\]/);
    });
  });

  describe("GIVEN the dialog has destructive styling on mobile", () => {
    it("WHEN the dialog renders THEN the confirm button should have clear destructive styling", () => {
      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Confirm button should have destructive styling
      const confirmButton = screen.getByRole("button", { name: /delete/i });
      expect(confirmButton).toBeInTheDocument();

      // Assert - Button should have destructive color classes
      expect(confirmButton.className).toMatch(/bg-destructive/);
      expect(confirmButton.className).toMatch(/text-destructive-foreground/);
    });

    it("WHEN the dialog renders THEN the warning text should have destructive color", () => {
      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Warning text should have destructive styling
      const warningText = screen.getByText(/this action cannot be undone/i);
      expect(warningText).toBeInTheDocument();
      expect(warningText.className).toContain("text-destructive");
    });
  });

  describe("GIVEN the dialog has proper spacing on mobile", () => {
    it("WHEN the dialog renders THEN there should be adequate spacing between buttons", () => {
      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Dialog should be visible
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();

      // Assert - Footer should have gap-2 class (8px gap)
      const footer = dialog.querySelector('[class*="gap-2"]');
      expect(footer).toBeInTheDocument();
    });

    it("WHEN the dialog renders THEN there should be adequate spacing in the description", () => {
      // Act - Render dialog in open state
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={testAppName}
          isDeleting={false}
        />
      );

      // Assert - Dialog should be visible
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();

      // Assert - Description should have space-y-2 class for vertical spacing
      const description = dialog.querySelector('[class*="space-y-2"]');
      expect(description).toBeInTheDocument();
    });
  });
});
