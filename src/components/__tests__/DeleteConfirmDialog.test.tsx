import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/utils";
import userEvent from "@testing-library/user-event";
import DeleteConfirmDialog from "../DeleteConfirmDialog";

describe("DeleteConfirmDialog - Acceptance Tests", () => {
  const mockApplicationName = "My Awesome App";
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GIVEN the delete confirmation dialog is open", () => {
    it("WHEN the dialog renders THEN I should see the application name in the message", () => {
      // Arrange & Act
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={mockApplicationName}
          isDeleting={false}
        />
      );

      // Assert - Should display application name in the dialog
      expect(screen.getByText(mockApplicationName)).toBeInTheDocument();
    });

    it("WHEN the dialog renders THEN I should see a warning about permanent deletion", () => {
      // Arrange & Act
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={mockApplicationName}
          isDeleting={false}
        />
      );

      // Assert - Should display warning text about permanent deletion
      expect(
        screen.getByText(/this action cannot be undone/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/permanently removed/i)).toBeInTheDocument();
    });
  });

  describe("GIVEN I click cancel in the confirmation dialog", () => {
    it("WHEN the button is clicked THEN the dialog should close without deleting", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={mockApplicationName}
          isDeleting={false}
        />
      );

      // Act - Click cancel button
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Assert - onClose should be called
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      // Assert - onConfirm should NOT be called
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN I click confirm in the confirmation dialog", () => {
    it("WHEN the button is clicked THEN the onConfirm callback should be called", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={mockApplicationName}
          isDeleting={false}
        />
      );

      // Act - Click confirm/delete button
      const confirmButton = screen.getByRole("button", { name: /delete/i });
      await user.click(confirmButton);

      // Assert - onConfirm should be called
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("GIVEN deletion is in progress", () => {
    it("WHEN the dialog renders THEN the confirm button should be disabled and show loading state", () => {
      // Arrange & Act
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={mockApplicationName}
          isDeleting={true}
        />
      );

      // Assert - Confirm button should be disabled
      const confirmButton = screen.getByRole("button", { name: /deleting/i });
      expect(confirmButton).toBeDisabled();

      // Assert - Should show "Deleting..." text
      expect(screen.getByText(/deleting/i)).toBeInTheDocument();
    });
  });

  describe("Dialog visibility", () => {
    it("WHEN isOpen is false THEN the dialog should not be visible", () => {
      // Arrange & Act
      render(
        <DeleteConfirmDialog
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={mockApplicationName}
          isDeleting={false}
        />
      );

      // Assert - Dialog should not be visible
      expect(screen.queryByText(/delete application/i)).not.toBeInTheDocument();
    });
  });

  describe("Mobile-friendly touch targets - Requirements 16.2, 16.3", () => {
    it("WHEN the dialog renders THEN all buttons should be at least 44x44px", () => {
      // Arrange & Act
      const { container } = render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          applicationName={mockApplicationName}
          isDeleting={false}
        />
      );

      // Assert - Check that buttons have minimum height class
      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        const classes = button.className;
        // Should have min-h-[44px] class or equivalent
        expect(
          classes.includes("min-h-[44px]") || classes.includes("min-h-11")
        ).toBe(true);
      });
    });
  });
});
